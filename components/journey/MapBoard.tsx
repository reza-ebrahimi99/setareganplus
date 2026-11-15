import { stationPoints } from "@/lib/journey/catalog";

export type MapStation = {
  slug: string;
  title: string;
  book: string;
  state: "passed" | "now" | "locked";
  stars: number;
};

export function MapBoard({ stations }: { stations: MapStation[] }) {
  const pts = stationPoints(stations.length);
  const showAll = stations.length <= 6;
  return (
    <div className="sj-map">
      <img src="/journey/map.webp" alt="نقشهٔ کهنهٔ سفر" />
      {stations.map((s, i) => {
        const labeled = showAll || s.state === "now" || stations[i - 1]?.state === "now" || stations[i + 1]?.state === "now";
        const side = i % 2 === 0 ? "right" : "left";
        return (
          <div key={s.slug} className={`sj-pin ${s.state}`} style={{ left: `${pts[i].x}%`, top: `${pts[i].y}%` }}>
            {s.state === "now" && (
              <svg className="sj-walker" viewBox="0 0 24 40" aria-hidden="true">
                <circle cx="12" cy="7" r="4" fill="#3f2d1c" />
                <path d="M9 13h6l1.4 9h-2.1L15 36h-2.3l-.7-9h-1.2L10 36H7.7L8.3 22H6.4z" fill="#3f2d1c" />
              </svg>
            )}
            <span className="sj-seal">{s.state === "locked" ? "·" : "★"}</span>
            {labeled && (
              <span className={`sj-tag ${side}`}>
                <b>{s.title}</b>
                <small>
                  کتاب {s.book}
                  {s.state === "now" ? " · اینجا" : s.state === "locked" ? " · بسته" : <span className="stars"> {"★".repeat(s.stars)}{"☆".repeat(Math.max(0, 3 - s.stars))}</span>}
                </small>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
