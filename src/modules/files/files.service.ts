import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { promises as fs } from "fs";
import { join } from "path";

import { File, FileDocument } from "./file.schema";

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File.name)
    private readonly fileModel: Model<FileDocument>
  ) {}

  /**
   * Save uploaded file metadata to database
   */
  async saveFileMetadata(
    file: Express.Multer.File,
    userId: string
  ): Promise<File> {
    try {
      const createdFile = new this.fileModel({
        userId,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`, // Add this line
        path: file.path,
        uploadedAt: new Date(),
      });

      return await createdFile.save();
    } catch (error) {
      throw new InternalServerErrorException("Failed to save file metadata");
    }
  }

  /**
   * Get all files uploaded by a specific user
   */
  async getUserFiles(userId: string): Promise<File[]> {
    return this.fileModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Get single file metadata by ID (ownership protected)
   */
  async getFileById(id: string, userId: string): Promise<File> {
    const file = await this.fileModel.findById(id);

    if (!file) {
      throw new NotFoundException("File not found");
    }

    if (file.userId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    return file;
  }

  /**
   * Read file content from disk (ownership protected)
   * Controller can pipe/stream this later if needed
   */
  async getFileContent(id: string, userId: string): Promise<Buffer> {
    const file = await this.getFileById(id, userId);

    try {
      return await fs.readFile(join(process.cwd(), file.path));
    } catch (error) {
      throw new InternalServerErrorException("Unable to read file");
    }
  }

  /**
   * Delete file from disk and database
   */
  async deleteFile(id: string, userId: string): Promise<{ message: string }> {
    const file = await this.getFileById(id, userId);

    try {
      // Delete from filesystem
      await fs.unlink(join(process.cwd(), file.path));
    } catch {
      // File may already be missing — do not block DB cleanup
    }

    await this.fileModel.deleteOne({ _id: id });

    return { message: "File deleted successfully" };
  }
}
