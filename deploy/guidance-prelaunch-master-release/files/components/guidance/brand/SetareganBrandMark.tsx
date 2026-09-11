import Image from "next/image";
import { SETAREGAN_LOGO } from "@/lib/guidance/brand/setaregan-logo";

export function SetareganBrandMark({
  size = 56,
  showWordmark = true,
  compact = false,
  className = "",
}: {
  size?: number;
  showWordmark?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`sg-brand-mark ${compact ? "sg-brand-mark--compact" : ""} ${className}`.trim()}>
      <Image
        src={SETAREGAN_LOGO.src}
        alt={SETAREGAN_LOGO.alt}
        width={size}
        height={size}
        className="sg-brand-mark__logo"
      />
      {showWordmark ? (
        <div className="sg-brand-mark__copy">
          <strong>{SETAREGAN_LOGO.institute}</strong>
          {compact ? null : <small>{SETAREGAN_LOGO.team}</small>}
        </div>
      ) : null}
    </div>
  );
}
