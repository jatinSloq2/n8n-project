const { Module } = require('@nestjs/common');
const { MongooseModule } = require('@nestjs/mongoose');
const { WorkflowsService } = require('./workflows.service');
const { WorkflowsController } = require('./workflows.controller');
const { WorkflowSchema } = require('./workflow.schema');
const { ExecutionsModule } = require('../executions/executions.module');

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Workflow', schema: WorkflowSchema }]),
    ExecutionsModule,
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
class WorkflowsModule {}

module.exports = { WorkflowsModule };