const { Module } = require('@nestjs/common');
const { NodesService } = require('./nodes.service');
const { NodesController } = require('./nodes.controller');

@Module({
  controllers: [NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
class NodesModule {}

module.exports = { NodesModule };