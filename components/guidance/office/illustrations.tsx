/** Atmospheric ink-and-gold scenes. Not UI icons. */

type MarkProps = { className?: string; title?: string };

function Scene({
  children,
  className,
  title,
}: MarkProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 520 400"
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
    <Scene {...props} title={props.title ?? "صورت‌فلکی مسیر"}>
      <ellipse cx="270" cy="210" rx="190" ry="128" fill="none" stroke="#c4a05a" strokeOpacity="0.18" />
      <ellipse cx="270" cy="210" rx="118" ry="78" fill="none" stroke="#0a0d13" strokeOpacity="0.1" />
      <path
        d="M90 268 L168 142 L248 228 L338 88 L430 190 L470 150"
        fill="none"
        stroke="#c4a05a"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="90" cy="268" r="5" fill="#0a0d13" />
      <circle cx="168" cy="142" r="7" fill="#c4a05a" />
      <circle cx="248" cy="228" r="5" fill="#0a0d13" />
      <circle cx="338" cy="88" r="9" fill="#c4a05a" />
      <circle cx="338" cy="88" r="22" fill="none" stroke="#c4a05a" strokeOpacity="0.35" />
      <circle cx="430" cy="190" r="5.5" fill="#0a0d13" />
      <circle cx="470" cy="150" r="4" fill="#c4a05a" />
    </Scene>
  );
}

export function PortraitMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "طرح پرتره"}>
      <rect x="148" y="36" width="224" height="308" rx="2" fill="none" stroke="#0a0d13" strokeOpacity="0.2" />
      <rect x="168" y="56" width="184" height="268" fill="#f4eee0" stroke="#c4a05a" strokeOpacity="0.4" />
      <circle cx="260" cy="148" r="38" fill="none" stroke="#0a0d13" strokeWidth="1.5" />
      <path d="M198 268 C198 214 322 214 322 268" fill="none" stroke="#0a0d13" strokeWidth="1.5" />
      <path d="M148 36 L118 18" stroke="#c4a05a" />
      <path d="M372 36 L402 18" stroke="#c4a05a" />
      <path d="M188 92 H332" stroke="#c4a05a" strokeOpacity="0.25" />
    </Scene>
  );
}

export function BooksMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "کتاب و کارنامه"}>
      <rect x="86" y="168" width="92" height="148" rx="2" fill="#0a0d13" fillOpacity="0.78" />
      <rect x="186" y="128" width="88" height="188" rx="2" fill="#c4a05a" fillOpacity="0.55" />
      <rect x="282" y="156" width="96" height="160" rx="2" fill="#0a0d13" fillOpacity="0.5" />
      <rect x="330" y="78" width="118" height="86" rx="2" fill="#f4eee0" stroke="#0a0d13" strokeOpacity="0.22" transform="rotate(-8 390 121)" />
      <path d="M348 102 L430 90" stroke="#c4a05a" strokeOpacity="0.5" transform="rotate(-8 390 121)" />
      <path d="M70 328 H460" stroke="#0a0d13" strokeOpacity="0.18" />
    </Scene>
  );
}

export function ScoresMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "صورت‌فلکی نمرات"}>
      <path d="M64 312 H456" stroke="#0a0d13" strokeOpacity="0.14" />
      <path d="M64 312 V72" stroke="#0a0d13" strokeOpacity="0.14" />
      <path
        d="M96 248 L156 188 L214 214 L278 118 L348 164 L428 86"
        fill="none"
        stroke="#c4a05a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="96" cy="248" r="5" fill="#0a0d13" />
      <circle cx="156" cy="188" r="6" fill="#c4a05a" />
      <circle cx="214" cy="214" r="5" fill="#0a0d13" />
      <circle cx="278" cy="118" r="8" fill="#c4a05a" />
      <circle cx="278" cy="118" r="20" fill="none" stroke="#c4a05a" strokeOpacity="0.3" />
      <circle cx="348" cy="164" r="5" fill="#0a0d13" />
      <circle cx="428" cy="86" r="7" fill="#c4a05a" />
    </Scene>
  );
}

