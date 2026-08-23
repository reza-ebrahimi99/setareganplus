/**
 * Booklet SMS domain service.
 * Callers announce order events. This module loads, builds, sends, and logs.
 */

import {
  CommerceOrderPaymentStatus,
  SmsMessageStatus,
} from "@/generated/prisma/enums";
import { commerceOrderQrUrl } from "@/lib/commerce/orders/qr";
import {
  COMMERCE_OPS_STAGE_LABELS,
  isCommerceOpsStage,
  type CommerceOpsStageValue,
} from "@/lib/commerce/orders/ops-stage";
import { formatJalaliDateTimeShort } from "@/lib/datetime/jalali";
import { formatRials } from "@/lib/registration/format";
import { prisma } from "@/lib/prisma";
import { sendAdminPaidSms } from "@/lib/commerce/booklet-sms/admin";
import {
  buildBuyerMessage,
  joinProductTitles,
} from "@/lib/commerce/booklet-sms/builder";
import { sendBuyerSms, type BookletSmsDeliverInput } from "@/lib/commerce/booklet-sms/buyer";
import { logBookletSms } from "@/lib/commerce/booklet-sms/logger";
import {
  bookletSmsFailure,
  bookletSmsSuccess,
  createBookletSmsCorrelationId,
  isBookletSmsEvent,
  parseBookletSmsMetadata,
  type BookletSmsEvent,
  type BookletSmsHistoryItem,
  type BookletSmsHistoryResult,
  type BookletSmsMessageOutcome,
  type BookletSmsOrderRef,
  type BookletSmsRecipientRole,
  type BookletSmsResult,
} from "@/lib/commerce/booklet-sms/types";

export type BookletSmsServiceDeps = {
  db?: typeof prisma;
  send?: BookletSmsDeliverInput["send"];
  listAdminRecipients?: (organizationId: string) => Promise<string[]>;
};

type LoadedOrder = {
  orderId: string;
  organizationId: string;
  buyerMobile: string | null;
  paymentStatus: string;
  opsStage: CommerceOpsStageValue;
  ctx: BookletSmsContext;
};

const SMS_STATUS_LABELS: Record<string, string> = {
  PENDING: "در صف",
  PROCESSING: "در حال ارسال",
  SENT: "ارسال شد",
  FAILED: "ناموفق",
  CANCELLED: "لغو",
};

const EVENT_LABELS: Record<string, string> = {
  PAID: "رسید خرید",
  READY_FOR_PICKUP: "آماده تحویل",
  DELIVERED_TO_STUDENT: "تحویل شد",
  REGISTERED: "ثبت سفارش",
  IN_PRODUCTION: "تولید",
};

async function loadOrder(
  params: BookletSmsOrderRef,
  correlationId: string,
  event: BookletSmsEvent | "UNKNOWN",
  db: typeof prisma,
): Promise<
  | { ok: true; loaded: LoadedOrder }
  | { ok: false; code: "ORDER_NOT_FOUND" }
