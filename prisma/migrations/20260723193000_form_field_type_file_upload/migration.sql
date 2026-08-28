-- Additive: FormFieldType.FILE_UPLOAD for registration document uploads

ALTER TYPE "FormFieldType" ADD VALUE IF NOT EXISTS 'FILE_UPLOAD';
