import { IconTile } from "./IconTile";
import { toPersianDigits } from "@/lib/persian";

type TrustItemProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

export function TrustItem({ title, description, icon }: TrustItemProps) {
  return (
    <article className="premium-card p-5">
      <IconTile icon={icon}>
        <h3 className="text-sm font-semibold text-primary">
          {toPersianDigits(title)}
        </h3>
        <p className="mt-1 text-sm leading-7 text-muted">
          {toPersianDigits(description)}
        </p>
      </IconTile>
    </article>
  );
}
