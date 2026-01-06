import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { TemplatesService } from "./template.service";

@Controller("templates")
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
  useTemplate(@Param("id") id: string, @Body() customData: any) {
    return this.templatesService.createWorkflowFromTemplate(id, customData);
  }
}
