import { getApiUrl } from '../config/api';

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;

const getApiOrigin = (): string => {
  try {
    const apiUrl = getApiUrl();
    const parsed = new URL(apiUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
};

const stripQueryAndHash = (value: string): string => value.split('?')[0].split('#')[0];
const FILENAME_TIMESTAMP_RE = /-(\d+)-\d+\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;

const extractFilename = (value: string): string | null => {
  const clean = stripQueryAndHash(value).trim();
  if (!clean) return null;

  const lastSlash = clean.lastIndexOf('/');
  const filename = lastSlash >= 0 ? clean.slice(lastSlash + 1) : clean;
  if (!filename) return null;

  return filename;
};

const isMalformedProfileFilename = (filename: string): boolean => {
  const match = filename.match(FILENAME_TIMESTAMP_RE);
  if (!match) return false;

  // Uploaded filenames should carry ms timestamps (13 digits). Longer values are likely corrupted.
  const ts = match[1];
  return ts.length > 13;
};

export const normalizeProfileImageUrl = (rawUrl?: string | null): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const input = rawUrl.trim();
  if (!input) return null;

  const filename = extractFilename(input);
  if (!filename || !IMAGE_EXT_RE.test(filename)) {
    return null;
  }

  if (isMalformedProfileFilename(filename)) {
    return null;
  }

  const origin = getApiOrigin();
  if (!origin) return input;

  return `${origin}/uploads/profile-pictures/${filename}`;
};

export const withCacheBust = (url?: string | null): string | null => {
  const normalized = normalizeProfileImageUrl(url);
  if (!normalized) return null;
  return `${normalized}?t=${Date.now()}`;
};

export const normalizeUserProfileImageFields = <T extends Record<string, any>>(user?: T | null): T | null => {
  if (!user) return null;

  const normalizedFromProfile = normalizeProfileImageUrl(user.profile_image);
  const normalizedFromProfileUrl = normalizeProfileImageUrl(user.profile_image_url);
  const normalizedImage = normalizedFromProfile || normalizedFromProfileUrl;

  if (!normalizedImage) {
    return {
      ...user,
      profile_image: undefined,
      profile_image_url: undefined,
    };
  }

  return {
    ...user,
    profile_image: normalizedImage,
    profile_image_url: normalizedImage,
  };
};

export const getNormalizedProfileImageFromUser = (userLike?: Record<string, any> | null): string | null => {
  if (!userLike) return null;
  return (
    normalizeProfileImageUrl(userLike.profile_image) ||
    normalizeProfileImageUrl(userLike.profile_image_url) ||
    null
  );
};
