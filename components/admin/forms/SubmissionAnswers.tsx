import { FormFieldType } from "@/generated/prisma/enums";
import { formatAnswerDisplay } from "@/lib/forms/format-answer-display";
import { parseFormFileUploadAnswer } from "@/lib/forms/file-upload-config";
import type { SubmissionDetailData } from "@/lib/forms/load-form-responses";
import { formUploadSecureDownloadPath } from "@/lib/media/form-file-upload";
import { toPersianDigits } from "@/lib/persian";

export function SubmissionAnswers({
  answers,
}: {
  answers: SubmissionDetailData["answers"];
}) {
  if (answers.length === 0) {
    return (
      <div className="admin-card px-5 py-10 text-center text-sm text-muted">
        هیچ پاسخی برای این ثبت‌نام ذخیره نشده است.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {answers.map((answer, index) => {
        const upload =
          answer.type === FormFieldType.FILE_UPLOAD
            ? parseFormFileUploadAnswer(answer.valueJson)
            : null;
        const display = formatAnswerDisplay(
          answer.type,
          answer,
          answer.config,
        );

        return (
          <li key={answer.fieldId} className="admin-card p-4 sm:p-5">
            <p className="text-xs text-muted">
              سؤال {toPersianDigits(index + 1)}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-primary sm:text-base">
              {answer.label}
            </h3>
            <div className="mt-3 rounded-xl border border-border bg-background px-4 py-3 text-sm leading-7 text-foreground">
              {upload && upload.files.length > 0 ? (
                <ul className="space-y-2">
                  {upload.files.map((file) => (
                    <li key={file.mediaAssetId}>
                      <a
                        href={formUploadSecureDownloadPath(file.mediaAssetId)}
                        className="font-medium text-secondary underline-offset-2 hover:underline"
                      >
                        {file.originalName}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                display
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
