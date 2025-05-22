import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// --- Sub-schema for Score Entry ---
@Schema({ _id: false }) // No separate _id for score entries within a match
export class ScoreEntry {
  @Prop({ required: true, trim: true })
  username: string;

  @Prop({ required: true, type: Number, default: 0 })
  score: number;
}
export const ScoreEntrySchema = SchemaFactory.createForClass(ScoreEntry);


// --- Sub-schema for a Match ---
@Schema({ _id: false, timestamps: true }) // _id: false if sessionId is the primary identifier within the array.
                                        // timestamps: true will add createdAt/updatedAt to each match entry.
export class Match {
  @Prop({ required: true, index: true }) // `index: true` if you plan to query matches by sessionId often
  sessionId: string;

  @Prop({ type: [String], required: true, default: [] })
  players: string[]; // Array of usernames

  @Prop({ type: [ScoreEntrySchema], required: true, default: [] })
  scores: ScoreEntry[];
}
export const MatchSchema = SchemaFactory.createForClass(Match);


// --- Main User Schema ---
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, index: true })
  username: string;

  @Prop({ required: true, default: 0, min: 0 })
  coins: number;

  @Prop({ type: [MatchSchema], default: [] }) // Array of Match objects
  matches: Match[];
}

export const UserSchema = SchemaFactory.createForClass(User);