const { Controller, Get, Post, Delete, Param, Query, UseGuards, Request } = require('@nestjs/common');
const { ExecutionsService } = require('./executions.service');
const { JwtAuthGuard } = require('../auth/guards/jwt-auth.guard');

@Controller('executions')
@UseGuards(JwtAuthGuard)
class ExecutionsController {
  constructor(executionsService) {
    this.executionsService = executionsService;
  }

  @Get()
  async findAll(@Request() req, @Query() filters) {
    return this.executionsService.findAll(req.user.userId, filters);
  }

  @Get('stats')
  async getStats(@Request() req) {
    return this.executionsService.getExecutionStats(req.user.userId);
  }

  @Get('workflow/:workflowId')
  async findByWorkflow(@Param('workflowId') workflowId, @Request() req) {
    return this.executionsService.findByWorkflowId(workflowId, req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id) {
    return this.executionsService.findById(id);
  }

  @Post(':id/stop')
  async stop(@Param('id') id) {
    return this.executionsService.stopExecution(id);
  }

  @Delete(':id')
  async delete(@Param('id') id) {
    return this.executionsService.delete(id);
  }
}

module.exports = { ExecutionsController };