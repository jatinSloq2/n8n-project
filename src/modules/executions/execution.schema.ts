import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types, Schema as MongooseSchema } from "mongoose";

export type ExecutionDocument = HydratedDocument<Execution>;

export type ExecutionStatus = "running" | "success" | "error" | "canceled";

@Schema({ timestamps: true })
export class Execution {
  @Prop({ type: Types.ObjectId, ref: "Workflow", required: true })
  workflowId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ["running", "success", "error", "canceled"],
    default: "running",
  })
  status: ExecutionStatus;

  // ✅ FIX: Explicit MongoDB type
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  data: Record<string, any>;

  // ✅ Optional but recommended
  @Prop({
    type: {
      message: String,
      stack: String,
    },
    default: null,
  })
  error?: {
    message: string;
    stack: string;
  };

  @Prop()
  mode?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);
