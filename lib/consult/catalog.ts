export type Catalog = {
  closed: boolean;
  configured: boolean;
  slotMinutes: number;
  jy: number;
  jm: number;
  days: { date: string; jd: number; weekday: number; open: number; inHorizon: boolean }[];
  times: Record<string, { startsAt: string; label: string; open: number }[]>;
  consultants: { id: string; name: string; specialty: string; photo: string | null; startsAt: string[] }[];
};
