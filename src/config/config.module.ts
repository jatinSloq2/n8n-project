const { Module, Global } = require('@nestjs/common');
const { ConfigService } = require('./config.service');

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
class ConfigModule {}

module.exports = { ConfigModule };