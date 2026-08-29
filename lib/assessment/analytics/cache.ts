/**
 * Cache adapter for analytics.
 *
 * Public service signatures stay stable while the backing store evolves:
 * - today: in-process React `cache` (request memoization)
 * - ISR: callers use `revalidate` / `revalidateTag` at the page layer
 * - future Redis: swap the body of `cachedAnalytics` only
 */

import { cache as reactCache } from "react";

export type AnalyticsCacheKey = readonly unknown[];

type CacheableFn<TArgs extends unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

/**
 * Memoize an analytics loader for the current React request.
 * Does not change return types or organization scoping rules.
 */
export function cachedAnalytics<TArgs extends unknown[], TResult>(
  fn: CacheableFn<TArgs, TResult>,
): CacheableFn<TArgs, TResult> {
  return reactCache(fn);
}

/**
 * Reserved hook for future Redis / tag-based caching.
 * Currently executes the loader immediately.
 *
 * @param _key Stable cache key parts (organizationId first by convention)
 * @param loader Async producer
 */
export async function withAnalyticsCache<T>(
  _key: AnalyticsCacheKey,
  loader: () => Promise<T>,
): Promise<T> {
  return loader();
}
