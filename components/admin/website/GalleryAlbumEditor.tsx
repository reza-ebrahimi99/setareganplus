"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  addGalleryAlbumItemsAction,
  reorderGalleryAlbumItemsAction,
  removeGalleryAlbumItemAction,
  updateGalleryAlbumAction,
  updateGalleryAlbumItemAction,
  deleteGalleryAlbumAction,
  type GalleryActionState,
} from "@/app/admin/(dashboard)/website/gallery/actions";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import type { MediaPickerItem } from "@/components/admin/media/media-picker-types";

const emptyState: GalleryActionState = {};
const GALLERY_ADD_MAX = 50;

type AlbumItem = {
  id: string;
  mediaId: string;
  caption: string | null;
  sortOrder: number;
  mediaActive: boolean;
  title: string | null;
  altText: string | null;
  category: string | null;
  url: string;
  width: number | null;
  height: number | null;
};

type GalleryAlbumEditorProps = {
  album: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    sortOrder: number;
    publishedAt: Date | null;
    coverMediaId: string | null;
    items: AlbumItem[];
  };
};

function toDateInput(value: Date | null): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function GalleryAlbumEditor({ album }: GalleryAlbumEditorProps) {
  const router = useRouter();
  const [items, setItems] = useState(album.items);
  const [itemsSource, setItemsSource] = useState(album.items);
  if (album.items !== itemsSource) {
    setItemsSource(album.items);
    setItems(album.items);
  }
  const [dragId, setDragId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(
    updateGalleryAlbumAction,
    emptyState,
  );
  const [addState, addAction, addPending] = useActionState(
    addGalleryAlbumItemsAction,
    emptyState,
  );
  const [reorderState, reorderAction, reorderPending] = useActionState(
    reorderGalleryAlbumItemsAction,
    emptyState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteGalleryAlbumAction,
    emptyState,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!addState.successMessage) return;
    router.refresh();
  }, [addState.successMessage, router]);

  const excludeIds = useMemo(
    () => items.map((item) => item.mediaId),
    [items],
  );

  function moveItem(fromId: string, toId: string) {
    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === fromId);
      const toIndex = current.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((item, index) => ({ ...item, sortOrder: index }));
    });
  }

  function handlePickerConfirm(selected: MediaPickerItem[]) {
    if (selected.length === 0) return;
    const formData = new FormData();
    formData.set("albumId", album.id);
    for (const item of selected.slice(0, GALLERY_ADD_MAX)) {
      formData.append("mediaIds", item.id);
    }
    startTransition(() => {
      addAction(formData);
    });
  }

  return (
    <div className="space-y-6">
      {(updateState.formError ||
        addState.formError ||
        reorderState.formError ||
        deleteState.formError) && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800"
        >
          {updateState.formError ||
            addState.formError ||
            reorderState.formError ||
            deleteState.formError}
        </div>
      )}
      {(updateState.successMessage ||
        addState.successMessage ||
        reorderState.successMessage ||
        deleteState.successMessage) && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-900"
        >
          {updateState.successMessage ||
            addState.successMessage ||
            reorderState.successMessage ||
            deleteState.successMessage}
        </div>
      )}

      <form action={updateAction} className="admin-card space-y-3 p-4">
        <input type="hidden" name="albumId" value={album.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">عنوان</span>
            <input
              name="title"
              defaultValue={album.title}
              required
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">اسلاگ</span>
            <input
              name="slug"
              defaultValue={album.slug}
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
              dir="ltr"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block text-muted">توضیح</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={album.description ?? ""}
              className="w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">ترتیب</span>
            <input
              name="sortOrder"
              type="number"
              defaultValue={album.sortOrder}
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">تاریخ انتشار</span>
            <input
              name="publishedAt"
              type="date"
              defaultValue={toDateInput(album.publishedAt)}
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted">کاور (شناسه رسانه)</span>
            <select
              name="coverMediaId"
              defaultValue={album.coverMediaId ?? ""}
              className="min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2.5"
            >
              <option value="">بدون کاور</option>
              {items.map((item) => (
                <option key={item.mediaId} value={item.mediaId}>
                  {item.title || item.altText || item.mediaId}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={album.isActive}
              className="size-4 rounded border-border"
            />
            <span>آلبوم فعال باشد</span>
          </label>
        </div>
        <button
          type="submit"
          disabled={updatePending}
          className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {updatePending ? "در حال ذخیره…" : "ذخیره آلبوم"}
        </button>
      </form>

      <section className="admin-card space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-primary">تصاویر آلبوم</h2>
          <form action={reorderAction}>
            <input type="hidden" name="albumId" value={album.id} />
            {items.map((item) => (
              <input
                key={item.id}
                type="hidden"
                name="itemIds"
                value={item.id}
              />
            ))}
            <button
              type="submit"
              disabled={reorderPending || items.length === 0}
              className="min-h-11 rounded-xl border border-border bg-white px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {reorderPending ? "در حال ذخیره ترتیب…" : "ذخیره ترتیب فعلی"}
            </button>
          </form>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted">هنوز تصویری به این آلبوم اضافه نشده است.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDragId(item.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragId) moveItem(dragId, item.id);
                  setDragId(null);
                }}
                className="flex flex-col gap-3 rounded-xl border border-border bg-white p-3 sm:flex-row sm:items-start"
              >
                <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-primary/[0.03]">
                  <Image
                    src={item.url}
                    alt={item.altText || item.title || "تصویر آلبوم"}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-medium text-primary">
                    {item.title || "بدون عنوان"}
                    {!item.mediaActive ? (
                      <span className="ms-2 text-xs text-red-700">
                        (غیرفعال/حذف‌شده)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    برای جابه‌جایی بکشید و رها کنید
                  </p>
                  <form
                    action={updateGalleryAlbumItemAction}
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <input type="hidden" name="itemId" value={item.id} />
                    <input
                      name="caption"
                      defaultValue={item.caption ?? ""}
                      placeholder="زیرنویس"
                      className="min-h-11 flex-1 rounded-xl border border-border px-3 py-2.5 text-sm"
                    />
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl border border-border px-3 text-sm"
                    >
                      ذخیره زیرنویس
                    </button>
                  </form>
                </div>
                <form
                  action={removeGalleryAlbumItemAction}
                  onSubmit={() => {
                    startTransition(() => {
                      setItems((current) =>
                        current.filter((row) => row.id !== item.id),
                      );
                    });
                  }}
                >
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-3 text-sm text-red-800"
                  >
                    حذف از آلبوم
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card space-y-3 p-4">
        <h2 className="text-sm font-semibold text-primary">
          افزودن از کتابخانه رسانه
        </h2>
        <p className="text-xs leading-6 text-muted">
          تا {GALLERY_ADD_MAX} تصویر را در هر نوبت از کتابخانه انتخاب کنید.
          تصاویر موجود در آلبوم در انتخاب‌گر غیرفعال می‌شوند.
        </p>
        <button
          type="button"
          disabled={addPending}
          onClick={() => setPickerOpen(true)}
          className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {addPending ? "در حال افزودن…" : "انتخاب تصاویر از کتابخانه"}
        </button>
      </section>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        mode="multiple"
        excludeIds={excludeIds}
        maxSelection={GALLERY_ADD_MAX}
        allowUpload
        title="افزودن تصویر به آلبوم"
        confirmLabel="افزودن به آلبوم"
        onConfirm={handlePickerConfirm}
      />

      <form action={deleteAction} className="admin-card p-4">
        <input type="hidden" name="albumId" value={album.id} />
        <p className="text-sm leading-7 text-muted">
          حذف آلبوم فقط وقتی مجاز است که در هیچ MediaPlacement استفاده نشده باشد.
        </p>
        <button
          type="submit"
          disabled={deletePending}
          className="mt-3 min-h-11 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800 disabled:opacity-60"
        >
          {deletePending ? "در حال حذف…" : "حذف آلبوم"}
        </button>
      </form>
    </div>
  );
}
