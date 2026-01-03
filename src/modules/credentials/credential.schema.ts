import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CredentialDocument = Credential & Document;

@Schema({ timestamps: true })
export class Credential {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    enum: ['http', 'oauth2', 'apiKey', 'database', 'email'],
  })
  type: 'http' | 'oauth2' | 'apiKey' | 'database' | 'email';

  @Prop({ type: Object, required: true })
  data: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const CredentialSchema = SchemaFactory.createForClass(Credential);

// Indexes
CredentialSchema.index({ userId: 1 });
CredentialSchema.index({ type: 1 });
