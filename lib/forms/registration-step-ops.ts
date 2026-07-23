import type { Prisma } from "@/generated/prisma/client";
import type { EditableDraftContext } from "@/lib/forms/resolve-editable-draft";
import {
  nextAvailableStepKey,
  normalizeStepKey,
} from "@/lib/forms/normalize-step-key";

export type StepOpResult =
  | { ok: true }
  | { ok: false; error: string };

type Tx = Prisma.TransactionClient;

async function touchForm(tx: Tx, context: EditableDraftContext) {
  await tx.form.update({
    where: {
      organizationId_id: {
        organizationId: context.organizationId,
        id: context.formId,
      },
    },
    data: { updatedAt: new Date() },
  });
}

async function loadDraftSteps(tx: Tx, context: EditableDraftContext) {
  return tx.formStep.findMany({
    where: {
      organizationId: context.organizationId,
      formVersionId: context.formVersionId,
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      stepKey: true,
      sortOrder: true,
      title: true,
      description: true,
    },
  });
}

async function loadDraftFields(tx: Tx, context: EditableDraftContext) {
  return tx.formField.findMany({
    where: {
      organizationId: context.organizationId,
      formVersionId: context.formVersionId,
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      formStepId: true,
      sortOrder: true,
      label: true,
    },
  });
}

/**
 * Asserts a step belongs to the exact draft version + organization.
 * Never trust client-provided IDs without this check.
 */
export async function assertStepInDraft(
  tx: Tx,
  context: EditableDraftContext,
  stepId: string,
) {
  return tx.formStep.findFirst({
    where: {
      id: stepId,
      organizationId: context.organizationId,
      formVersionId: context.formVersionId,
    },
    select: {
      id: true,
      sortOrder: true,
      title: true,
      description: true,
      stepKey: true,
    },
  });
}

/**
 * Asserts a field belongs to the exact draft version + organization.
 */
export async function assertFieldInDraft(
  tx: Tx,
  context: EditableDraftContext,
  fieldId: string,
) {
  return tx.formField.findFirst({
    where: {
      id: fieldId,
      organizationId: context.organizationId,
      formVersionId: context.formVersionId,
    },
    select: {
      id: true,
      formStepId: true,
      sortOrder: true,
      label: true,
    },
  });
}

async function rewriteStepSortOrders(
  tx: Tx,
  context: EditableDraftContext,
  orderedStepIds: readonly string[],
) {
  for (let index = 0; index < orderedStepIds.length; index += 1) {
    await tx.formStep.update({
      where: {
        organizationId_id: {
          organizationId: context.organizationId,
          id: orderedStepIds[index],
        },
      },
      data: { sortOrder: -(index + 1) },
    });
  }

  for (let index = 0; index < orderedStepIds.length; index += 1) {
    await tx.formStep.update({
      where: {
        organizationId_id: {
          organizationId: context.organizationId,
          id: orderedStepIds[index],
        },
      },
      data: { sortOrder: index + 1 },
    });
  }
}

async function rewriteFieldSortOrders(
  tx: Tx,
  context: EditableDraftContext,
  orderedFieldIds: readonly string[],
) {
  for (let index = 0; index < orderedFieldIds.length; index += 1) {
    await tx.formField.update({
      where: {
        organizationId_id: {
          organizationId: context.organizationId,
          id: orderedFieldIds[index],
        },
      },
      data: { sortOrder: -(index + 1) },
    });
  }

  for (let index = 0; index < orderedFieldIds.length; index += 1) {
    await tx.formField.update({
      where: {
        organizationId_id: {
          organizationId: context.organizationId,
          id: orderedFieldIds[index],
        },
      },
      data: { sortOrder: index + 1 },
    });
  }
}

/**
 * Builds version-wide field order: fields by step order, then unassigned.
 * Within each group, preserves the provided per-group order.
 */
function flattenFieldOrder(params: {
  stepIds: readonly string[];
  fieldsByStepId: ReadonlyMap<string, readonly string[]>;
  unassignedFieldIds: readonly string[];
}): string[] {
  const ordered: string[] = [];
  for (const stepId of params.stepIds) {
    const group = params.fieldsByStepId.get(stepId) ?? [];
    ordered.push(...group);
  }
  ordered.push(...params.unassignedFieldIds);
  return ordered;
}

async function buildCurrentFieldGroups(
  tx: Tx,
  context: EditableDraftContext,
): Promise<{
  stepIds: string[];
  fieldsByStepId: Map<string, string[]>;
  unassignedFieldIds: string[];
}> {
  const steps = await loadDraftSteps(tx, context);
  const fields = await loadDraftFields(tx, context);
  const stepIds = steps.map((step) => step.id);
  const stepIdSet = new Set(stepIds);
  const fieldsByStepId = new Map<string, string[]>();
  for (const stepId of stepIds) {
    fieldsByStepId.set(stepId, []);
  }

  const unassignedFieldIds: string[] = [];
  for (const field of fields) {
    if (field.formStepId && stepIdSet.has(field.formStepId)) {
      fieldsByStepId.get(field.formStepId)?.push(field.id);
    } else {
      unassignedFieldIds.push(field.id);
    }
  }

  return { stepIds, fieldsByStepId, unassignedFieldIds };
}

