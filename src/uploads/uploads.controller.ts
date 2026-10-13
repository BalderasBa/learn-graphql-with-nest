import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LibrarianGuard } from '../common/auth.guards.js';
import { MAX_UPLOAD_BYTES } from '../security/limits.js';
import { BookCover } from './book-cover.model.js';
import { UploadsService } from './uploads.service.js';

interface UploadedImage {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/**
 * File bytes travel as HTTP, not as a GraphQL selection. Apollo does not
 * parse multipart GraphQL bodies. The client uploads here, receives an id,
 * then calls the `attachCover` mutation with that id.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('covers')
  @UseGuards(LibrarianGuard)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  uploadCover(@UploadedFile() file?: UploadedImage): BookCover {
    if (!file) {
      throw new BadRequestException('Send the image in the "file" form field');
    }
    return this.uploadsService.save({
      filename: file.originalname,
      mimeType: file.mimetype,
      bytes: file.buffer,
    });
  }

  @Get('covers/:uploadId')
  downloadCover(@Param('uploadId') uploadId: string): StreamableFile {
    const file = this.uploadsService.read(uploadId);
    return new StreamableFile(file.bytes, {
      type: file.mimeType,
      disposition: `inline; filename="${file.filename}"`,
    });
  }
}
