import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExecutionDocument = Execution & Document;

export type ExecutionStatus = 'running' | 'success' | 'error' | 'canceled';

@Schema({ timestamps: true })
export class Execution {
  @Prop({ type: Types.ObjectId, ref: 'Workflow', required: true })
  workflowId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: ['running', 'success', 'error', 'canceled'], default: 'running' })
  status: ExecutionStatus;

  @Prop({ default: {} })
  data: any;

  @Prop()
  error?: { message: string; stack: string };

  @Prop()
  mode?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;
}

export const ExecutionSchema = SchemaFactory.createForClass(Execution);
