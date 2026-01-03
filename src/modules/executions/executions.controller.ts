import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('executions')
@UseGuards(JwtAuthGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  findAll(@Request() req: any, @Query() filters: any) {
    return this.executionsService.findAll(req.user.userId, filters);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.executionsService.getExecutionStats(req.user.userId);
  }

  @Get('workflow/:workflowId')
  findByWorkflow(@Param('workflowId') workflowId: string, @Request() req: any) {
    return this.executionsService.findByWorkflowId(workflowId, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.executionsService.findById(id);
  }

  @Post(':id/stop')
  stop(@Param('id') id: string) {
    return this.executionsService.stopExecution(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.executionsService.delete(id);
  }
}
