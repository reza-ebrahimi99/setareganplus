"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  listMediaPickerCategoriesAction,
  searchMediaLibraryAction,
} from "@/app/admin/(dashboard)/website/media/picker-actions";
import type {
  MediaPickerItem,
  MediaPickerListResult,
  MediaPickerSort,
} from "@/components/admin/media/media-picker-types";

const emptyResult: MediaPickerListResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 24,
  totalPages: 1,
};

type UseMediaPickerQueryOptions = {
  enabled: boolean;
  initialSort?: MediaPickerSort;
};

export function useMediaPickerQuery({
  enabled,
  initialSort = "newest",
}: UseMediaPickerQueryOptions) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<MediaPickerSort>(initialSort);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<MediaPickerListResult>(emptyResult);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requestIdRef = useRef(0);
  const deferredQ = useDeferredValue(q);

  const load = useCallback(
    (overrides?: {
      q?: string;
      category?: string;
      sort?: MediaPickerSort;
      page?: number;
    }) => {
      const nextQ = overrides?.q ?? deferredQ;
      const nextCategory = overrides?.category ?? category;
      const nextSort = overrides?.sort ?? sort;
      const nextPage = overrides?.page ?? page;
      const requestId = ++requestIdRef.current;

      startTransition(async () => {
        const response = await searchMediaLibraryAction({
          q: nextQ,
          category: nextCategory || undefined,
          sort: nextSort,
          page: nextPage,
          status: "ACTIVE",
          imagesOnly: true,
        });
        if (requestId !== requestIdRef.current) return;
        if (!response.ok) {
          setError(response.error);
          return;
        }
        setError(null);
        setResult(response.data);
      });
    },
    [category, deferredQ, page, sort],
  );

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void listMediaPickerCategoriesAction().then((response) => {
      if (cancelled) return;
      if (response.ok) setCategories(response.categories);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  function setSearchQuery(value: string) {
    setQ(value);
    setPage(1);
  }

  function setCategoryFilter(value: string) {
    setCategory(value);
    setPage(1);
  }

  function setSortOption(value: MediaPickerSort) {
    setSort(value);
    setPage(1);
  }

  function goToPage(nextPage: number) {
    setPage(Math.max(1, nextPage));
  }

  function refreshNewest() {
    setSort("newest");
    setPage(1);
    load({ sort: "newest", page: 1 });
  }

  return {
    q,
    deferredQ,
    category,
    sort,
    page,
    result,
    items: result.items as MediaPickerItem[],
    categories,
    error,
    pending,
    setSearchQuery,
    setCategoryFilter,
    setSortOption,
    goToPage,
    refreshNewest,
    reload: load,
  };
}
