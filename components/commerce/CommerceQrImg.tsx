/**
 * Scannable QR bitmap. Rounding/padding belongs on the frame, never the modules.
 */

type Props = {
  src: string;
  size: number;
  alt: string;
  className?: string;
};

export function CommerceQrImg({ src, size, alt, className = "" }: Props) {
  return (
    <span
      className={`commerce-qr-frame inline-flex bg-white p-2 ${className}`.trim()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="commerce-qr block bg-white"
        draggable={false}
      />
    </span>
  );
}
