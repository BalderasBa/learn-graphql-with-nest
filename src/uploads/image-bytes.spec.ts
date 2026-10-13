import { BadRequestException } from '@nestjs/common';
import { assertImageBytes, safeFilename } from './image-bytes.js';
import { SAMPLE_PNG_BASE64 } from './sample-png.js';

describe('image bytes', () => {
  it('accepts a real PNG', () => {
    const bytes = Buffer.from(SAMPLE_PNG_BASE64, 'base64');
    expect(() => assertImageBytes(bytes, 'image/png')).not.toThrow();
  });

  it('rejects text that only claims to be a PNG', () => {
    const bytes = Buffer.from('not an image');
    expect(() => assertImageBytes(bytes, 'image/png')).toThrow(BadRequestException);
  });

  it('strips directories and odd characters from a filename', () => {
    expect(safeFilename('../../covers/my cover.png')).toBe('mycover.png');
  });
});