export function SealMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "مهر طلایی"}>
      <rect x="156" y="48" width="208" height="292" rx="3" fill="#f4eee0" stroke="#0a0d13" strokeOpacity="0.18" />
      <path d="M156 84 H364" stroke="#c4a05a" strokeOpacity="0.45" />
      <path d="M188 128 H328" stroke="#0a0d13" strokeOpacity="0.1" />
      <path d="M188 152 H300" stroke="#0a0d13" strokeOpacity="0.1" />
      <path d="M188 176 H318" stroke="#0a0d13" strokeOpacity="0.1" />
      <path d="M364 48 L430 18 L430 118 L364 88 Z" fill="#c4a05a" />
      <circle cx="260" cy="268" r="38" fill="none" stroke="#c4a05a" strokeWidth="2" />
      <circle cx="260" cy="268" r="14" fill="#c4a05a" />
      <path d="M260 238 V258 M260 278 V298 M230 268 H250 M270 268 H290" stroke="#c4a05a" strokeOpacity="0.7" />
    </Scene>
  );
}

export function RibbonMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "روبان طلایی سند"}>
      <rect x="132" y="36" width="248" height="328" fill="#faf7f0" stroke="#111111" strokeOpacity="0.16" />
      <path d="M132 78 H380" stroke="#b08d4a" strokeWidth="10" />
      <path d="M380 36 L456 8 L456 132 L380 96 Z" fill="#b08d4a" />
      <path d="M168 128 H344 M168 156 H300 M168 184 H328 M168 212 H288" stroke="#111111" strokeOpacity="0.12" />
      <circle cx="260" cy="292" r="28" fill="none" stroke="#b08d4a" strokeWidth="1.6" />
      <circle cx="260" cy="292" r="8" fill="#b08d4a" />
    </Scene>
  );
}

export function WaxMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "پوشه و مُهر موم"}>
      <rect x="86" y="92" width="168" height="228" fill="#111111" fillOpacity="0.82" />
      <rect x="118" y="64" width="168" height="228" fill="#b08d4a" fillOpacity="0.55" />
      <rect x="154" y="88" width="196" height="244" fill="#faf7f0" stroke="#111111" strokeOpacity="0.18" />
      <path d="M154 128 H350" stroke="#b08d4a" />
      <circle cx="252" cy="248" r="36" fill="#7a3a2e" />
      <circle cx="252" cy="248" r="22" fill="none" stroke="#faf7f0" strokeOpacity="0.55" />
    </Scene>
  );
}

export function SignatureMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "امضای دست‌نویس"}>
      <path d="M70 286 H450" stroke="#111111" strokeOpacity="0.14" />
      <path
        d="M96 248 C140 200 168 312 232 236 C268 196 286 268 348 228 C392 204 422 188 448 176"
        fill="none"
        stroke="#111111"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M188 268 C210 252 238 280 262 258" fill="none" stroke="#b08d4a" strokeWidth="1.2" />
    </Scene>
  );
}

export function CompassMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "قطب‌نمای روشن"}>
      <circle cx="260" cy="200" r="132" fill="none" stroke="#0a0d13" strokeOpacity="0.12" />
      <circle cx="260" cy="200" r="88" fill="none" stroke="#c4a05a" strokeOpacity="0.55" />
      <circle cx="260" cy="200" r="88" fill="#c4a05a" fillOpacity="0.06" />
      <path d="M260 80 V118 M260 282 V320 M140 200 H178 M342 200 H380" stroke="#0a0d13" strokeOpacity="0.35" />
      <path d="M260 200 L298 128 L260 216 L214 268 Z" fill="#c4a05a" />
      <path d="M260 200 L222 272 L260 184 L306 132 Z" fill="#0a0d13" fillOpacity="0.8" />
      <circle cx="260" cy="200" r="7" fill="#f4eee0" stroke="#c4a05a" />
    </Scene>
  );
}

