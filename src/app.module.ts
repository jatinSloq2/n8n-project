import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { FilesModule } from './modules/files/files.module';
import { TemplatesModule } from './modules/templates/templates.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRoot(process.env.MONGODB_URI),
    AuthModule,
    UsersModule,
    WorkflowsModule,
    NodesModule,
    ExecutionsModule,
    CredentialsModule,
    FilesModule,
    TemplatesModule,
  ],
})
export class AppModule {}