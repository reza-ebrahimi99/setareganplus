/**
 * LOCAL compile shim for Holland result types.
 * Production already has the real scoring implementation.
 * NEVER copy this file to production.
 */

import type { HollandType } from "@/lib/guidance/journey-v2/holland/profiles";

export type HollandScore = {
  type: HollandType;
  raw: number;
  normalized: number;
};

export type HollandResult = {
  code: string;
  scores: HollandScore[];
  completedAtIso?: string;
};
