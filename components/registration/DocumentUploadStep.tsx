"use client";

import { useState, useTransition } from "react";
import { RegistrationDocumentType } from "@/generated/prisma/enums";
import { REGISTRATION_DOCUMENT_TYPE_LABELS } from "@/lib/registration/status";
import { uploadRegistrationDocumentAction } from "@/app/ghalamchi/register/actions";

type DocItem = {
  documentId: string;
  documentType: RegistrationDocumentType;
  publicUrl: string;
};

type DocumentUploadStepProps = {
  resumeToken: string | null;
  documents: DocItem[];
  onUploaded: (doc: DocItem) => void;
  onNeedSaveFirst: () => Promise<string | null>;
};

const REQUIRED_TYPES: RegistrationDocumentType[] = [
  RegistrationDocumentType.STUDENT_PHOTO,
  RegistrationDocumentType.NATIONAL_CARD,
  RegistrationDocumentType.BIRTH_CERTIFICATE,
  RegistrationDocumentType.PARENT_CONSENT,
];

export function DocumentUploadStep({
  resumeToken,
  documents,
  onUploaded,
  onNeedSaveFirst,
}: DocumentUploadStepProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [progressType, setProgressType] =
    useState<RegistrationDocumentType | null>(null);

  function upload(documentType: RegistrationDocumentType, file: File | null) {
    if (!file) return;
    setError(null);
    setProgressType(documentType);
    startTransition(async () => {
      let token = resumeToken;
      if (!token) {
        token = await onNeedSaveFirst();
      }
      if (!token) {
        setError("ابتدا پیشرفت ثبت‌نام را ذخیره کنید.");
        setProgressType(null);
        return;
      }
      const formData = new FormData();
      formData.set("resumeToken", token);
      formData.set("documentType", documentType);
      formData.set("file", file);
      const result = await uploadRegistrationDocumentAction(formData);
      setProgressType(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onUploaded({
        documentId: result.documentId,
        documentType: result.documentType,
        publicUrl: result.publicUrl,
      });
    });
  }

  return (
    <section aria-labelledby="docs-step-title" className="space-y-4">
      <h2 id="docs-step-title" className="text-base font-semibold text-primary">
        بارگذاری مدارک
      </h2>
      <p className="text-sm leading-7 text-muted">
        تصاویر واضح از مدارک را بارگذاری کنید. می‌توانید بعداً ادامه دهید.
      </p>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-3">
        {[...REQUIRED_TYPES, RegistrationDocumentType.OTHER].map((type) => {
          const existing = documents.filter((d) => d.documentType === type);
          return (
            <li
              key={type}
              className="rounded-2xl border border-border/80 bg-white/80 p-4 shadow-sm backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-primary">
                  {REGISTRATION_DOCUMENT_TYPE_LABELS[type]}
                </p>
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium">
                  {progressType === type && pending
                    ? "در حال بارگذاری…"
                    : "انتخاب فایل"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={pending}
                    onChange={(e) =>
                      upload(type, e.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
              {existing.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {existing.map((doc) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={doc.documentId}
                      src={doc.publicUrl}
                      alt={REGISTRATION_DOCUMENT_TYPE_LABELS[type]}
                      className="h-16 w-16 rounded-lg object-cover ring-1 ring-border"
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted">هنوز فایلی نیست</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
