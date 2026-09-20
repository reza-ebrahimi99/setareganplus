import assert from "node:assert/strict";
import {
  computeBreakRanges,
  computeGapRanges,
  unionWorkingHours,
} from "../lib/counselor-os/timeline-compute";

const breaks = computeBreakRanges([
  { startLocalTime: "09:00", endLocalTime: "12:00" },
  { startLocalTime: "13:00", endLocalTime: "17:00" },
]);
assert.equal(breaks.length, 1);
assert.equal(breaks[0]?.start, 12 * 60);
assert.equal(breaks[0]?.end, 13 * 60);

const gaps = computeGapRanges({
  working: unionWorkingHours([
    { startLocalTime: "09:00", endLocalTime: "17:00" },
  ]),
  occupied: [{ start: 10 * 60, end: 11 * 60 }],
  breaks: [],
  openSlots: [],
  minGapMinutes: 30,
});
assert.ok(gaps.length >= 1);

console.log("counselor timeline compute unit tests passed");
