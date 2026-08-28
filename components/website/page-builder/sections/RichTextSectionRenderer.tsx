import type { SectionMediaMap } from "@/lib/website/page-builder/registry";
import type { RichTextSectionConfig } from "@/lib/website/page-builder/types";

type Props = {
  config: RichTextSectionConfig;
  media: SectionMediaMap;
};

const widthClass: Record<RichTextSectionConfig["maxWidth"], string> = {
  prose: "max-w-2xl",
  wide: "max-w-4xl",
  full: "max-w-6xl",
};

export function RichTextSectionRenderer({ config }: Props) {
  const alignClass =
    config.textAlign === "center" ? "text-center mx-auto" : "text-start";

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className={`${widthClass[config.maxWidth]} ${alignClass}`}>
        {config.title ? (
          <h2 className="mb-4 text-2xl font-bold text-primary sm:text-3xl">
            {config.title}
          </h2>
        ) : null}
        <div className="whitespace-pre-line text-base leading-8 text-foreground">
          {config.body}
        </div>
      </div>
    </section>
  );
}
