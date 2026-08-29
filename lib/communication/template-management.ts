import {
  SmsTemplatePurpose,
  type SmsTemplatePurpose as SmsTemplatePurposeValue,
} from "@/generated/prisma/enums";

export const SMS_TEMPLATE_EDITOR_TYPES = [
  "CUSTOM",
  "OTP",
  "BOOKING",
  "FORM",
  "REGISTRATION",
] as const;

export type SmsTemplateEditorType =
  (typeof SMS_TEMPLATE_EDITOR_TYPES)[number];

export const SMS_TEMPLATE_TYPE_LABELS: Record<SmsTemplateEditorType, string> = {
  CUSTOM: "CRM / سفارشی",
  OTP: "رمز یک‌بارمصرف",
  BOOKING: "رزرو",
  FORM: "فرم",
  REGISTRATION: "ثبت‌نام",
};

const PURPOSE_BY_EDITOR_TYPE: Record<
  SmsTemplateEditorType,
  SmsTemplatePurposeValue
> = {
  CUSTOM: SmsTemplatePurpose.CUSTOM,
  OTP: SmsTemplatePurpose.OTP,
  BOOKING: SmsTemplatePurpose.BOOKING_CONFIRMATION,
  FORM: SmsTemplatePurpose.FORM_CONFIRMATION,
  REGISTRATION: SmsTemplatePurpose.REGISTRATION_CONFIRMATION,
};

const EDITOR_TYPE_BY_PURPOSE: Record<
  SmsTemplatePurposeValue,
  SmsTemplateEditorType
> = {
  CUSTOM: "CUSTOM",
  OTP: "OTP",
  BOOKING_CONFIRMATION: "BOOKING",
  FORM_CONFIRMATION: "FORM",
  REGISTRATION_CONFIRMATION: "REGISTRATION",
};

export function purposeForSmsTemplateType(
  type: SmsTemplateEditorType,
): SmsTemplatePurposeValue {
  return PURPOSE_BY_EDITOR_TYPE[type];
}

export function editorTypeForSmsTemplatePurpose(
  purpose: SmsTemplatePurposeValue,
): SmsTemplateEditorType {
  return EDITOR_TYPE_BY_PURPOSE[purpose];
}

export function parseSmsParameterNames(
  raw: string,
):
  | { ok: true; parameters: string[] }
  | { ok: false; error: string } {
  const candidates = raw
    .split(/[\n,،]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (candidates.length > 10) {
    return { ok: false, error: "حداکثر ۱۰ پارامتر قابل تعریف است." };
  }
  const parameters: string[] = [];
  for (const candidate of candidates) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,49}$/.test(candidate)) {
      return {
        ok: false,
        error: `نام پارامتر «${candidate}» معتبر نیست. فقط حروف انگلیسی، عدد و زیرخط مجاز است.`,
      };
    }
    if (parameters.includes(candidate)) {
      return { ok: false, error: `پارامتر «${candidate}» تکراری است.` };
    }
    parameters.push(candidate);
  }
  return { ok: true, parameters };
}

export type SmsTemplateInput = {
  name: string;
  type: SmsTemplateEditorType;
  patternId: string;
  parameters: string[];
  isActive: boolean;
  description: string;
};

export function validateSmsTemplateInput(raw: {
  name: string;
  type: string;
  patternId: string;
  parameterNames: string;
  isActive: boolean;
  description: string;
}):
  | { ok: true; data: SmsTemplateInput }
  | { ok: false; error: string } {
  const name = raw.name.trim();
  if (!name || name.length > 120) {
    return { ok: false, error: "عنوان قالب باید بین ۱ تا ۱۲۰ نویسه باشد." };
  }
  if (
    !SMS_TEMPLATE_EDITOR_TYPES.includes(
      raw.type as SmsTemplateEditorType,
    )
  ) {
    return { ok: false, error: "نوع قالب معتبر نیست." };
  }
  const patternId = raw.patternId.trim();
  if (!/^[1-9]\d{0,14}$/.test(patternId) || !Number.isSafeInteger(Number(patternId))) {
    return { ok: false, error: "شناسه الگوی SMS.ir باید یک عدد صحیح مثبت باشد." };
  }
  const parsedParameters = parseSmsParameterNames(raw.parameterNames);
  if (!parsedParameters.ok) return parsedParameters;
  const description = raw.description.trim();
  if (description.length > 2000) {
    return { ok: false, error: "توضیحات قالب نباید بیشتر از ۲۰۰۰ نویسه باشد." };
  }
  return {
    ok: true,
    data: {
      name,
      type: raw.type as SmsTemplateEditorType,
      patternId,
      parameters: parsedParameters.parameters,
      isActive: raw.isActive,
      description,
    },
  };
}
