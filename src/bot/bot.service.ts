import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api'; // Use * as import
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { RevshareService } from '../revshare/revshare.service';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: TelegramBot;
  private botInstanceId: number; // Added
  private readonly botToken: string | undefined;
  private readonly gameShortName: string | undefined;
  private readonly telegramGameUrl: string | undefined;

  constructor(
    private configService: ConfigService,
    private readonly userService: UsersService,
    private readonly revshareService: RevshareService,
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

  async onModuleInit() { // Made async
    this.initializeBot();
    try {
      const me = await this.bot.getMe();
      this.botInstanceId = me.id;
      this.logger.log(`Bot ID: ${this.botInstanceId} (${me.username}) successfully fetched and stored.`);
    } catch (err) {
      this.logger.error('CRITICAL: Failed to get bot ME details. Bot may not function correctly for group add events.', err);
      // Depending on strictness, you might throw an error here to stop initialization
      // throw new Error('Failed to initialize bot (getMe failed)');
    }
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
          const messageText: string = `What is Rev-Share in RPS Titans?

Rev-share means you earn a share of the game’s revenue when people play in your Telegram group.

📌 Here’s how it works:

You add the RPS Titans bot to your group.

When players play games in your group, the bot collects a small fee.

You earn a percentage of that fee — automatically.

It’s like getting paid every time someone plays! 🎯
No extra work needed. Just invite the bot and let the games begin. 
🚀 Ready to earn from your group’s activity? `;
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

      else if (callbackQuery.data === 'partner_yes') {
        const chatId = callbackQuery.message?.chat.id;
        const telegramUserId = callbackQuery.from.id.toString();

        if (chatId) {
          try {
            const existingRequest = await this.revshareService.findRequestByTelegramUserId(telegramUserId);
            if (existingRequest) {
              this.bot.sendMessage(chatId, 'Your request to join the revenue share program is being processed, please be patient.');
            } else {
              await this.revshareService.createRequest(telegramUserId, undefined, undefined, 'Initial request from partner_yes');
              const instructions = `Awesome! 🎉 Now take the steps below to become a rev-share partner:

1. ➕ Add this bot to your Telegram group.
2. 📎 Send the @handle of your group here in this chat.

Once you do that, we’ll activate revenue share for your group automatically. 🚀`;
              this.bot.sendMessage(chatId, instructions);
            }
            this.bot.answerCallbackQuery(callbackQuery.id);
          } catch (error) {
            this.logger.error(`Error processing 'partner_yes' for user ${telegramUserId}:`, error);
            this.bot.answerCallbackQuery(callbackQuery.id, { text: 'An error occurred. Please try again.' });
          }
        } else {
          this.logger.warn(`ChatId not available for callback_query 'partner_yes' from user ${telegramUserId}`);
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

    this.bot.on('message', async (msg) => { // Add async here
      const chatId = msg.chat.id;
      const telegramUserId = msg.from?.id.toString();
      const text = msg.text;

      // --- Start of new logic for bot added to group ---
      if (msg.new_chat_members && msg.new_chat_members.length > 0) {
        const botWasAdded = msg.new_chat_members.some(member => member.id === this.botInstanceId && member.is_bot);

        if (botWasAdded) {
          const adderUserId = msg.from?.id.toString(); // User who added the bot
          const groupId = msg.chat.id.toString();
          const groupTitle = msg.chat.title; // For logging

          if (adderUserId) {
            this.logger.log(`Bot was added to group '${groupTitle}' (ID: ${groupId}) by user ${adderUserId}.`);
            try {
              const request = await this.revshareService.findRequestByTelegramUserId(adderUserId);
              if (request && request.status === 'pending' && !request.groupId) {
                await this.revshareService.updateRequest(adderUserId, {
                  groupId: groupId,
                  message: `Bot added to group: ${groupTitle} (${groupId}) by ${adderUserId}`
                });
                this.logger.log(`Revshare request for ${adderUserId} updated with groupId ${groupId}.`);
                // No message to user is specified, just update the record.
                return; // Message handled
              } else if (request && request.status === 'pending' && request.groupId) {
                this.logger.log(`Revshare request for ${adderUserId} already has groupId ${request.groupId}. No update needed for group ${groupId}.`);
              } else if (!request) {
                this.logger.log(`No pending revshare request found for user ${adderUserId} who added bot to group ${groupId}.`);
              } else {
                this.logger.log(`Revshare request for ${adderUserId} is not in a state to be updated with groupId (status: ${request.status}).`);
              }
            } catch (error) {
              this.logger.error(`Error updating revshare request with groupId for user ${adderUserId} and group ${groupId}:`, error);
            }
          } else {
            this.logger.warn(`Bot added to group ${groupId} (${groupTitle}), but could not identify the user who added it.`);
          }
          // Even if other conditions inside 'botWasAdded' are not met,
          // if the bot was indeed added, we might want to return to avoid processing as a regular text message.
          // However, if the adder is not identifiable, or no request, it might fall through.
          // For now, if botWasAdded is true, we assume its purpose is handled or logged.
          return;
        }
      }
      // --- End of new logic ---


      // Ensure telegramUserId and text are available (text might not be present for group add messages)
      if (!telegramUserId) {
        // this.logger.log('Message without user ID received.'); // Already logged if bot was added without adder ID
        return;
      }

      if (text && text.startsWith('@')) { // Now check if text exists
        try {
          const request = await this.revshareService.findRequestByTelegramUserId(telegramUserId);

          // Check if there's a pending request that is awaiting a group handle
          if (request && request.status === 'pending' && !request.groupHandle) {
            await this.revshareService.updateRequest(telegramUserId, {
              groupHandle: text,
              message: `Group handle submitted: ${text}` // Updated message field
            });

            const confirmationMessage = `Perfect! ✅

Your rev-share request will be reviewed soon and you’ll be informed here.

Please be patient — we’re receiving a high volume of requests from group admins. 🙏
Thanks for joining the RPS Titans partner network! 💪`;
            this.bot.sendMessage(chatId, confirmationMessage);
            this.logger.log(`Group handle '${text}' submitted by ${telegramUserId} and request updated.`);
            return; // Handled as group handle submission
          } else {
            // Log if it starts with @ but doesn't match criteria (e.g., no pending request, or handle already submitted)
            this.logger.log(`Received message starting with @ from ${telegramUserId}, but not a valid pending group handle submission: ${text}`);
          }
        } catch (error) {
          this.logger.error(`Error processing potential group handle for user ${telegramUserId}:`, error);
          // Optionally, send an error message to the user
          // this.bot.sendMessage(chatId, 'There was an error processing your message. Please try again.');
        }
      } else {
        // Existing console.log or other general message handling can go here
        this.logger.log(`Received non-handle message from ${telegramUserId} in chat ${chatId}: ${text}`);
        // this.bot.sendMessage(chatId, 'Received your message'); // Keep this commented or remove if not needed
      }
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
