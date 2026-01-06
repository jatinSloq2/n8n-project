import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule } from "./config/config.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CredentialsModule } from "./modules/credentials/credentials.module";
import { ExecutionsModule } from "./modules/executions/executions.module";
import { FilesModule } from "./modules/files/files.module";
import { NodesModule } from "./modules/nodes/nodes.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { UsersModule } from "./modules/users/users.module";
import { WebhooksController } from "./modules/webhooks/webhooks.controller";
import { WorkflowsModule } from "./modules/workflows/workflows.module";

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
    SchedulerModule,
  ],
  controllers: [
    // ... other controllers
    WebhooksController,
  ],
})
export class AppModule {}