async function rewriteFieldsFollowingSteps(
  tx: Tx,
  context: EditableDraftContext,
  groups?: {
    stepIds: readonly string[];
    fieldsByStepId: ReadonlyMap<string, readonly string[]>;
    unassignedFieldIds: readonly string[];
  },
) {
  const resolved = groups ?? (await buildCurrentFieldGroups(tx, context));
  const orderedFieldIds = flattenFieldOrder(resolved);
  if (orderedFieldIds.length > 0) {
    await rewriteFieldSortOrders(tx, context, orderedFieldIds);
  }
}

export async function createRegistrationStep(
  tx: Tx,
  context: EditableDraftContext,
  input: { title: string; description: string | null },
): Promise<StepOpResult> {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "عنوان مرحله الزامی است." };
  }
  if (title.length > 200) {
    return { ok: false, error: "عنوان مرحله نباید بیشتر از ۲۰۰ کاراکتر باشد." };
  }

  const description = input.description?.trim() || null;
  if (description && description.length > 2000) {
    return {
      ok: false,
      error: "توضیح مرحله نباید بیشتر از ۲۰۰۰ کاراکتر باشد.",
    };
  }

  const existing = await loadDraftSteps(tx, context);
  const existingKeys = new Set(existing.map((step) => step.stepKey));
  const stepKey = nextAvailableStepKey(existingKeys);
  const keyCheck = normalizeStepKey(stepKey);
  if (!keyCheck.ok) {
    return { ok: false, error: keyCheck.error };
  }

  await tx.formStep.create({
    data: {
      organizationId: context.organizationId,
      formVersionId: context.formVersionId,
      stepKey: keyCheck.stepKey,
      sortOrder: existing.length + 1,
      title,
      description,
      settings: {},
    },
  });

  const steps = await loadDraftSteps(tx, context);
  await rewriteStepSortOrders(
    tx,
    context,
    steps.map((step) => step.id),
  );
  await touchForm(tx, context);
  return { ok: true };
}

export async function updateRegistrationStep(
  tx: Tx,
  context: EditableDraftContext,
  input: { stepId: string; title: string; description: string | null },
): Promise<StepOpResult> {
  const step = await assertStepInDraft(tx, context, input.stepId);
  if (!step) {
    return { ok: false, error: "مرحله مورد نظر در نسخه پیش‌نویس یافت نشد." };
  }

  const title = input.title.trim();
  if (!title) {
    return { ok: false, error: "عنوان مرحله الزامی است." };
  }
  if (title.length > 200) {
    return { ok: false, error: "عنوان مرحله نباید بیشتر از ۲۰۰ کاراکتر باشد." };
  }

  const description = input.description?.trim() || null;
  if (description && description.length > 2000) {
    return {
      ok: false,
      error: "توضیح مرحله نباید بیشتر از ۲۰۰۰ کاراکتر باشد.",
    };
  }

  await tx.formStep.update({
    where: {
      organizationId_id: {
        organizationId: context.organizationId,
        id: step.id,
      },
    },
    data: { title, description },
  });
  await touchForm(tx, context);
  return { ok: true };
}

/**
 * Unassigns fields, deletes the step, normalizes remaining step + field orders.
 * Does not delete fields.
 */
export async function deleteRegistrationStep(
  tx: Tx,
  context: EditableDraftContext,
  stepId: string,
): Promise<StepOpResult & { unassignedFieldCount?: number }> {
  const step = await assertStepInDraft(tx, context, stepId);
  if (!step) {
    return { ok: false, error: "مرحله مورد نظر در نسخه پیش‌نویس یافت نشد." };
  }

  const assigned = await tx.formField.findMany({
    where: {
      organizationId: context.organizationId,
      formVersionId: context.formVersionId,
      formStepId: step.id,
    },
    select: { id: true },
  });

  if (assigned.length > 0) {
    await tx.formField.updateMany({
      where: {
        organizationId: context.organizationId,
        formVersionId: context.formVersionId,
        formStepId: step.id,
      },
      data: { formStepId: null },
    });
  }

  await tx.formStep.delete({
    where: {
      organizationId_id: {
        organizationId: context.organizationId,
        id: step.id,
      },
    },
  });

  const remainingSteps = await loadDraftSteps(tx, context);
  await rewriteStepSortOrders(
    tx,
    context,
    remainingSteps.map((item) => item.id),
  );
  await rewriteFieldsFollowingSteps(tx, context);
  await touchForm(tx, context);

  return { ok: true, unassignedFieldCount: assigned.length };
}

