-- Per-slide cinematic framing: tablet focus + breakpoint zoom scales

ALTER TABLE "achievements"
ADD COLUMN "tabletFocusX" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "tabletFocusY" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "desktopZoom" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "tabletZoom" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "mobileZoom" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- Sensible backfill: tablet mirrors desktop focus; zooms stay at 1
UPDATE "achievements"
SET
  "tabletFocusX" = "desktopFocusX",
  "tabletFocusY" = "desktopFocusY",
  "desktopZoom" = 1,
  "tabletZoom" = 1,
  "mobileZoom" = 1;
