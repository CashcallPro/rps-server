import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RevshareService } from './revshare.service';
import { RevshareController } from './revshare.controller';
import { Revshare, RevshareSchema } from './schemas/revshare.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Revshare.name, schema: RevshareSchema }]),
  ],
  controllers: [RevshareController],
  providers: [RevshareService],
  exports: [RevshareService], // Export RevshareService for use in other modules
})
export class RevshareModule {}
