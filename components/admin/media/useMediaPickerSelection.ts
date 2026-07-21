"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  MediaPickerItem,
  MediaPickerMode,
} from "@/components/admin/media/media-picker-types";

type UseMediaPickerSelectionOptions = {
  mode: MediaPickerMode;
  selectedIds?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  /** Seed cache when opening with known selected items (e.g. field preview). */
  initialItems?: MediaPickerItem[];
  open: boolean;
};

export function useMediaPickerSelection({
  mode,
  selectedIds,
  excludeIds,
  maxSelection,
  initialItems,
  open,
}: UseMediaPickerSelectionOptions) {
  const excludeSet = useMemo(
    () => new Set(excludeIds ?? []),
    [excludeIds],
  );

  const effectiveMax =
    mode === "single" ? 1 : (maxSelection ?? Number.POSITIVE_INFINITY);

  const [ids, setIds] = useState<string[]>([]);
  const [itemMap, setItemMap] = useState<Map<string, MediaPickerItem>>(
    () => new Map(),
  );
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [seededForOpen, setSeededForOpen] = useState(false);

  if (open && !seededForOpen) {
    const nextIds = selectedIds ?? [];
    setIds(nextIds);
    setLimitMessage(null);
    const next = new Map<string, MediaPickerItem>();
    for (const item of initialItems ?? []) {
      next.set(item.id, item);
    }
    setItemMap(next);
    setSeededForOpen(true);
  } else if (!open && seededForOpen) {
    setSeededForOpen(false);
  }

  const remember = useCallback((item: MediaPickerItem) => {
    setItemMap((current) => {
      if (current.get(item.id) === item) return current;
      const next = new Map(current);
      next.set(item.id, item);
      return next;
    });
  }, []);

  const rememberMany = useCallback((items: MediaPickerItem[]) => {
    if (items.length === 0) return;
    setItemMap((current) => {
      const next = new Map(current);
      for (const item of items) next.set(item.id, item);
      return next;
    });
  }, []);

  const isExcluded = useCallback(
    (id: string) => excludeSet.has(id),
    [excludeSet],
  );

  const isSelected = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback(
    (item: MediaPickerItem) => {
      if (excludeSet.has(item.id)) return;
      remember(item);
      setIds((current) => {
        const selected = current.includes(item.id);
        if (mode === "single") {
          setLimitMessage(null);
          return selected ? [] : [item.id];
        }
        if (selected) {
          setLimitMessage(null);
          return current.filter((id) => id !== item.id);
        }
        if (current.length >= effectiveMax) {
          setLimitMessage(
            Number.isFinite(effectiveMax)
              ? `حداکثر ${effectiveMax} تصویر قابل انتخاب است.`
              : "سقف انتخاب پر شده است.",
          );
          return current;
        }
        setLimitMessage(null);
        return [...current, item.id];
      });
    },
    [effectiveMax, excludeSet, mode, remember],
  );

  const clear = useCallback(() => {
    setIds([]);
    setLimitMessage(null);
  }, []);

  const selectMany = useCallback(
    (items: MediaPickerItem[]) => {
      const allowed = items.filter((item) => !excludeSet.has(item.id));
      rememberMany(allowed);
      setIds((current) => {
        if (mode === "single") {
          const first = allowed[0];
          setLimitMessage(null);
          return first ? [first.id] : [];
        }
        const merged = [...current];
        for (const item of allowed) {
          if (merged.includes(item.id)) continue;
          if (merged.length >= effectiveMax) {
            setLimitMessage(
              Number.isFinite(effectiveMax)
                ? `حداکثر ${effectiveMax} تصویر قابل انتخاب است.`
                : "سقف انتخاب پر شده است.",
            );
            break;
          }
          merged.push(item.id);
        }
        return merged;
      });
    },
    [effectiveMax, excludeSet, mode, rememberMany],
  );

  const selectedItems = useMemo(() => {
    const items: MediaPickerItem[] = [];
    for (const id of ids) {
      const item = itemMap.get(id);
      if (item) items.push(item);
    }
    return items;
  }, [ids, itemMap]);

  return {
    selectedIds: ids,
    selectedItems,
    selectedCount: ids.length,
    maxSelection: effectiveMax,
    limitMessage,
    isExcluded,
    isSelected,
    toggle,
    clear,
    selectMany,
    rememberMany,
  };
}
