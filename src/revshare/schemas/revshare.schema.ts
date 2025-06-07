import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RevshareDocument = HydratedDocument<Revshare>;

@Schema({ timestamps: true })
export class Revshare {
  @Prop({ required: true, index: true })
  telegramUserId: string;

  @Prop({ required: false })
  groupHandle?: string;

  @Prop({ required: false })
  groupUsername?: string; // New field

  @Prop({ required: false })
  groupId?: string;

  @Prop({
    required: true,
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: string;

  @Prop({ required: false })
  message?: string;
}

export const RevshareSchema = SchemaFactory.createForClass(Revshare);
