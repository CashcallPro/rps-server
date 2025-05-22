// src/game/schemas/completed-game.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompletedGameDocument = CompletedGame & Document;

// Sub-document for player details within a completed game
@Schema({ _id: false }) // No separate _id for this sub-document to keep it lean
export class PlayerRecord {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  socketIdAtGameEnd: string; // Storing socketId at the time of game end for reference

  @Prop({ required: true, default: 0 })
  finalScore: number;
}
export const PlayerRecordSchema = SchemaFactory.createForClass(PlayerRecord);

@Schema({ collection: 'completed_games', timestamps: true }) // `timestamps: true` adds `createdAt` and `updatedAt`
export class CompletedGame {
  // Mongoose will add its own _id, which is the primary key.
  // We store the original sessionId for traceability to the Redis session if needed.
  @Prop({ required: true, index: true })
  originalSessionId: string;

  @Prop({ type: [PlayerRecordSchema], required: true })
  players: PlayerRecord[];

  @Prop({ required: true, default: false })
  isBotGame: boolean;

  @Prop({ required: true })
  gameStartTime: Date; // From sessionData.startTime

  @Prop({ required: true })
  gameEndTime: Date; // Date.now() at game conclusion

  @Prop({ type: String, default: null })
  winnerUsername?: string | null; // Null if tie or if game ended prematurely without clear winner from scores

  @Prop({ type: Boolean, default: false })
  isTie?: boolean;
}

export const CompletedGameSchema = SchemaFactory.createForClass(CompletedGame);