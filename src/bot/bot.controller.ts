import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SendGameScoreDto } from './bot.dto';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {

  constructor(private readonly botService: BotService) { }

  @Post('score')
  @HttpCode(HttpStatus.OK)
  async sendGameScore(@Body() scoreData: SendGameScoreDto) {
    const { clientInlineMessageId, score, userId } = scoreData
    return this.botService.sendGameScore(clientInlineMessageId, userId, score)
  }
}
