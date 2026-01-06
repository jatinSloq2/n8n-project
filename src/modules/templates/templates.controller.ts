import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TemplatesService } from "./template.service";

@Controller("templates")
@UseGuards(JwtAuthGuard) // ✅ ADD THIS - Protect all template routes
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  getAllTemplates(
    @Query("category") category?: string,
    @Query("difficulty") difficulty?: string,
    @Query("search") search?: string
  ) {
    return this.templatesService.getTemplates({
      category,
      difficulty,
      search,
    });
  }

  @Get("categories")
  getCategories() {
    return this.templatesService.getCategories();
  }

  @Get(":id")
  getTemplate(@Param("id") id: string) {
    return this.templatesService.getTemplateById(id);
  }

  @Post(":id/use")
  useTemplate(
    @Param("id") id: string, 
    @Body() customData: any,
    @Request() req: any // ✅ ADD THIS - Get user from JWT
  ) {
    // ✅ Pass the userId from JWT token
    return this.templatesService.createWorkflowFromTemplate(id, {
      ...customData,
      user: req.user,
      userId: req.user.userId || req.user.id // ✅ THIS IS THE KEY FIX
    });
  }
}