import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const ADMIN_SINGLETON_ID = 'ADMIN_SINGLETON_ID';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ type: String, unique: true, default: ADMIN_SINGLETON_ID })
  adminId: string; // Used to ensure only one admin document exists

  @Prop({ type: Number, default: 0, min: 0 })
  coins: number;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
