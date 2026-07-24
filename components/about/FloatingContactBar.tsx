import Link from "next/link";
import {
  InstagramIcon,
  MapPinIcon,
  PhoneIcon,
} from "@/components/ui/ContactIcons";
import { ClipboardIcon, MessageIcon } from "@/components/icons";
import { aboutFloatingBarContent } from "@/content/about-page";

function BarIcon({ id }: { id: string }) {
  switch (id) {
    case "call":
      return <PhoneIcon className="size-4" />;
    case "map":
      return <MapPinIcon className="size-4" />;
    case "instagram":
      return <InstagramIcon className="size-4" />;
    case "bale":
      return <MessageIcon className="size-4" />;
    case "register":
      return <ClipboardIcon className="size-4" />;
    default:
      return null;
  }
}

/**
 * Fixed bottom contact bar — public marketing pages only (e.g. About).
 * Do not mount on registration / consultation / admin / portal form surfaces.
 * Leaves safe-area padding for notched devices.
 */
export function FloatingContactBar() {
  const { items } = aboutFloatingBarContent;

  return (
    <nav
      aria-label="دسترسی سریع تماس و ثبت‌نام"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgb(15_23_42/0.08)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-0.5 px-1 py-1.5">
        {items.map((item) => {
          const className =
            item.id === "register"
              ? "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-secondary/15 px-1 text-[0.65rem] font-medium text-primary transition-colors hover:bg-secondary/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              : "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.65rem] font-medium text-muted transition-colors hover:bg-background hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

          const isHttp = item.href.startsWith("http");

          if (item.external) {
            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  {...(isHttp
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={className}
                >
                  <BarIcon id={item.id} />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          }

          return (
            <li key={item.id}>
              <Link href={item.href} className={className}>
                <BarIcon id={item.id} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