export function ChairMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "صندلی چرم خالی"}>
      <path d="M70 338 H450" stroke="#0a0d13" strokeOpacity="0.14" />
      <rect x="168" y="118" width="184" height="108" rx="10" fill="none" stroke="#0a0d13" strokeWidth="2" />
      <path d="M178 226 H342" stroke="#c4a05a" strokeWidth="10" strokeLinecap="round" />
      <path d="M196 232 V338 M340 232 V338" stroke="#0a0d13" strokeWidth="2.2" />
      <path d="M168 138 H352" stroke="#0a0d13" strokeOpacity="0.15" />
      <ellipse cx="260" cy="86" rx="16" ry="10" fill="none" stroke="#c4a05a" />
      <ellipse cx="300" cy="300" rx="90" ry="16" fill="#c4a05a" fillOpacity="0.08" />
    </Scene>
  );
}

export function LampMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "چراغ میز"}>
      <path d="M60 342 H460" stroke="#0a0d13" strokeOpacity="0.14" />
      <rect x="210" y="312" width="100" height="12" rx="2" fill="#0a0d13" fillOpacity="0.75" />
      <path d="M260 312 V168" stroke="#0a0d13" strokeWidth="2.4" />
      <path d="M260 168 L348 108" stroke="#0a0d13" strokeWidth="2.4" />
      <path d="M318 86 L392 138 L368 162 L294 110 Z" fill="#c4a05a" />
      <ellipse cx="372" cy="232" rx="88" ry="28" fill="#c4a05a" fillOpacity="0.14" />
      <rect x="96" y="268" width="86" height="54" rx="2" fill="none" stroke="#0a0d13" strokeOpacity="0.22" />
    </Scene>
  );
}

export function EnvelopeMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "نامه مشاور"}>
      <rect x="98" y="112" width="324" height="188" rx="4" fill="#f4eee0" stroke="#0a0d13" strokeOpacity="0.18" />
      <path d="M98 122 L260 228 L422 122" fill="none" stroke="#c4a05a" strokeWidth="1.7" />
      <circle cx="260" cy="210" r="16" fill="#c4a05a" />
      <path d="M98 300 L196 214 M422 300 L324 214" stroke="#0a0d13" strokeOpacity="0.12" />
    </Scene>
  );
}

export function SignedMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "سند امضاشده"}>
      <rect x="132" y="44" width="256" height="312" fill="#f4eee0" stroke="#0a0d13" strokeOpacity="0.16" />
      <path d="M132 82 H388" stroke="#c4a05a" />
      <path d="M164 128 H356" stroke="#0a0d13" strokeOpacity="0.1" />
      <path d="M164 152 H320" stroke="#0a0d13" strokeOpacity="0.1" />
      <path d="M164 176 H340" stroke="#0a0d13" strokeOpacity="0.1" />
      <path d="M220 268 C248 248 280 288 318 252" fill="none" stroke="#0a0d13" strokeWidth="1.6" />
      <circle cx="340" cy="300" r="22" fill="none" stroke="#c4a05a" strokeWidth="1.8" />
    </Scene>
  );
}

export function UnfinishedMark(props: MarkProps) {
  return (
    <Scene {...props} title={props.title ?? "صورت‌فلکی ناتمام"}>
      <circle cx="260" cy="200" r="128" fill="none" stroke="#0a0d13" strokeOpacity="0.12" strokeDasharray="7 10" />
      <path d="M140 236 L210 156 L268 208" fill="none" stroke="#c4a05a" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="140" cy="236" r="5" fill="#0a0d13" />
      <circle cx="210" cy="156" r="6" fill="#c4a05a" />
      <circle cx="330" cy="148" r="5" fill="none" stroke="#c4a05a" />
      <circle cx="390" cy="230" r="5" fill="none" stroke="#0a0d13" strokeOpacity="0.28" />
    </Scene>
  );
}
