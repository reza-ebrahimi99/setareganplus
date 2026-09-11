/**
 * Unique public slug for canonical BookSku.
 */

export function slugifyBookSku(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function allocateUniqueBookSkuSlug(params: {
  organizationId: string;
  desired: string;
  excludeSkuId?: string;
  exists: (slug: string) => Promise<boolean>;
}): Promise<string> {
  const base = slugifyBookSku(params.desired) || `erp-${Date.now().toString(36)}`;
  let candidate = base;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const taken = await params.exists(candidate);
    if (!taken) return candidate;
    candidate = `${base}-${attempt + 2}`.slice(0, 80);
  }
  return `${base}-${params.excludeSkuId?.slice(-6) ?? Date.now().toString(36)}`.slice(0, 80);
}
