const { Module } = require('@nestjs/common');
const { MongooseModule } = require('@nestjs/mongoose');
const { ConfigModule } = require('./config/config.module');
const { AuthModule } = require('./modules/auth/auth.module');
const { UsersModule } = require('./modules/users/users.module');
const { WorkflowsModule } = require('./modules/workflows/workflows.module');
const { NodesModule } = require('./modules/nodes/nodes.module');
const { ExecutionsModule } = require('./modules/executions/executions.module');
const { CredentialsModule } = require('./modules/credentials/credentials.module');

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRoot(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }),
    AuthModule,
    UsersModule,
    WorkflowsModule,
    NodesModule,
    ExecutionsModule,
    CredentialsModule,
  ],
})
class AppModule {}

module.exports = AppModule;