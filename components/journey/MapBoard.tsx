import Link from "next/link";
import { stationPoints } from "@/lib/journey/catalog";

export type MapStation = {
  slug: string;
  title: string;
  book: string;
  state: "passed" | "now" | "locked";
  stars: number;
};

function Seal({ state, stars }: { state: MapStation["state"]; stars: number }) {
  if (state === "locked") {
    return (
      <span className="sj-seal" aria-hidden="true">
        <svg viewBox="0 0 16 16" className="sj-lock">
          <rect x="3" y="7" width="10" height="7" rx="1.4" fill="currentColor" />
          <path d="M5 7.2V5.2a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </span>
    );
  }
  return (
    <span className="sj-seal" aria-hidden="true">
      ★{state === "passed" && stars > 1 ? <i className="sj-count">{stars}</i> : null}
    </span>
  );
}

export function MapBoard({ stations }: { stations: MapStation[] }) {
  const pts = stationPoints(stations.length);
  return (
    <div className="sj-map">
      <img src="/journey/map.webp" alt="نقشهٔ کهنهٔ سفر" />
      {stations.map((s, i) => {
        const style = { left: `${pts[i].x}%`, top: `${pts[i].y}%` };
        const body = (
          <>
            {s.state === "now" && (
              <svg className="sj-walker" viewBox="0 0 24 40" aria-hidden="true">
                <circle cx="12" cy="7" r="4" fill="#3f2d1c" />
                <path d="M9 13h6l1.4 9h-2.1L15 36h-2.3l-.7-9h-1.2L10 36H7.7L8.3 22H6.4z" fill="#3f2d1c" />
              </svg>
            )}
            <Seal state={s.state} stars={s.stars} />
            {s.state === "now" && (
              <span className="sj-tag">
                <b>{s.title}</b>
                <small>کتاب {s.book} · اینجا</small>
              </span>
            )}
          </>
        );
        if (s.state === "now") {
          return (
            <Link key={s.slug} href="/safar/go" className="sj-pin now" style={style} aria-label={`ورود به نشان ${s.title}`}>
              {body}
            </Link>
          );
        }
        return (
          <div key={s.slug} className={`sj-pin ${s.state}`} style={style} aria-hidden="true">
            {body}
          </div>
        );
      })}
    </div>
  );
}
