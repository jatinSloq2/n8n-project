import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { ExecutionsService } from '../executions/executions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly executionsService: ExecutionsService,
  ) {}

  @Post()
  async create(@Body() createWorkflowDto: any, @Request() req: any) {
    return this.workflowsService.create(createWorkflowDto, req.user.userId);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.workflowsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.findById(id, req.user.userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateWorkflowDto: any, @Request() req: any) {
    return this.workflowsService.update(id, updateWorkflowDto, req.user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.delete(id, req.user.userId);
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.activate(id, req.user.userId);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.deactivate(id, req.user.userId);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @Request() req: any) {
    return this.workflowsService.duplicate(id, req.user.userId);
  }

  @Post(':id/execute')
  async execute(@Param('id') id: string, @Request() req: any, @Body() executionData: any) {
    return this.executionsService.executeWorkflow(id, req.user.userId, executionData);
  }
}
