import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { RevshareModule } from 'src/revshare/revshare.module';

@Module({
  imports: [RevshareModule],
  providers: [GameGateway],
})
export class GameModule {}
