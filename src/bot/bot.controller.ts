import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SendGameScoreDto, SendMessageDto, SendMessageToAllDto, SendMessageToListDto } from './bot.dto';
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

  @Post('message/all')
  @HttpCode(HttpStatus.OK)
  async sendMessageToAll(@Body() messageData: SendMessageToAllDto) {
    const { message } = messageData
    return this.botService.sendMessageToAllUsers(message)
  }

  @Post('message/list')
  @HttpCode(HttpStatus.OK)
  async sendMessageToList(@Body() messageData: SendMessageToListDto) {
    const { message, chatIds } = messageData
    return this.botService.sendMessageToUsers(message, chatIds)
  }
}
