import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkflowDocument = Workflow & Document;

@Schema({ timestamps: true })
export class Workflow {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Array, default: [] })
  nodes: any[];

  @Prop({ type: Array, default: [] })
  connections: any[];

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);
