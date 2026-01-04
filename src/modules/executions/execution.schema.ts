// execution.schema.ts
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

  // ✅ FIX: Properly typed data field
  @Prop({ 
    type: MongooseSchema.Types.Mixed, 
    default: () => ({ resultData: { runData: {}, nodeOutputs: {} } })
  })
  data: {
    resultData?: {
      runData: Record<string, any>;
      nodeOutputs?: Record<string, any>; // ✅ Add this
    };
    error?: string;
  };

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

  // Add these for timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);