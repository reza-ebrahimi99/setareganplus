import { ShopProductCover } from "@/components/shop/ShopProductCover";

export function StarBookGallery({
  imageUrl,
  imageAlt,
  title,
  pageCount,
}: {
  imageUrl: string | null;
  imageAlt: string;
  title: string;
  pageCount: number | null;
}) {
  const previews = ["نمای جلد", "صفحه نمونه ۱", "صفحه نمونه ۲"];

  return (
    <div className="space-y-3">
      <div className="starbook-card overflow-hidden">
        <div className="starbook-cover !aspect-[3/4]">
          <ShopProductCover
            imageUrl={imageUrl}
            imageAlt={imageAlt}
            sizes="(max-width: 800px) 100vw, 480px"
            priority
          />
        </div>
      </div>
      <div className="starbook-gallery">
        {previews.map((label, index) => (
          <div key={label} className="starbook-preview" data-tone={index}>
            <p className="text-[11px] font-bold">{label}</p>
            <p className="mt-2 line-clamp-3 text-xs leading-6 text-[var(--sb-muted)]">
              {title}
            </p>
            {pageCount && index === 2 ? (
              <p className="mt-auto pt-3 text-[11px] text-[var(--sb-lime)]">
                {pageCount} صفحه
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
