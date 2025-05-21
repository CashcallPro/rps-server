import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api'; // Use * as import

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: TelegramBot;
  private readonly botToken: string | undefined;
  private readonly gameShortName: string | undefined;
  private readonly telegramGameUrl: string | undefined;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.gameShortName = this.configService.get<string>('TELEGRAM_GAME_SHORTNAME');
    this.telegramGameUrl = this.configService.get<string>('TELEGRAM_GAME_URL');

    if (!this.botToken) {
      throw new Error('BOT_TOKEN is not defined in environment variables for BotService');
    }
    if (!this.gameShortName) {
      throw new Error('GAME_SHORT_NAME is not defined in environment variables for BotService');
    }
    if (!this.telegramGameUrl) {
      throw new Error('TELEGRAM_GAME_URL is not defined in environment variables for BotService');
    }
  }

  onModuleInit() {
    this.initializeBot();
    this.logger.log('BotService initialized.');
  }

  // todo: add controller route 
  async sendGameScore(clientInlineMessageId: string, userId: number, score: number) {
    this.bot.setGameScore(
      userId,
      score,
      {
        inline_message_id: clientInlineMessageId,
        force: true
      }
    )
  }

  private initializeBot() {
    // It's important to ensure this.botToken and this.gameShortName are loaded before this runs
    // The constructor and OnModuleInit lifecycle ensure this.
    this.bot = new TelegramBot(this.botToken!, { polling: true });

    this.bot.onText(/\/playgame/, (msg) => {
      const chatId = msg.chat.id;
      this.logger.log(`Received /playgame from chat ${chatId}. Sending game: ${this.gameShortName}`);
      this.bot.sendGame(chatId, this.gameShortName!)
        .then(() => {
          this.logger.log(`Game "${this.gameShortName}" sent to chat ${chatId}`)
        })
        .catch(err => this.logger.error(`Error sending game to ${chatId}:`, err.response?.body || err.message || err));
    });

    this.bot.on("callback_query", (callbackQuery) => {
      const userId = callbackQuery.from.id
      const inlineMessageId = callbackQuery.inline_message_id ?? ''
      const username = callbackQuery.from.username
      const name = callbackQuery.from.first_name

      const query = `username=${username}&userId=${userId}&inlineMessageId=${inlineMessageId}&name=${name}`

      this.bot.answerCallbackQuery(callbackQuery.id, {
        url: `${this.telegramGameUrl}?${query}`
      });
    });

    this.bot.on('message', (msg) => {
      const chatId = msg.chat.id;
      console.log({ chatId })
      // send a message to the chat acknowledging receipt of their message
      this.bot.sendMessage(chatId, 'Received your message');
    });


    this.bot.on('inline_query', (query) => {
      const inlineQueryId = query.id;
      this.logger.log(`Received inline query (ID: ${inlineQueryId}) for game: ${this.gameShortName}`);
      const results: TelegramBot.InlineQueryResult[] = [{
        type: 'game',
        id: '1', // Unique ID for this result
        game_short_name: this.gameShortName!,
      }];
      this.bot.answerInlineQuery(inlineQueryId, results)
        .then(() => this.logger.log(`Answered inline query ${inlineQueryId} with game ${this.gameShortName}`))
        .catch(err => this.logger.error("Error answering inline query:", err.response?.body || err.message || err));
    });

    this.bot.on('polling_error', (error) => {
      this.logger.error(`Telegram Polling Error: ${error.message}`, error);
      // You might want to add more sophisticated error handling here,
      // like attempting to restart polling after a delay, or notifying an admin.
    });

    this.logger.log(`Telegram bot initialized with game short name: ${this.gameShortName}. Listening for commands...`);
  }

  // Optional: If you want to send messages from other parts of your NestJS app via the bot
  async sendMessage(chatId: number | string, text: string, options?: TelegramBot.SendMessageOptions): Promise<TelegramBot.Message> {
    if (!this.bot) {
      this.logger.error('Bot not initialized. Cannot send message.');
      throw new Error('Bot not initialized.');
    }
    return this.bot.sendMessage(chatId, text, options);
  }
}