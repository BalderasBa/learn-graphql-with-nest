import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { assertImageBytes, safeFilename } from './image-bytes.js';
import { BookCover } from './book-cover.model.js';

interface StoredFile {
  uploadId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}

interface SaveFileInput {
  filename: string;
  mimeType: string;
  bytes: Buffer;
}

@Injectable()
export class UploadsService {
  private readonly files = new Map<string, StoredFile>();

  save(input: SaveFileInput): BookCover {
    assertImageBytes(input.bytes, input.mimeType);
    const stored: StoredFile = {
      uploadId: randomUUID(),
      filename: safeFilename(input.filename),
      mimeType: input.mimeType.toLowerCase(),
      bytes: input.bytes,
    };
    this.files.set(stored.uploadId, stored);
    return this.toCover(stored);
  }

  saveBase64(filename: string, mimeType: string, contentBase64: string): BookCover {
    return this.save({
      filename,
      mimeType,
      bytes: Buffer.from(contentBase64, 'base64'),
    });
  }

  read(uploadId: string): StoredFile {
    const file = this.files.get(uploadId);
    if (!file) {
      throw new NotFoundException(`Upload "${uploadId}" was not found`);
    }
    return file;
  }

  private toCover(file: StoredFile): BookCover {
    return {
      uploadId: file.uploadId,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.bytes.length,
      url: `/uploads/covers/${file.uploadId}`,
    };
  }
}
