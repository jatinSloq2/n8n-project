const { Module } = require('@nestjs/common');
const { MongooseModule } = require('@nestjs/mongoose');
const { CredentialsService } = require('./credentials.service');
const { CredentialsController } = require('./credentials.controller');
const { CredentialSchema } = require('./credential.schema');

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Credential', schema: CredentialSchema }]),
  ],
  controllers: [CredentialsController],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
class CredentialsModule {}

module.exports = { CredentialsModule };