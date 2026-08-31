/**
 * Editorial ink/gold marks for the counseling atelier.
 * Geometric, sparse — a private office, not clip-art.
 */

type MarkProps = { className?: string; title?: string };

function Frame({
  children,
  className,
  title,
}: MarkProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 220"
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {children}
    </svg>
  );
}

export function ConstellationMark(props: MarkProps) {
  return (
    <Frame {...props} title={props.title ?? "صورت‌فلکی مسیر"}>
      <ellipse cx="140" cy="118" rx="92" ry="62" fill="none" stroke="#b8944a" strokeOpacity="0.28" />
      <ellipse cx="140" cy="118" rx="58" ry="38" fill="none" stroke="#0b0f16" strokeOpacity="0.12" />
      <path
        d="M68 148 L112 86 L154 128 L198 64 L232 112"
        fill="none"
        stroke="#b8944a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="68" cy="148" r="4.5" fill="#0b0f16" />
      <circle cx="112" cy="86" r="6" fill="#b8944a" />
      <circle cx="154" cy="128" r="4" fill="#0b0f16" />
      <circle cx="198" cy="64" r="7" fill="#b8944a" />
      <circle cx="232" cy="112" r="4.5" fill="#0b0f16" />
      <circle cx="198" cy="64" r="14" fill="none" stroke="#b8944a" strokeOpacity="0.35" />
    </Frame>
  );
}

export function PortraitMark(props: MarkProps) {
  return (
    <Frame {...props} title={props.title ?? "پرتره پرونده"}>
      <rect x="78" y="28" width="124" height="164" rx="8" fill="none" stroke="#0b0f16" strokeOpacity="0.18" />
      <rect x="88" y="38" width="104" height="144" rx="4" fill="#faf6ee" stroke="#b8944a" strokeOpacity="0.45" />
      <circle cx="140" cy="92" r="22" fill="none" stroke="#0b0f16" strokeWidth="1.4" />
      <path d="M108 158 C108 132 172 132 172 158" fill="none" stroke="#0b0f16" strokeWidth="1.4" />
      <path d="M78 28 L62 18" stroke="#b8944a" strokeWidth="1.2" />
      <path d="M202 28 L218 18" stroke="#b8944a" strokeWidth="1.2" />
    </Frame>
  );
}

export function LampMark(props: MarkProps) {
  return (
    <Frame {...props} title={props.title ?? "چراغ میز مهندس"}>
      <path d="M40 188 H240" stroke="#0b0f16" strokeOpacity="0.2" />
      <rect x="108" y="168" width="64" height="8" rx="2" fill="#0b0f16" fillOpacity="0.75" />
      <path d="M140 168 V96" stroke="#0b0f16" strokeWidth="2" />
      <path d="M140 96 L188 64" stroke="#0b0f16" strokeWidth="2" />
      <path d="M168 52 L208 78 L196 92 L156 66 Z" fill="#b8944a" fillOpacity="0.85" />
      <ellipse cx="198" cy="132" rx="46" ry="18" fill="#b8944a" fillOpacity="0.12" />
      <rect x="58" y="148" width="52" height="36" rx="3" fill="none" stroke="#0b0f16" strokeOpacity="0.25" />
    </Frame>
  );
}

export function ChairMark(props: MarkProps) {
  return (
    <Frame {...props} title={props.title ?? "صندلی خالی گفتگو"}>
      <path d="M50 188 H230" stroke="#0b0f16" strokeOpacity="0.16" />
      <rect x="96" y="78" width="88" height="54" rx="8" fill="none" stroke="#0b0f16" strokeWidth="1.6" />
      <rect x="102" y="132" width="76" height="12" rx="3" fill="#b8944a" fillOpacity="0.35" />
      <path d="M110 144 V188" stroke="#0b0f16" strokeWidth="1.6" />
      <path d="M170 144 V188" stroke="#0b0f16" strokeWidth="1.6" />
      <circle cx="140" cy="58" r="10" fill="none" stroke="#b8944a" strokeWidth="1.4" />
    </Frame>
  );
}

