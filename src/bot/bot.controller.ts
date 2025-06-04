import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SendGameScoreDto, SendMessageDto } from './bot.dto';
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

  @Post('message')
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() messageData: SendMessageDto) {
    const { chatId, message } = messageData
    return this.botService.sendMessage(chatId, message)
  }
}
