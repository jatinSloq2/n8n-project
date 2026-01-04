import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkflowsService } from "./workflows.service";
import { WorkflowsSeedService } from "./workflows-seed.service";

@Controller("workflows")
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly workflowsSeedService: WorkflowsSeedService
  ) {}

  @Post()
  async create(@Body() createWorkflowDto: any, @Request() req: any) {
    return this.workflowsService.create(createWorkflowDto, req.user.userId);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.workflowsService.findAll(req.user.userId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req: any) {
    return this.workflowsService.findById(id, req.user.userId);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateWorkflowDto: any,
    @Request() req: any
  ) {
    return this.workflowsService.update(id, updateWorkflowDto, req.user.userId);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Request() req: any) {
    return this.workflowsService.delete(id, req.user.userId);
  }

  @Patch(":id/activate")
  async activate(@Param("id") id: string, @Request() req: any) {
    return this.workflowsService.activate(id, req.user.userId);
  }

  @Patch(":id/deactivate")
  async deactivate(@Param("id") id: string, @Request() req: any) {
    return this.workflowsService.deactivate(id, req.user.userId);
  }

  @Post(":id/duplicate")
  async duplicate(@Param("id") id: string, @Request() req: any) {
    return this.workflowsService.duplicate(id, req.user.userId);
  }

  @Post("seed")
  async seedWorkflow(@Body("email") email: string) {
    if (!email) {
      throw new Error("Email is required");
    }

    const workflow = await this.workflowsSeedService.seedComprehensiveWorkflow(
      email
    );

    return {
      success: true,
      message: "Workflow seeded successfully",
      workflowId: workflow._id,
      totalNodes: workflow.nodes.length,
      totalConnections: workflow.connections.length,
    };
  }

  // Delete test workflow endpoint
  @Delete("seed/:email")
  async deleteTestWorkflow(@Param("email") email: string) {
    const result = await this.workflowsSeedService.deleteTestWorkflow(email);

    return {
      success: true,
      message: "Test workflow deleted",
      deletedCount: result.deletedCount,
    };
  }
}