export function EnvelopeMark(props: MarkProps) {
  return (
    <Frame {...props} title={props.title ?? "نامه مشاور"}>
      <rect x="56" y="64" width="168" height="108" rx="6" fill="#faf6ee" stroke="#0b0f16" strokeOpacity="0.22" />
      <path d="M56 70 L140 128 L224 70" fill="none" stroke="#b8944a" strokeWidth="1.5" />
      <path d="M56 172 L112 124" stroke="#0b0f16" strokeOpacity="0.18" />
      <path d="M224 172 L168 124" stroke="#0b0f16" strokeOpacity="0.18" />
      <circle cx="140" cy="118" r="8" fill="#b8944a" />
    </Frame>
  );
}

export function ScoresMark(props: MarkProps) {
  return (
    <Frame {...props} title={props.title ?? "نقشه توانایی‌ها"}>
      <path d="M48 168 H232" stroke="#0b0f16" strokeOpacity="0.16" />
      <path d="M48 168 V48" stroke="#0b0f16" strokeOpacity="0.16" />
      <path
        d="M70 142 L102 108 L128 120 L164 72 L196 96 L226 58"
        fill="none"
        stroke="#b8944a"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="94" y="108" width="16" height="60" rx="2" fill="#0b0f16" fillOpacity="0.08" />
      <rect x="156" y="72" width="16" height="96" rx="2" fill="#b8944a" fillOpacity="0.35" />
      <rect x="218" y="58" width="16" height="110" rx="2" fill="#b8944a" fillOpacity="0.55" />
    </Frame>
  );
}

export function SealMark(props: MarkProps) {
  return (
    <Frame {...props} title={props.title ?? "مهر سند"}>
      <rect x="84" y="42" width="112" height="148" rx="4" fill="#faf6ee" stroke="#0b0f16" strokeOpacity="0.2" />
      <path d="M84 62 H196" stroke="#b8944a" strokeOpacity="0.45" />
      <path d="M102 88 H178" stroke="#0b0f16" strokeOpacity="0.12" />
      <path d="M102 104 H162" stroke="#0b0f16" strokeOpacity="0.12" />
      <path d="M102 120 H170" stroke="#0b0f16" strokeOpacity="0.12" />
      <circle cx="140" cy="158" r="16" fill="none" stroke="#b8944a" strokeWidth="1.6" />
      <circle cx="140" cy="158" r="6" fill="#b8944a" />
    </Frame>
  );
}

export function CompassMark(props: MarkProps) {
  return (
    <Frame {...props} title={props.title ?? "قطب‌نمای رغبت"}>
      <circle cx="140" cy="112" r="72" fill="none" stroke="#0b0f16" strokeOpacity="0.16" />
      <circle cx="140" cy="112" r="48" fill="none" stroke="#b8944a" strokeOpacity="0.45" />
      <path d="M140 52 V72" stroke="#0b0f16" />
      <path d="M140 152 V172" stroke="#0b0f16" />
      <path d="M80 112 H100" stroke="#0b0f16" />
      <path d="M180 112 H200" stroke="#0b0f16" />
      <path d="M140 112 L158 78 L140 122 L118 148 Z" fill="#b8944a" />
      <path d="M140 112 L122 146 L140 102 L162 76 Z" fill="#0b0f16" fillOpacity="0.75" />
    </Frame>
  );
}

export function UnfinishedMark(props: MarkProps) {
  return (
    <Frame {...props} title={props.title ?? "تصویر ناتمام"}>
      <circle cx="140" cy="110" r="70" fill="none" stroke="#0b0f16" strokeOpacity="0.12" strokeDasharray="6 8" />
      <path d="M88 128 L120 92 L148 118" fill="none" stroke="#b8944a" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="88" cy="128" r="4" fill="#0b0f16" />
      <circle cx="120" cy="92" r="5" fill="#b8944a" />
      <circle cx="176" cy="84" r="4" fill="none" stroke="#b8944a" />
      <circle cx="208" cy="132" r="4" fill="none" stroke="#0b0f16" strokeOpacity="0.3" />
    </Frame>
  );
}