export async function moveRegistrationStep(
  tx: Tx,
  context: EditableDraftContext,
  stepId: string,
  direction: "up" | "down",
): Promise<StepOpResult> {
  const steps = await loadDraftSteps(tx, context);
  const index = steps.findIndex((step) => step.id === stepId);
  if (index < 0) {
    return { ok: false, error: "مرحله مورد نظر در نسخه پیش‌نویس یافت نشد." };
  }
  if (direction === "up" && index === 0) {
    return { ok: false, error: "این مرحله در ابتدای فهرست است." };
  }
  if (direction === "down" && index === steps.length - 1) {
    return { ok: false, error: "این مرحله در انتهای فهرست است." };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  const ordered = steps.map((step) => step.id);
  const temp = ordered[index];
  ordered[index] = ordered[swapIndex];
  ordered[swapIndex] = temp;

  await rewriteStepSortOrders(tx, context, ordered);
  await rewriteFieldsFollowingSteps(tx, context);
  await touchForm(tx, context);
  return { ok: true };
}

/**
 * Assigns or moves a field to a step in the same draft version.
 * targetStepId null = unassign (preserve field).
 */
export async function assignFieldToRegistrationStep(
  tx: Tx,
  context: EditableDraftContext,
  input: { fieldId: string; targetStepId: string | null },
): Promise<StepOpResult> {
  const field = await assertFieldInDraft(tx, context, input.fieldId);
  if (!field) {
    return { ok: false, error: "فیلد مورد نظر در نسخه پیش‌نویس یافت نشد." };
  }

  let targetStepId: string | null = null;
  if (input.targetStepId) {
    const step = await assertStepInDraft(tx, context, input.targetStepId);
    if (!step) {
      return {
        ok: false,
        error:
          "مرحله مقصد در همین نسخه پیش‌نویس یافت نشد. انتساب بین نسخه‌ها مجاز نیست.",
      };
    }
    targetStepId = step.id;
  }

  if (field.formStepId === targetStepId) {
    return { ok: true };
  }

  const groups = await buildCurrentFieldGroups(tx, context);

  // Remove from current group
  if (field.formStepId && groups.fieldsByStepId.has(field.formStepId)) {
    groups.fieldsByStepId.set(
      field.formStepId,
      (groups.fieldsByStepId.get(field.formStepId) ?? []).filter(
        (id) => id !== field.id,
      ),
    );
  } else {
    groups.unassignedFieldIds = groups.unassignedFieldIds.filter(
      (id) => id !== field.id,
    );
  }

  // Append to target group
  if (targetStepId) {
    const list = [...(groups.fieldsByStepId.get(targetStepId) ?? []), field.id];
    groups.fieldsByStepId.set(targetStepId, list);
  } else {
    groups.unassignedFieldIds = [...groups.unassignedFieldIds, field.id];
  }

  await tx.formField.update({
    where: {
      organizationId_id: {
        organizationId: context.organizationId,
        id: field.id,
      },
    },
    data: { formStepId: targetStepId },
  });

  await rewriteFieldsFollowingSteps(tx, context, groups);
  await touchForm(tx, context);
  return { ok: true };
}

export async function moveFieldWithinRegistrationGroup(
  tx: Tx,
  context: EditableDraftContext,
  input: {
    fieldId: string;
    /** null = unassigned group */
    stepId: string | null;
    direction: "up" | "down";
  },
): Promise<StepOpResult> {
  const field = await assertFieldInDraft(tx, context, input.fieldId);
  if (!field) {
    return { ok: false, error: "فیلد مورد نظر در نسخه پیش‌نویس یافت نشد." };
  }

  if (input.stepId !== null) {
    const step = await assertStepInDraft(tx, context, input.stepId);
    if (!step) {
      return { ok: false, error: "مرحله مورد نظر در نسخه پیش‌نویس یافت نشد." };
    }
    if (field.formStepId !== step.id) {
      return { ok: false, error: "این فیلد به این مرحله تعلق ندارد." };
    }
  } else if (field.formStepId !== null) {
    return { ok: false, error: "این فیلد در فهرست بدون مرحله نیست." };
  }

  const groups = await buildCurrentFieldGroups(tx, context);
  const groupIds =
    input.stepId === null
      ? [...groups.unassignedFieldIds]
      : [...(groups.fieldsByStepId.get(input.stepId) ?? [])];

  const index = groupIds.indexOf(field.id);
  if (index < 0) {
    return { ok: false, error: "فیلد در گروه مورد نظر یافت نشد." };
  }
  if (input.direction === "up" && index === 0) {
    return { ok: false, error: "این فیلد در ابتدای فهرست است." };
  }
  if (input.direction === "down" && index === groupIds.length - 1) {
    return { ok: false, error: "این فیلد در انتهای فهرست است." };
  }

  const swapIndex = input.direction === "up" ? index - 1 : index + 1;
  const temp = groupIds[index];
  groupIds[index] = groupIds[swapIndex];
  groupIds[swapIndex] = temp;

  if (input.stepId === null) {
    groups.unassignedFieldIds = groupIds;
  } else {
    groups.fieldsByStepId.set(input.stepId, groupIds);
  }

  await rewriteFieldsFollowingSteps(tx, context, groups);
  await touchForm(tx, context);
  return { ok: true };
}
