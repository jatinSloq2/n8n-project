import {
    BadRequestException,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Request,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FilesService } from "./files.service";

@Controller("files")
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, callback) => {
        // Allow common file types
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/pdf",
          "text/plain",
          "text/csv",
          "application/json",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/xml",
          "application/xml",
        ];

        if (allowedTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `File type ${file.mimetype} not supported`
            ),
            false
          );
        }
      },
    })
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    return this.filesService.saveFileMetadata(file, req.user.userId);
  }

  @Post("upload-multiple")
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    })
  )
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    const savedFiles = await Promise.all(
      files.map((file) =>
        this.filesService.saveFileMetadata(file, req.user.userId)
      )
    );

    return { files: savedFiles, count: savedFiles.length };
  }

  @Get()
  async getUserFiles(@Request() req) {
    return this.filesService.getUserFiles(req.user.userId);
  }

  @Get(":id")
  async getFile(@Param("id") id: string, @Request() req) {
    return this.filesService.getFileById(id, req.user.userId);
  }

  @Get(":id/content")
  async getFileContent(@Param("id") id: string, @Request() req) {
    return this.filesService.getFileContent(id, req.user.userId);
  }

  @Delete(":id")
  async deleteFile(@Param("id") id: string, @Request() req) {
    return this.filesService.deleteFile(id, req.user.userId);
  }
}