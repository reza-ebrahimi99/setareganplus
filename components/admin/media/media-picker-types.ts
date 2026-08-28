/**
 * Serializable media item for the Global Media Picker (client-safe).
 * Do not pass Prisma objects into Client Components.
 */

export type MediaPickerStatus = "ACTIVE" | "INACTIVE";

export type MediaPickerItem = {
  id: string;
  title: string | null;
  altText: string | null;
  category: string | null;
  url: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  byteSize: number;
  status: MediaPickerStatus;
};

export type MediaPickerMode = "single" | "multiple";

export type MediaPickerSort = "newest" | "oldest" | "title";

export type MediaPickerListResult = {
  items: MediaPickerItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MediaPickerSearchInput = {
  q?: string;
  category?: string;
  page?: number;
  sort?: MediaPickerSort;
  /** Defaults to ACTIVE on the server. */
  status?: "ACTIVE" | "all";
  /** Defaults to true on the server. */
  imagesOnly?: boolean;
};

export type MediaPickerSearchResult =
  | { ok: true; data: MediaPickerListResult }
  | { ok: false; error: string };

export type MediaPickerCategoriesResult =
  | { ok: true; categories: string[] }
  | { ok: false; error: string };
