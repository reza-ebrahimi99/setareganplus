import type { TimelineNodeView } from "@/components/admin/Timeline";
import type { CommerceBranchBadge } from "@/lib/commerce/branches";
import type {
  CommerceOpsHealthLevel,
  CommerceOpsPriority,
} from "@/lib/commerce/orders/intelligence";
import type { CommerceOpsStageValue } from "@/lib/commerce/orders/ops-stage";

export type OrderOpsListItem = {
  id: string;
  orderNumber: string;
  buyerName: string | null;
  buyerFirstName: string | null;
  buyerLastName: string | null;
  parentName: string | null;
  buyerMobile: string | null;
  buyerNationalCode: string | null;
  studentGrade: string | null;
  studentGradeLabel: string | null;
  studentMajor: string | null;
  studentMajorLabel: string | null;
  productTitle: string;
  amountLabel: string;
  paymentLabel: string;
  paymentPaid: boolean;
  opsStage: CommerceOpsStageValue;
  lastActivityTitle: string;
  lastActivityAtLabel: string;
  lastActivityIsRollback: boolean;
  createdAtLabel: string;
  branch: CommerceBranchBadge | null;
  pickupBranch: CommerceBranchBadge | null;
  handoverStaffUserId: string | null;
  handoverStaffName: string | null;
  urgentDelivery: boolean;
  opsVip: boolean;
  qrToken: string;
  notes: string | null;
  priority: CommerceOpsPriority;
  delayed: boolean;
  delayKind: "production" | "ready" | null;
  healthScore: number;
  healthLevel: CommerceOpsHealthLevel;
  progressPercent: number;
};

export type OrderOpsDetailView = OrderOpsListItem & {
  specialNotes: string | null;
  deliveryNote: string | null;
  buyerEmail: string | null;
  paymentTrackingCode: string | null;
  bookletPaymentMethodLabel: string | null;
  deliveredAtLabel: string | null;
  deliveredByName: string | null;
  items: Array<{
    id: string;
    title: string;
    quantityLabel: string;
    unitPriceLabel: string;
    totalLabel: string;
  }>;
  timeline: TimelineNodeView[];
  activity: Array<{
    id: string;
    title: string;
    note: string | null;
    occurredAtLabel: string;
    operatorName: string | null;
  }>;
  smsHistory: Array<{
    id: string;
    templateLabel: string;
    stageLabel: string;
    sentAtLabel: string;
    status: string;
    statusLabel: string;
    providerResponse: string;
    canRetry: boolean;
  }>;
};

export type OrderOpsKpiView = {
  key: string;
  label: string;
  valueLabel: string;
  hint: string;
  tone?: "default" | "warning" | "info" | "success" | "revenue";
  href?: string;
};

export type OrderOpsNotificationView = {
  id: string;
  title: string;
  body: string | null;
  entityId: string | null;
  read: boolean;
  createdAtLabel: string;
};

export type OrderOpsFilterState = {
  q: string;
  branchId: string;
  pickupBranchId: string;
  opsStage: string;
  studentGrade: string;
  studentMajor: string;
  handoverStaffUserId: string;
  dateFrom: string;
  dateTo: string;
  datePreset: string;
  todayOnly: boolean;
  paidOnly: boolean;
  waitingProduction: boolean;
  readyForPickup: boolean;
  deliveredOnly: boolean;
  deliveredToday: boolean;
  undeliveredOnly: boolean;
  delayedOnly: boolean;
  mine: boolean;
  opsVipOnly: boolean;
  sort: "priority" | "createdAt";
  yesterday: boolean;
  thisWeek: boolean;
  thisMonth: boolean;
};
