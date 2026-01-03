const { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Patch } = require('@nestjs/common');
const { WorkflowsService } = require('./workflows.service');
const { JwtAuthGuard } = require('../auth/guards/jwt-auth.guard');
const { ExecutionsService } = require('../executions/executions.service');

@Controller('workflows')
@UseGuards(JwtAuthGuard)
class WorkflowsController {
  constructor(workflowsService, executionsService) {
    this.workflowsService = workflowsService;
    this.executionsService = executionsService;
  }

  @Post()
  async create(@Body() createWorkflowDto, @Request() req) {
    return this.workflowsService.create(createWorkflowDto, req.user.userId);
  }

  @Get()
  async findAll(@Request() req) {
    return this.workflowsService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id, @Request() req) {
    return this.workflowsService.findById(id, req.user.userId);
  }

  @Put(':id')
  async update(@Param('id') id, @Body() updateWorkflowDto, @Request() req) {
    return this.workflowsService.update(id, updateWorkflowDto, req.user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id, @Request() req) {
    return this.workflowsService.delete(id, req.user.userId);
  }

  @Patch(':id/activate')
  async activate(@Param('id') id, @Request() req) {
    return this.workflowsService.activate(id, req.user.userId);
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id, @Request() req) {
    return this.workflowsService.deactivate(id, req.user.userId);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id, @Request() req) {
    return this.workflowsService.duplicate(id, req.user.userId);
  }

  @Post(':id/execute')
  async execute(@Param('id') id, @Request() req, @Body() executionData) {
    return this.executionsService.executeWorkflow(id, req.user.userId, executionData);
  }
}

module.exports = { WorkflowsController };