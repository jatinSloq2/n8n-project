const { Module, forwardRef } = require('@nestjs/common');
const { MongooseModule } = require('@nestjs/mongoose');
const { BullModule } = require('@nestjs/bull');
const { ExecutionsService } = require('./executions.service');
const { ExecutionsController } = require('./executions.controller');
const { ExecutionSchema } = require('./execution.schema');
const { WorkflowExecutor } = require('./workflow-executor.service');
const { ExecutionProcessor } = require('./execution.processor');

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Execution', schema: ExecutionSchema }]),
    BullModule.registerQueue({
      name: 'executions',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
    }),
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, WorkflowExecutor, ExecutionProcessor],
  exports: [ExecutionsService, WorkflowExecutor],
})
class ExecutionsModule {}

module.exports = { ExecutionsModule };