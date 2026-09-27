import {
  isPrivateMediaStorageKey,
  publicUrlForStorageKey,
} from "@/lib/media/storage";

export function academyPublicImageUrl(
  storageKey: string | null | undefined,
): string | null {
  if (!storageKey || isPrivateMediaStorageKey(storageKey)) return null;
  try {
    return publicUrlForStorageKey(storageKey);
  } catch {
    return null;
  }
}
