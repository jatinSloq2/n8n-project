import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
} from "@nestjs/common";
import { ExecutionsService } from "./executions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("executions")
@UseGuards(JwtAuthGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  findAll(@Request() req: any, @Query() filters: any) {
    return this.executionsService.findAll(req.user.userId, filters);
  }

  @Get("stats")
  getStats(@Request() req: any) {
    return this.executionsService.getExecutionStats(req.user.userId);
  }

  @Get(":id/details")
  async getExecutionDetails(@Param("id") id: string) {
    const execution = await this.executionsService.findById(id);

    return {
      // id: execution._id,
      id: id,
      workflowId: execution.workflowId,
      status: execution.status,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      duration:
        execution.finishedAt && execution.startedAt
          ? execution.finishedAt.getTime() - execution.startedAt.getTime()
          : null,
      data: execution.data,
      error: execution.error,
    };
  }

  @Get("workflow/:workflowId")
  findByWorkflow(@Param("workflowId") workflowId: string, @Request() req: any) {
    return this.executionsService.findByWorkflowId(workflowId, req.user.userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.executionsService.findById(id);
  }

  @Post(":id/stop")
  stop(@Param("id") id: string) {
    return this.executionsService.stopExecution(id);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.executionsService.delete(id);
  }

  @Post(":id/execute")
  async execute(@Param("id") id, @Body() executionData, @Request() req) {
    return this.executionsService.executeWorkflow(
      id,
      req.user.userId,
      executionData
    );
  }
}
