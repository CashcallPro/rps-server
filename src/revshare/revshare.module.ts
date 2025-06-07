import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RevshareService } from './revshare.service';
import { RevshareController } from './revshare.controller';
import { Revshare, RevshareSchema } from './schemas/revshare.schema';
import { BotModule } from '../bot/bot.module'; // Added import

@Module({
  controllers: [RevshareController],
  providers: [RevshareService],
  imports: [
    MongooseModule.forFeature([{ name: Revshare.name, schema: RevshareSchema }]),
    forwardRef(() => BotModule),
  ],
  exports: [RevshareService],
})
export class RevshareModule { }
