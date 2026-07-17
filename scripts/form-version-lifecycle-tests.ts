/**
 * Focused PostgreSQL integration test for the form version lifecycle.
 *
 * Run only against a migrated development/test database:
 *   npm run test:form-versioning
 *
 * Creates uniquely named temporary records and removes them in finally.
 */

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  DuplicatePolicy,
  FormFieldSemantic,
  FormFieldType,
  FormPurpose,
  FormTemplateCategory,
  FormTemplateScope,
  FormVersionStatus,
} from "../generated/prisma/enums";
import { loadPublicFormBySlug } from "../lib/forms/load-public-form";
import { publishFormDraft } from "../lib/forms/publish-form-version";
import { prisma } from "../lib/prisma";

if (process.env.NODE_ENV !== "test") {
  console.error(
    "Refusing to run form version lifecycle tests unless NODE_ENV=test.",
  );
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Configure a migrated development/test database.",
  );
  process.exit(1);
}

async function main() {
  const organization = await prisma.organization.findFirst({
    where: { slug: "setareganplus", deletedAt: null },
    select: { id: true },
  });
  assert(organization, "Organization setareganplus not found; run db:seed first.");

  const suffix = randomBytes(5).toString("hex");
  let formId: string | null = null;
  let mediaId: string | null = null;
  let templateId: string | null = null;

  const initialSettings = {
    showRemainingCapacity: true,
    confirmationSmsEnabled: true,
    booking: {
      enabled: true,
      serviceId: `test-service-${suffix}`,
      requireTiming: "after_submit",
      allowWaitingList: false,
      allowAdvisorSelection: true,
      allowBranchSelection: true,
      showRemainingCapacity: false,
    },
    customPreservedSetting: { source: "versioning-test" },
  };
  const choiceConfig = {
    options: [
      { value: "yes", label: "بله" },
      { value: "no", label: "خیر" },
    ],
  };
  const visibilityConditions = {
    sourceFieldKey: "interest",
    operator: "equals",
    value: "yes",
  };
  const opensAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const registrationDeadline = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  );

  try {
    const template = await prisma.formTemplate.create({
      data: {
        scope: FormTemplateScope.ORGANIZATION,
        organizationId: organization.id,
        category: FormTemplateCategory.SURVEY,
        name: `Version lifecycle template ${suffix}`,
        purpose: FormPurpose.SURVEY,
      },
      select: { id: true },
    });
    templateId = template.id;

    const media = await prisma.mediaAsset.create({
      data: {
        organizationId: organization.id,
        storageKey: `integration-tests/forms/${suffix}.png`,
        originalName: `${suffix}.png`,
        mimeType: "image/png",
        byteSize: 1,
        checksum: suffix,
        altText: "پوستر آزمون نسخه‌بندی",
      },
      select: { id: true },
    });
    mediaId = media.id;

    const form = await prisma.form.create({
      data: {
        organizationId: organization.id,
        slug: `version-lifecycle-${suffix}`,
        purpose: FormPurpose.SURVEY,
      },
      select: { id: true },
    });
    formId = form.id;

    const versionOne = await prisma.formVersion.create({
      data: {
        organizationId: organization.id,
        formId: form.id,
        versionNumber: 1,
        status: FormVersionStatus.DRAFT,
        title: "نسخه اول",
        description: "توضیحات نسخه اول",
        opensAt,
        registrationDeadline,
        capacity: 25,
        confirmationMessage: "پاسخ شما ثبت شد.",
        duplicatePolicy: DuplicatePolicy.BLOCK,
        createLeadOnSubmit: true,
        leadSource: "FORM_VERSION_TEST",
        showBranchPicker: true,
        settings: initialSettings,
        sourceTemplateId: template.id,
        posterMediaId: media.id,
        createdByUserId: `integration-test-${suffix}`,
      },
      select: { id: true },
    });

    await prisma.formField.createMany({
      data: [
        {
          organizationId: organization.id,
          formVersionId: versionOne.id,
          fieldKey: "interest",
          sortOrder: 1,
          type: FormFieldType.SINGLE_CHOICE,
          semantic: FormFieldSemantic.CUSTOM,
          label: "علاقه‌مند هستید؟",
          required: true,
          config: choiceConfig,
        },
        {
          organizationId: organization.id,
          formVersionId: versionOne.id,
          fieldKey: "details",
          sortOrder: 2,
          type: FormFieldType.LONG_TEXT,
          semantic: FormFieldSemantic.NONE,
          label: "توضیحات",
          helpText: "جزئیات را وارد کنید.",
          placeholder: "توضیحات شما",
          required: false,
          config: {},
          visibilityConditions,
        },
      ],
    });

    console.log("1) Initial publish creates an identical editable draft");
    const firstPublish = await publishFormDraft({
      organizationId: organization.id,
      formId: form.id,
      expectedDraftVersionId: versionOne.id,
      actorUserId: `integration-test-${suffix}`,
    });
    assert(firstPublish.ok, JSON.stringify(firstPublish));
    assert.equal(firstPublish.publishedVersionId, versionOne.id);
    assert.equal(firstPublish.freshDraftVersionNumber, 2);

    const afterFirstPublish = await prisma.form.findUniqueOrThrow({
      where: { id: form.id },
      include: {
        versions: {
          orderBy: { versionNumber: "asc" },
          include: { fields: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    assert.equal(afterFirstPublish.publishedVersionId, versionOne.id);
    assert.equal(afterFirstPublish.versions.length, 2);

    const publishedOne = afterFirstPublish.versions[0];
    const draftTwo = afterFirstPublish.versions[1];
    assert.equal(publishedOne.status, FormVersionStatus.PUBLISHED);
    assert.equal(draftTwo.status, FormVersionStatus.DRAFT);
    assert.equal(draftTwo.versionNumber, 2);
    assert.equal(draftTwo.title, publishedOne.title);
    assert.equal(draftTwo.description, publishedOne.description);
    assert.equal(draftTwo.opensAt?.getTime(), publishedOne.opensAt?.getTime());
    assert.equal(
      draftTwo.registrationDeadline?.getTime(),
      publishedOne.registrationDeadline?.getTime(),
    );
    assert.equal(draftTwo.capacity, publishedOne.capacity);
    assert.equal(
      draftTwo.confirmationMessage,
      publishedOne.confirmationMessage,
    );
    assert.equal(draftTwo.duplicatePolicy, publishedOne.duplicatePolicy);
    assert.equal(draftTwo.createLeadOnSubmit, publishedOne.createLeadOnSubmit);
    assert.equal(draftTwo.leadSource, publishedOne.leadSource);
    assert.equal(draftTwo.showBranchPicker, publishedOne.showBranchPicker);
    assert.equal(draftTwo.posterMediaId, publishedOne.posterMediaId);
    assert.equal(draftTwo.sourceTemplateId, publishedOne.sourceTemplateId);
    assert.deepEqual(draftTwo.settings, publishedOne.settings);
    assert.equal(draftTwo.fields.length, publishedOne.fields.length);
    assert.notEqual(draftTwo.fields[0].id, publishedOne.fields[0].id);
    assert.equal(draftTwo.fields[0].semantic, publishedOne.fields[0].semantic);
    assert.deepEqual(draftTwo.fields[0].config, publishedOne.fields[0].config);
    assert.equal(draftTwo.fields[1].helpText, publishedOne.fields[1].helpText);
    assert.equal(
      draftTwo.fields[1].placeholder,
      publishedOne.fields[1].placeholder,
    );
    assert.deepEqual(
      draftTwo.fields[1].visibilityConditions,
      publishedOne.fields[1].visibilityConditions,
    );
    const stalePublish = await publishFormDraft({
      organizationId: organization.id,
      formId: form.id,
      expectedDraftVersionId: versionOne.id,
      actorUserId: `integration-test-${suffix}`,
    });
    assert.equal(stalePublish.ok, false);
    assert.equal(
      stalePublish.ok ? null : stalePublish.reason,
      "draft_not_found",
    );
    const publicAfterFirstPublish = await loadPublicFormBySlug(
      afterFirstPublish.slug,
    );
    assert(publicAfterFirstPublish.ok, JSON.stringify(publicAfterFirstPublish));
    assert.equal(publicAfterFirstPublish.data.version.id, versionOne.id);
    assert.equal(publicAfterFirstPublish.data.version.title, "نسخه اول");
    console.log("   OK");

    console.log("2) Editing the fresh draft does not mutate the public version");
    const changedSettings = {
      ...initialSettings,
      confirmationSmsEnabled: false,
      booking: {
        ...initialSettings.booking,
        requireTiming: "before_submit",
      },
    };
    await prisma.$transaction([
      prisma.formVersion.update({
        where: { id: draftTwo.id },
        data: {
          title: "نسخه دوم",
          description: "تغییرات نسخه دوم",
          duplicatePolicy: DuplicatePolicy.ALLOW_SILENT,
          createLeadOnSubmit: false,
          showBranchPicker: false,
          settings: changedSettings,
        },
      }),
      prisma.formField.update({
        where: { id: draftTwo.fields[1].id },
        data: { label: "توضیحات تکمیلی نسخه دوم" },
      }),
    ]);

    const publicVersionBeforeRepublish =
      await prisma.formVersion.findUniqueOrThrow({
        where: { id: versionOne.id },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      });
    assert.equal(publicVersionBeforeRepublish.title, "نسخه اول");
    assert.equal(publicVersionBeforeRepublish.fields[1].label, "توضیحات");
    const publicWhileDraftChanged = await loadPublicFormBySlug(
      afterFirstPublish.slug,
    );
    assert(publicWhileDraftChanged.ok, JSON.stringify(publicWhileDraftChanged));
    assert.equal(publicWhileDraftChanged.data.version.id, versionOne.id);
    assert.equal(publicWhileDraftChanged.data.version.title, "نسخه اول");
    console.log("   OK");

    console.log("3) Republish supersedes v1 and creates draft v3 from v2");
    const secondPublish = await publishFormDraft({
      organizationId: organization.id,
      formId: form.id,
      expectedDraftVersionId: draftTwo.id,
      actorUserId: `integration-test-${suffix}`,
    });
    assert(secondPublish.ok, JSON.stringify(secondPublish));
    assert.equal(secondPublish.publishedVersionId, draftTwo.id);
    assert.equal(secondPublish.freshDraftVersionNumber, 3);

    const afterSecondPublish = await prisma.form.findUniqueOrThrow({
      where: { id: form.id },
      include: {
        versions: {
          orderBy: { versionNumber: "asc" },
          include: { fields: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    assert.equal(afterSecondPublish.publishedVersionId, draftTwo.id);
    assert.equal(afterSecondPublish.versions.length, 3);

    const supersededOne = afterSecondPublish.versions[0];
    const publishedTwo = afterSecondPublish.versions[1];
    const draftThree = afterSecondPublish.versions[2];
    assert.equal(supersededOne.status, FormVersionStatus.SUPERSEDED);
    assert.equal(publishedTwo.status, FormVersionStatus.PUBLISHED);
    assert.equal(draftThree.status, FormVersionStatus.DRAFT);
    assert.equal(draftThree.title, "نسخه دوم");
    assert.equal(draftThree.description, "تغییرات نسخه دوم");
    assert.equal(draftThree.duplicatePolicy, DuplicatePolicy.ALLOW_SILENT);
    assert.equal(draftThree.createLeadOnSubmit, false);
    assert.equal(draftThree.showBranchPicker, false);
    assert.deepEqual(draftThree.settings, changedSettings);
    assert.equal(draftThree.posterMediaId, media.id);
    assert.equal(draftThree.fields[1].label, "توضیحات تکمیلی نسخه دوم");
    assert.equal(
      afterSecondPublish.versions.filter(
        (version) => version.status === FormVersionStatus.PUBLISHED,
      ).length,
      1,
    );
    assert.equal(
      afterSecondPublish.versions.filter(
        (version) => version.status === FormVersionStatus.DRAFT,
      ).length,
      1,
    );
    const publicAfterRepublish = await loadPublicFormBySlug(
      afterSecondPublish.slug,
    );
    assert(publicAfterRepublish.ok, JSON.stringify(publicAfterRepublish));
    assert.equal(publicAfterRepublish.data.version.id, draftTwo.id);
    assert.equal(publicAfterRepublish.data.version.title, "نسخه دوم");
    console.log("   OK");
  } finally {
    if (formId) {
      await prisma.form.updateMany({
        where: { id: formId, organizationId: organization.id },
        data: { publishedVersionId: null },
      });
      const versions = await prisma.formVersion.findMany({
        where: { formId, organizationId: organization.id },
        select: { id: true },
      });
      await prisma.formField.deleteMany({
        where: {
          organizationId: organization.id,
          formVersionId: { in: versions.map((version) => version.id) },
        },
      });
      await prisma.formVersion.deleteMany({
        where: { formId, organizationId: organization.id },
      });
      await prisma.form.deleteMany({
        where: { id: formId, organizationId: organization.id },
      });
    }
    if (mediaId) {
      await prisma.mediaAsset.deleteMany({
        where: { id: mediaId, organizationId: organization.id },
      });
    }
    if (templateId) {
      await prisma.formTemplate.deleteMany({
        where: { id: templateId, organizationId: organization.id },
      });
    }
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log("Form version lifecycle integration tests passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
