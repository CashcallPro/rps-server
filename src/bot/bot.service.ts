import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api'; // Use * as import
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: TelegramBot;
  private readonly botToken: string | undefined;
  private readonly gameShortName: string | undefined;
  private readonly telegramGameUrl: string | undefined;

  constructor(
    private configService: ConfigService,
    private readonly userService: UsersService
  ) {

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

    this.bot.onText(/\/play/, (msg) => {
      const chatId = msg.chat.id;
      this.logger.log(`Received /playgame from chat ${chatId}. Sending game: ${this.gameShortName}`);
      this.bot.sendGame(chatId, this.gameShortName!)
        .then(() => {
          this.logger.log(`Game "${this.gameShortName}" sent to chat ${chatId}`)
        })
        .catch(err => this.logger.error(`Error sending game to ${chatId}:`, err.response?.body || err.message || err));
    });

    this.bot.onText(/\/here(?: (.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;

      const welcomeMessage: string = `Welcome to PRS Titans Online Multiplayer Game!

PRS Titans is the first Win2Earn real-time multiplayer online game on TON blockchain

You win -> take your cash 🚀`;

      const options: TelegramBot.SendMessageOptions = {
        // You can use 'HTML' or 'MarkdownV2' for text formatting
        // parse_mode: 'HTML', // Example: if you wanted to use <b>bold</b> tags

        reply_markup: {
          inline_keyboard: [
            // Each array within inline_keyboard represents a row of buttons
            [
              { text: '👋 Join Channel', url: 'https://t.me/rps_titans' } // Replace with actual URL
            ],
            [
              { text: '🎁 Referral', url: 'https://example.com/hamsterboost' } // TODO: on here user receive a referral link from us to share 
            ],
            [
              { text: '💵 Earn More!', url: 'https://t.me/your_channel_username' } // TODO: this button would tell him the how to become group admin and earn revenue-share 
            ]
          ]
        }
      };

      this.bot.sendMessage(chatId, welcomeMessage, options)
        .then(() => {
          console.log(`Sent welcome message with inline keyboard to chat ID: ${chatId} for /here command`);
        })
        .catch((error: Error) => {
          console.error(`Error sending message to ${chatId}:`, error.message);
        });
    })

    this.bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const username = msg?.from?.username || `${msg?.from?.first_name} ${msg?.from?.last_name || ''}`.trim();
      const userId = msg?.from?.id.toString() || username;
      const referralCode = match?.[1];

      this.logger.log(`Received /start command from ${username} (ID: ${userId}) referralCode: ${referralCode}`);

      if (referralCode == userId) {
        this.sendMessage(chatId, 'You can\'t refer yourself')
      }

      const userExists = await this.userService.findOneByTelegramUserId(userId)

      if (userExists) {

        this.sendMessage(chatId, "You have already joined!")
        return
      }

      const user: CreateUserDto = {
        coins: 0,
        username: username,
        telegramUserId: userId,
      } 

      if (referralCode) {

        user.refereeId = referralCode

        const refereeUser = await this.userService.findOneByTelegramUserId(referralCode)

        this.userService.updateByTelegramId(referralCode, { referralToAdd: userId })

        this.sendMessage(chatId, `You have joined using ${refereeUser?.username}'s referral code`)
      }

      await this.userService.create(user)
    });

    this.bot.onText(/\/refer/, (msg) => {
      const message = `Here's your referral link: https://t.me/rpstestinggroundsbot?start=${msg.from?.id}`
      this.sendMessage(msg.chat.id, message)
    })

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
      // this.bot.sendMessage(chatId, 'Received your message');
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
