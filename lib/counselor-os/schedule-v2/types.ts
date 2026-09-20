import type {
  CounselorSchedulePlanStatus,
  CounselorScheduleSessionKind,
} from "@/generated/prisma/enums";

export type ScheduleWindowInput = {
  startLocalTime: string;
  endLocalTime: string;
};

export type ScheduleDayInput = {
  localDateGregorian: string;
  note?: string | null;
  windows: ScheduleWindowInput[];
};

export type SchedulePlanListItem = {
  id: string;
  sessionKind: CounselorScheduleSessionKind;
  status: CounselorSchedulePlanStatus;
  sessionMinutes: number;
  title: string | null;
  version: number;
  dayCount: number;
  slotPreviewCount: number | null;
  updatedAt: string;
  activatedAt: string | null;
};

export type SchedulePlanDetail = {
  id: string;
  advisorId: string;
  sessionKind: CounselorScheduleSessionKind;
  status: CounselorSchedulePlanStatus;
  sessionMinutes: number;
  title: string | null;
  note: string | null;
  version: number;
  days: Array<{
    id: string;
    localDateGregorian: string;
    jalaliLabel: string;
    weekdayLabel: string;
    note: string | null;
    windows: Array<{
      id: string;
      startLocalTime: string;
      endLocalTime: string;
    }>;
  }>;
};

export type PreviewSlotResult = {
  totalSlots: number;
  byDay: Array<{ jalaliLabel: string; count: number }>;
  error?: string;
};
