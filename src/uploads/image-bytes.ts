import { BadRequestException } from '@nestjs/common';
import { MAX_UPLOAD_BYTES } from '../security/limits.js';

const PNG_PREFIX = [0x89, 0x50, 0x4e, 0x47];
const JPEG_PREFIX = [0xff, 0xd8, 0xff];

/**
 * The client can claim any mime type. Check the leading bytes so a text file
 * renamed to `cover.png` is rejected. This is a check, not a full image parser.
 */
export function assertImageBytes(bytes: Buffer, mimeType: string): void {
  if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) {
    throw new BadRequestException('Image must be non-empty and at most 100 KB');
  }
  const normalized = mimeType.toLowerCase();
  const matches =
    (normalized === 'image/png' && startsWith(bytes, PNG_PREFIX)) ||
    (normalized === 'image/jpeg' && startsWith(bytes, JPEG_PREFIX)) ||
    (normalized === 'image/webp' && isWebp(bytes));
  if (!matches) {
    throw new BadRequestException(
      'File contents do not match the declared image type',
    );
  }
}

/** Drop path segments and characters that do not belong in a filename header. */
export function safeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? 'cover';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '');
  return cleaned.slice(0, 80) || 'cover';
}

function startsWith(bytes: Buffer, prefix: number[]): boolean {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function isWebp(bytes: Buffer): boolean {
  return (
    bytes.length > 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}
