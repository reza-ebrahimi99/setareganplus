/** SXP Phase S1 constants plus additive S2 keys. Do not collapse later phases here. */

export const SXP_FEATURE_FLAG_KEY = "sxp";

export const SXP_FILES_FLAG_KEY = "sxp.files";

export const SXP_HARD_OFF_ENV = "STAROS_SXP_HARD_OFF";

export const SXP_WORKER_BATCH_ENV = "STAROS_SXP_WORKER_BATCH";

export const SXP_ENGINE_MAX_ATTEMPTS = 5;

export const SXP_FEED_LIMIT = 20;

export const SXP_TIMELINE_PAGE_SIZE = 30;

export const SXP_QUICK_ACTION_LIMIT = 3;

export const SXP_MEMBERSHIP_LEVEL_SOON = "به‌زودی";

/** Synthetic inbox key for SENT SmsMessage rows. Not a DomainEventOutbox id. */
export function smsInboxEventId(smsMessageId: string): string {
  return `sms-message:${smsMessageId}`;
}

export const SMS_SENT_EVENT_TYPE = "SMS_SENT";
