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

    this.bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const username = msg?.from?.username || `${msg?.from?.first_name} ${msg?.from?.last_name || ''}`.trim();
      const userId = msg?.from?.id.toString() || username;
      const referralCode = match?.[1];

      this.logger.log(`Received /start command from ${username} (ID: ${userId}) referralCode: ${referralCode}`);

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
              { text: '🎁 Referral', callback_data: 'request_referral_link' }
            ],
            [
              { text: '💵 Earn More!', callback_data: 'earn_more_options' } 
            ],
            [ // New row for language buttons
              { text: '🇷🇺 Russian', url: 'https://t.me/rpstitans/2' },
              { text: '🇮🇷 Persian', url: 'https://t.me/rpstitans/3' },
              { text: '🇹🇷 Turkish', url: 'https://t.me/rpstitans/4' }
            ]
          ]
        }
      };

      if (referralCode == userId) {
        this.sendMessage(chatId, 'You can\'t refer yourself')
      }

      const userExists = await this.userService.findOneByTelegramUserId(userId)

      if (userExists) {
        this.sendMessage(chatId, "You have already joined!")
        // Welcome message will be sent after this block
      } else {
        // Create user only if they don't exist
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
      }

      // Send welcome message as the final operation for all /start command invocations
      this.bot.sendMessage(chatId, welcomeMessage, options)
        .then(() => {
          console.log(`Sent welcome message with inline keyboard to chat ID: ${chatId} for /start command`);
        })
        .catch((error: Error) => {
          console.error(`Error sending message to ${chatId}:`, error.message);
        });
    });

    this.bot.onText(/\/refer/, (msg) => {
      const message = `Here's your referral link: https://t.me/rpstestinggroundsbot?start=${msg.from?.id}`
      this.sendMessage(msg.chat.id, message)
    })

    this.bot.on("callback_query", async (callbackQuery) => {
      if (callbackQuery.data === 'request_referral_link') {
        const chatId = callbackQuery.message?.chat.id;
        const userId = callbackQuery.from.id;

        if (chatId) {
          const message = `Here's your referral link: https://t.me/rpstestinggroundsbot?start=${userId}`;
          this.bot.sendMessage(chatId, message);
          this.bot.answerCallbackQuery(callbackQuery.id); // Acknowledge
          return; // Handled, no further processing needed for this callback type
        } else {
          this.logger.warn(`ChatId not available for callback_query 'request_referral_link' from user ${userId}`);
          this.bot.answerCallbackQuery(callbackQuery.id, { text: "Error: Could not process referral request." });
          return; // Handled
        }
      } else if (callbackQuery.data === 'earn_more_options') {
        const chatId = callbackQuery.message?.chat.id;
        if (chatId) {
          const messageText = "Become a partner! a tutorial text";
          const messageOptions: TelegramBot.SendMessageOptions = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'Yes', callback_data: 'partner_yes' },
                  { text: 'No', callback_data: 'partner_no' }
                ]
              ]
            }
          };
          this.bot.sendMessage(chatId, messageText, messageOptions);
          this.bot.answerCallbackQuery(callbackQuery.id); // Acknowledge the 'Earn More' button press
        } else {
          this.logger.warn(`ChatId not available for callback_query 'earn_more_options' from user ${callbackQuery.from.id}`);
          this.bot.answerCallbackQuery(callbackQuery.id, { text: "Error: Could not process request." });
        }
        return; // Handled
      }

      // Existing game-related callback logic starts here
      // (It will only be reached if callbackQuery.data is not handled above)
      const userId = callbackQuery.from.id;
      const inlineMessageId = callbackQuery.inline_message_id ?? '';
      const username = callbackQuery.from.username;
      const name = callbackQuery.from.first_name;
      const chatId = callbackQuery.message?.chat.id;
      let groupOwnerId: number | undefined;

      try {
        if (chatId) {
          const admins = await this.bot.getChatAdministrators(chatId);
          const groupOwner = admins.find(admin => admin.status === 'creator');
          groupOwnerId = groupOwner?.user.id;
          this.logger.log(admins);
        }
      } catch (e) {
        this.logger.log(`group not found for ${chatId}`);
      }

      let query = `username=${username}&userId=${userId}&inlineMessageId=${inlineMessageId}&name=${name}`;

      if (groupOwnerId) {
        query += `&owner=${groupOwnerId}`;
      }

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