> {
  logBookletSms({
    step: "LOAD_ORDER",
    phase: "start",
    correlationId,
    event,
    organizationId: params.organizationId,
    orderId: params.orderId,
  });

  const order = await db.commerceOrder.findFirst({
    where: {
      id: params.orderId,
      organizationId: params.organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      orderNumber: true,
      buyerMobile: true,
      buyerName: true,
      grandTotalRials: true,
      qrToken: true,
      opsStage: true,
      paymentStatus: true,
      pickupBranch: { select: { name: true, address: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: { titleSnapshot: true },
      },
    },
  });

  if (!order) {
    logBookletSms({
      step: "LOAD_ORDER",
      phase: "failed",
      correlationId,
      event,
      organizationId: params.organizationId,
      orderId: params.orderId,
      errorCode: "ORDER_NOT_FOUND",
    });
    return { ok: false, code: "ORDER_NOT_FOUND" };
  }

  const stage = isCommerceOpsStage(order.opsStage) ? order.opsStage : "REGISTERED";
  const loaded: LoadedOrder = {
    orderId: order.id,
    organizationId: order.organizationId,
    buyerMobile: order.buyerMobile,
    paymentStatus: order.paymentStatus,
    opsStage: stage,
    ctx: {
      fullName: (order.buyerName ?? "دانش‌آموز").trim() || "دانش‌آموز",
      booklet: joinProductTitles(order.items),
      amount: formatRials(order.grandTotalRials),
      orderNumber: order.orderNumber,
      pickupBranch: order.pickupBranch?.name ?? "—",
      pickupBranchAddress: order.pickupBranch?.address?.trim() || "—",
      statusLabel: COMMERCE_OPS_STAGE_LABELS[stage],
      bookletUrl: commerceOrderQrUrl(order.qrToken),
    },
  };

  logBookletSms({
    step: "LOAD_ORDER",
    phase: "success",
    correlationId,
    event,
    organizationId: loaded.organizationId,
    orderId: loaded.orderId,
  });
  return { ok: true, loaded };
}

function jobStatus(
  messages: BookletSmsMessageOutcome[],
): "success" | "partial" | "skipped" | "failed" {
  if (messages.length === 0) return "skipped";
  const sent = messages.filter((item) => item.status === "sent").length;
  const failed = messages.filter((item) => item.status === "failed").length;
  if (failed > 0 && sent === 0) return "failed";
  if (failed > 0 && sent > 0) return "partial";
  if (sent > 0) return "success";
  return "skipped";
}

function finalize(
  params: {
    correlationId: string;
    organizationId: string;
    orderId: string | null;
    event: BookletSmsEvent | "UNKNOWN";
    messages: BookletSmsMessageOutcome[];
    code?: Parameters<typeof bookletSmsFailure>[0]["code"];
  },
): BookletSmsResult {
  const status = params.code ? "failed" : jobStatus(params.messages);
  if (status === "failed" || params.code) {
    const buyerFailed = params.messages.some(
      (item) => item.role === "buyer" && item.status === "failed",
    );
    const code =
      params.code ??
      (buyerFailed ? "SEND_FAILED" : params.messages[0]?.error?.code ?? "SEND_FAILED");
    logBookletSms({
      step: "FAILED",
      phase: "failed",
      correlationId: params.correlationId,
      event: params.event,
      organizationId: params.organizationId,
      orderId: params.orderId,
      errorCode: code,
    });
    return bookletSmsFailure({
      event: params.event,
      correlationId: params.correlationId,
      organizationId: params.organizationId,
      orderId: params.orderId,
      messages: params.messages,
      code,
    });
  }

  logBookletSms({
    step: "SUCCESS",
    phase: "success",
    correlationId: params.correlationId,
    event: params.event,
    organizationId: params.organizationId,
    orderId: params.orderId,
  });
  return bookletSmsSuccess({
    status,
    event: params.event,
    correlationId: params.correlationId,
    organizationId: params.organizationId,
    orderId: params.orderId,
    messages: params.messages,
  });
}

async function runBookletSmsJob(params: {
  organizationId: string;
  orderId: string;
  event: BookletSmsEvent;
  correlationId: string;
  idempotencySuffix?: string;
  includeAdmin: boolean;
  includeBuyer: boolean;
  adminMobile?: string;
  requirePaid: boolean;
  deps?: BookletSmsServiceDeps;
}): Promise<BookletSmsResult> {
  const db = params.deps?.db ?? prisma;
  const loadedResult = await loadOrder(
    { organizationId: params.organizationId, orderId: params.orderId },
    params.correlationId,
    params.event,
    db,
  );
  if (!loadedResult.ok) {
    return finalize({
      correlationId: params.correlationId,
      organizationId: params.organizationId,
      orderId: params.orderId,
      event: params.event,
      messages: [],
      code: "ORDER_NOT_FOUND",
    });
  }
  const loaded = loadedResult.loaded;

  logBookletSms({
    step: "VALIDATE",
    phase: "start",
    correlationId: params.correlationId,
    event: params.event,
    organizationId: loaded.organizationId,
    orderId: loaded.orderId,
  });

  if (params.requirePaid && loaded.paymentStatus !== CommerceOrderPaymentStatus.PAID) {
    logBookletSms({
      step: "VALIDATE",
      phase: "failed",
      correlationId: params.correlationId,
      event: params.event,
      organizationId: loaded.organizationId,
      orderId: loaded.orderId,
      errorCode: "NOT_PAID",
    });
    return finalize({
      correlationId: params.correlationId,
      organizationId: loaded.organizationId,
      orderId: loaded.orderId,
      event: params.event,
      messages: [],
      code: "NOT_PAID",
    });
  }

  if (!isBookletSmsEvent(params.event)) {
    logBookletSms({
      step: "VALIDATE",
      phase: "failed",
      correlationId: params.correlationId,
      event: params.event,
      organizationId: loaded.organizationId,
      orderId: loaded.orderId,
      errorCode: "INVALID_STAGE",
    });
    return finalize({
      correlationId: params.correlationId,
      organizationId: loaded.organizationId,
      orderId: loaded.orderId,
      event: params.event,
      messages: [],
      code: "INVALID_STAGE",
    });
  }

  logBookletSms({
    step: "VALIDATE",
    phase: "success",
    correlationId: params.correlationId,
    event: params.event,
    organizationId: loaded.organizationId,
    orderId: loaded.orderId,
  });

  const messages: BookletSmsMessageOutcome[] = [];

  if (params.includeBuyer) {
    logBookletSms({
      step: "BUILD_BUYER",
      phase: "start",
      correlationId: params.correlationId,
      event: params.event,
      organizationId: loaded.organizationId,
      orderId: loaded.orderId,
      recipientRole: "buyer",
    });
    const buyerBody = buildBuyerMessage(params.event, loaded.ctx);
    logBookletSms({
      step: "BUILD_BUYER",
      phase: "success",
      correlationId: params.correlationId,
      event: params.event,
      organizationId: loaded.organizationId,
      orderId: loaded.orderId,
      recipientRole: "buyer",
    });
    messages.push(
      await sendBuyerSms({
        organizationId: loaded.organizationId,
        orderId: loaded.orderId,
        buyerMobile: loaded.buyerMobile,
        body: buyerBody,
        event: params.event,
        correlationId: params.correlationId,
        ctx: loaded.ctx,
        idempotencySuffix: params.idempotencySuffix,
        send: params.deps?.send,
        db,
      }),
    );
  }

  if (params.includeAdmin) {
    const adminOutcomes = await sendAdminPaidSms({
      organizationId: loaded.organizationId,
      orderId: loaded.orderId,
      buyerMobile: loaded.buyerMobile,
      correlationId: params.correlationId,
      ctx: loaded.ctx,
      idempotencySuffix: params.idempotencySuffix,
      onlyMobile: params.adminMobile,
      send: params.deps?.send,
      db,
      listRecipients: params.deps?.listAdminRecipients,
    });
    messages.push(...adminOutcomes);
  } else {
    logBookletSms({
      step: "BUILD_ADMIN",
      phase: "skipped",
      correlationId: params.correlationId,
      event: params.event,
      organizationId: loaded.organizationId,
      orderId: loaded.orderId,
      recipientRole: "admin",
      skipReason: "stage_has_no_admin_sms",
    });
  }

  const buyerFailed = messages.some(
    (item) => item.role === "buyer" && item.status === "failed",
  );
  return finalize({
    correlationId: params.correlationId,
    organizationId: loaded.organizationId,
    orderId: loaded.orderId,
    event: params.event,
    messages,
    code: buyerFailed ? "SEND_FAILED" : undefined,
  });
}

async function withWorkflow(
  params: {
    organizationId: string;
    orderId: string | null;
    event: BookletSmsEvent | "UNKNOWN";
  },
  work: (correlationId: string) => Promise<BookletSmsResult>,
): Promise<BookletSmsResult> {
  const correlationId = createBookletSmsCorrelationId();
  logBookletSms({
    step: "START",
    phase: "start",
    correlationId,
    event: params.event,
    organizationId: params.organizationId,
    orderId: params.orderId,
  });
  try {
    return await work(correlationId);
  } catch (error) {
    logBookletSms({
      step: "FAILED",
      phase: "failed",
      correlationId,
      event: params.event,
      organizationId: params.organizationId,
      orderId: params.orderId,
      errorCode: "UNEXPECTED",
      message: error instanceof Error ? error.name : "UNEXPECTED",
    });
    return bookletSmsFailure({
      event: params.event,
      correlationId,
      organizationId: params.organizationId,
      orderId: params.orderId,
      messages: [],
      code: "UNEXPECTED",
    });
  }
}

export async function onBookletOrderPaid(
  params: BookletSmsOrderRef,
  deps?: BookletSmsServiceDeps,
): Promise<BookletSmsResult> {
  return withWorkflow(
    { ...params, event: "PAID" },
    (correlationId) =>
      runBookletSmsJob({
        organizationId: params.organizationId,
        orderId: params.orderId,
        event: "PAID",
        correlationId,
        includeAdmin: true,
        includeBuyer: true,
        requirePaid: true,
        deps,
      }),
  );
}

export async function onBookletOrderStageChanged(
  params: BookletSmsOrderRef & { stage: string },
  deps?: BookletSmsServiceDeps,
): Promise<BookletSmsResult> {
  return withWorkflow(
    {
      organizationId: params.organizationId,
      orderId: params.orderId,
      event: isBookletSmsEvent(params.stage) ? params.stage : "UNKNOWN",
    },
    async (correlationId) => {
      if (
        params.stage !== "READY_FOR_PICKUP" &&
        params.stage !== "DELIVERED_TO_STUDENT"
      ) {
        logBookletSms({
          step: "VALIDATE",
          phase: "skipped",
          correlationId,
          event: "UNKNOWN",
          organizationId: params.organizationId,
          orderId: params.orderId,
          skipReason: "stage_has_no_student_sms",
        });
        logBookletSms({
          step: "SUCCESS",
          phase: "success",
          correlationId,
          event: "UNKNOWN",
          organizationId: params.organizationId,
          orderId: params.orderId,
          skipReason: "stage_has_no_student_sms",
        });
        return bookletSmsSuccess({
          status: "skipped",
          event: "UNKNOWN",
          correlationId,
          organizationId: params.organizationId,
          orderId: params.orderId,
          messages: [
            {
              role: "buyer",
              status: "skipped",
              messageId: null,
              skipReason: "stage_has_no_student_sms",
            },
          ],
        });
      }
      return runBookletSmsJob({
        organizationId: params.organizationId,
        orderId: params.orderId,
        event: params.stage,
        correlationId,
        includeAdmin: false,
        includeBuyer: true,
        requirePaid: false,
        deps,
      });
    },
  );
}

export async function resendBookletSms(
  params: BookletSmsOrderRef & { stage?: string },
  deps?: BookletSmsServiceDeps,
): Promise<BookletSmsResult> {
  const suffix = `:resend:${Date.now()}`;
  return withWorkflow(
    {
      organizationId: params.organizationId,
      orderId: params.orderId,
      event: isBookletSmsEvent(params.stage) ? params.stage : "UNKNOWN",
    },
    async (correlationId) => {
      const db = deps?.db ?? prisma;
      const loadedResult = await loadOrder(
        params,
        correlationId,
        isBookletSmsEvent(params.stage) ? params.stage : "UNKNOWN",
        db,
      );
      if (!loadedResult.ok) {
        return finalize({
          correlationId,
          organizationId: params.organizationId,
          orderId: params.orderId,
          event: "UNKNOWN",
          messages: [],
          code: "ORDER_NOT_FOUND",
        });
      }
      const stage = params.stage ?? loadedResult.loaded.opsStage;
      if (!isBookletSmsEvent(stage)) {
        logBookletSms({
          step: "VALIDATE",
          phase: "failed",
          correlationId,
          event: "UNKNOWN",
          organizationId: params.organizationId,
          orderId: params.orderId,
          errorCode: "INVALID_STAGE",
        });
        return finalize({
          correlationId,
          organizationId: params.organizationId,
          orderId: params.orderId,
          event: "UNKNOWN",
          messages: [],
          code: "INVALID_STAGE",
        });
      }
      return runBookletSmsJob({
        organizationId: params.organizationId,
        orderId: loadedResult.loaded.orderId,
        event: stage,
        correlationId,
        idempotencySuffix: suffix,
        includeAdmin: stage === "PAID",
        includeBuyer: true,
        requirePaid: stage === "PAID",
        deps,
      });
    },
  );
}

export async function retryBookletSms(
  params: { organizationId: string; messageId: string },
  deps?: BookletSmsServiceDeps,
): Promise<BookletSmsResult> {
  return withWorkflow(
    {
      organizationId: params.organizationId,
      orderId: null,
      event: "UNKNOWN",
    },
    async (correlationId) => {
      const db = deps?.db ?? prisma;
      const message = await db.smsMessage.findFirst({
        where: {
          id: params.messageId,
          organizationId: params.organizationId,
          relatedType: "CommerceOrder",
        },
        select: {
          relatedId: true,
          status: true,
          metadata: true,
          toMobile: true,
          purpose: true,
        },
      });
      if (!message?.relatedId) {
        return finalize({
          correlationId,
          organizationId: params.organizationId,
          orderId: null,
          event: "UNKNOWN",
          messages: [],
          code: "MESSAGE_NOT_FOUND",
        });
      }
      if (message.status !== SmsMessageStatus.FAILED) {
        return finalize({
          correlationId,
          organizationId: params.organizationId,
          orderId: message.relatedId,
          event: "UNKNOWN",
          messages: [],
          code: "RETRY_NOT_ELIGIBLE",
        });
      }

      const parsed = parseBookletSmsMetadata(message.metadata);
      const event: BookletSmsEvent = parsed.event ?? "PAID";
      const role: BookletSmsRecipientRole =
        parsed.role ??
        (message.purpose.includes("admin") ? "admin" : "buyer");

      return runBookletSmsJob({
        organizationId: params.organizationId,
        orderId: message.relatedId,
        event,
        correlationId,
        idempotencySuffix: `:retry:${Date.now()}`,
        includeAdmin: role === "admin",
        includeBuyer: role === "buyer",
        adminMobile: role === "admin" ? message.toMobile : undefined,
        requirePaid: event === "PAID",
        deps,
      });
    },
  );
}

export async function listBookletSmsHistory(
  params: BookletSmsOrderRef,
  deps?: BookletSmsServiceDeps,
): Promise<BookletSmsHistoryResult> {
  const correlationId = createBookletSmsCorrelationId();
  logBookletSms({
    step: "START",
    phase: "start",
    correlationId,
    event: "UNKNOWN",
    organizationId: params.organizationId,
    orderId: params.orderId,
  });
  try {
    const db = deps?.db ?? prisma;
    const rows = await db.smsMessage.findMany({
      where: {
        organizationId: params.organizationId,
        relatedType: "CommerceOrder",
        relatedId: params.orderId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        purpose: true,
        status: true,
        sentAt: true,
        createdAt: true,
        lastError: true,
        providerMessageId: true,
        metadata: true,
      },
    });
    const items: BookletSmsHistoryItem[] = rows.map((row) => {
      const parsed = parseBookletSmsMetadata(row.metadata);
      const event = parsed.event ?? "";
      const meta =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      const templateKind = typeof meta.templateKind === "string" ? meta.templateKind : "";
      const templateLabel =
        parsed.role === "admin"
          ? "پیامک مدیر"
          : templateKind === "form"
            ? "قالب ثبت‌نام"
            : templateKind === "commerce"
              ? "قالب فروشگاه"
              : "پیامک جزوه";
      return {
        id: row.id,
        templateLabel,
        stageLabel: EVENT_LABELS[event] ?? row.purpose,
        sentAtLabel: formatJalaliDateTimeShort(row.sentAt ?? row.createdAt),
        status: row.status,
        statusLabel: SMS_STATUS_LABELS[row.status] ?? row.status,
        providerResponse: row.lastError ?? row.providerMessageId ?? "—",
        canRetry: row.status === SmsMessageStatus.FAILED,
      };
    });
    logBookletSms({
      step: "SUCCESS",
      phase: "success",
      correlationId,
      organizationId: params.organizationId,
      orderId: params.orderId,
    });
    return {
      ok: true,
      correlationId,
      organizationId: params.organizationId,
      orderId: params.orderId,
      items,
    };
  } catch (error) {
    logBookletSms({
      step: "FAILED",
      phase: "failed",
      correlationId,
      organizationId: params.organizationId,
      orderId: params.orderId,
      errorCode: "UNEXPECTED",
      message: error instanceof Error ? error.name : "UNEXPECTED",
    });
    return {
      ok: false,
      correlationId,
      organizationId: params.organizationId,
      orderId: params.orderId,
      items: [],
      error: {
        code: "UNEXPECTED",
        message: error instanceof Error ? error.name : "UNEXPECTED",
      },
    };
  }
}
