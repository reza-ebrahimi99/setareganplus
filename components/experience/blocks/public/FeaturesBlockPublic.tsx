import type { FeaturesBlockConfig } from "@/lib/experience/blocks/features";
import type { ExperiencePublicBlockRendererProps } from "@/lib/experience/definition-types";
import { toPersianDigits } from "@/lib/persian";

export function FeaturesBlockPublic({
  config,
}: ExperiencePublicBlockRendererProps<FeaturesBlockConfig>) {
  return (
    <section className="rounded-3xl border border-border bg-surface px-6 py-10 sm:px-10">
      {config.title ? (
        <h2 className="text-xl font-bold text-primary sm:text-2xl">
          {config.title}
        </h2>
      ) : null}
      <ul className={`grid gap-4 sm:grid-cols-2 ${config.title ? "mt-8" : ""}`}>
        {config.items.map((item, index) => (
          <li
            key={`${item.title}-${index}`}
            className="rounded-2xl border border-border/80 bg-white/80 px-4 py-4"
          >
            <p className="text-sm font-semibold text-foreground">
              {toPersianDigits(String(index + 1))}. {item.title}
            </p>
            {item.description ? (
              <p className="mt-2 text-sm leading-7 text-muted">
                {item.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
