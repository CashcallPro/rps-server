import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api'; // Use * as import
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { RevshareService } from '../revshare/revshare.service';
import { Revshare } from 'src/revshare/schemas/revshare.schema';
import { messagesEn } from 'src/i18n/en';
import { encryptForUrl } from 'src/utils/crypt';

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: TelegramBot;
  private botInstanceId: number; // Added
  private readonly botToken: string | undefined;
  private readonly gameShortName: string | undefined;
  private readonly telegramGameUrl: string | undefined;
  private readonly referralBonus: number | undefined;
  private readonly referreBonus: number | undefined;
  private readonly wishlistPhoto: string | undefined;

  constructor(
    private configService: ConfigService,
    private readonly userService: UsersService,
    private readonly revshareService: RevshareService,
  ) {

    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.gameShortName = this.configService.get<string>('TELEGRAM_GAME_SHORTNAME');
    this.telegramGameUrl = this.configService.get<string>('TELEGRAM_GAME_URL');
    this.referralBonus = this.configService.get<number>('REFERRAL_BONUS');
    this.referreBonus = this.configService.get<number>('REFERRE_BONUS');
    this.wishlistPhoto = this.configService.get<string>('WISHLIST_PHOTO');

    if (!this.botToken) {
      throw new Error('BOT_TOKEN is not defined in environment variables for BotService');
    }
    if (!this.gameShortName) {
      throw new Error('GAME_SHORT_NAME is not defined in environment variables for BotService');
    }
    if (!this.telegramGameUrl) {
      throw new Error('TELEGRAM_GAME_URL is not defined in environment variables for BotService');
    }
    if (!this.referralBonus) {
      throw new Error('REFERRAL_BONUS is not defined in environment variables for BotService');
    }
    if (!this.referreBonus) {
      throw new Error('REFERRE_BONUS is not defined in environment variables for BotService');
    }
    if (!this.wishlistPhoto) {
      throw new Error('WISHLIST_PHOTO is not defined in environment variables for BotService');
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

      const welcomeMessage: string = messagesEn.WELCOME_MESSAGE;

      const options: TelegramBot.SendMessageOptions = {
        // You can use 'HTML' or 'MarkdownV2' for text formatting
        // parse_mode: 'HTML', // Example: if you wanted to use <b>bold</b> tags

        reply_markup: {
          inline_keyboard: [
            // Each array within inline_keyboard represents a row of buttons
            [
              { text: messagesEn.WISHLIST_BUTTON, callback_data: 'wishlist' } // Replace with actual URL
            ],
            [
              { text: messagesEn.JOIN_CHANNEL_BUTTON, url: 'https://t.me/rps_titans' } // Replace with actual URL
            ],
            [
              { text: messagesEn.REFERRAL_BUTTON, callback_data: 'request_referral_link' }
            ],
            [
              { text: messagesEn.EARN_MORE_BUTTON, callback_data: 'earn_more_options' }
            ],
            [ // New row for language buttons
              { text: messagesEn.RUSSIAN_BUTTON, url: 'https://t.me/rpstitans/2' },
              { text: messagesEn.PERSIAN_BUTTON, url: 'https://t.me/rpstitans/3' },
              { text: messagesEn.TURKISH_BUTTON, url: 'https://t.me/rpstitans/4' }
            ]
          ]
        }
      };

      if (referralCode == userId) {
        this.sendMessage(chatId, messagesEn.CANT_REFER_SELF);
        return
      }

      const userExists = await this.userService.findOneByTelegramUserId(userId)

      if (userExists) {
        // this.sendMessage(chatId, messagesEn.ALREADY_JOINED);
        // Welcome message will be sent after this block
      } else {
        // Create user only if they don't exist
        const user: CreateUserDto = {
          coins: this.referralBonus!,
          username: username,
          telegramUserId: userId,
        }

        if (referralCode) {
          user.refereeId = referralCode
          const refereeUser = await this.userService.findOneByTelegramUserId(referralCode)
          if (refereeUser) {
            this.userService.updateByTelegramId(referralCode, { referralToAdd: userId })
            this.userService.addCoins(refereeUser.username, this.referreBonus!)
            this.sendMessage(chatId, messagesEn.JOINED_WITH_REFERRAL(refereeUser?.username || '', this.referralBonus!));
            this.sendMessage(refereeUser.telegramUserId, messagesEn.NEW_REFERRAL(user.username, this.referreBonus!))
          }
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
      const message = messagesEn.REFERRAL_LINK_MESSAGE(msg.from?.id || '');
      this.sendMessage(msg.chat.id, message);
    })

    this.bot.on("callback_query", async (callbackQuery) => {
      if (callbackQuery.data === 'request_referral_link') {
        const chatId = callbackQuery.message?.chat.id;
        const userId = callbackQuery.from.id;

        if (chatId) {
          const message = messagesEn.REFERRAL_LINK_MESSAGE(userId);
          this.bot.sendMessage(chatId, message);
          this.bot.answerCallbackQuery(callbackQuery.id); // Acknowledge
          return; // Handled, no further processing needed for this callback type
        } else {
          this.logger.warn(`ChatId not available for callback_query 'request_referral_link' from user ${userId}`);
          this.bot.answerCallbackQuery(callbackQuery.id, { text: messagesEn.ERROR_PROCESSING_REFERRAL_REQUEST });
          return; // Handled
        }
      }

      else if (callbackQuery.data === 'wishlist') {
        const chatId = callbackQuery.message?.chat.id;
        const telegramUserId = callbackQuery.from.id.toString()
        if (chatId && telegramUserId && this.wishlistPhoto) {
          const user = await this.userService.findOneByTelegramUserId(telegramUserId)
          if (!user) {
            this.bot.answerCallbackQuery(callbackQuery.id)
            return
          }
          const alreadyWishlisted = user?.badges.find((badge) => badge === 'og')

          if (!alreadyWishlisted) {
            await this.userService.updateByTelegramId(telegramUserId, { badgeToAdd: 'og' })
            this.bot.sendPhoto(chatId, this.wishlistPhoto, { caption: messagesEn.WISHLIST_SUCCESS(user?.username) })
          }
        }
        this.bot.answerCallbackQuery(callbackQuery.id)
        return;
      }

      else if (callbackQuery.data === 'earn_more_options') {
        const chatId = callbackQuery.message?.chat.id;
        if (chatId) {
          const messageText: string = messagesEn.REV_SHARE_INFO;
          const messageOptions: TelegramBot.SendMessageOptions = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: messagesEn.PARTNER_YES_BUTTON, callback_data: 'partner_yes' },
                  { text: messagesEn.PARTNER_NO_BUTTON, callback_data: 'partner_no' }
                ]
              ]
            }
          };
          this.bot.sendMessage(chatId, messageText, messageOptions);
          this.bot.answerCallbackQuery(callbackQuery.id); // Acknowledge the 'Earn More' button press
        } else {
          this.logger.warn(`ChatId not available for callback_query 'earn_more_options' from user ${callbackQuery.from.id}`);
          this.bot.answerCallbackQuery(callbackQuery.id, { text: messagesEn.ERROR_COULD_NOT_PROCESS_REQUEST });
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
              this.bot.sendMessage(chatId, messagesEn.REV_SHARE_REQUEST_PROCESSING);
            } else {
              await this.revshareService.createRequest(telegramUserId, undefined, undefined, 'Initial request from partner_yes');
              const instructions = messagesEn.PARTNER_INSTRUCTIONS;
              this.bot.sendMessage(chatId, instructions);
            }
            this.bot.answerCallbackQuery(callbackQuery.id);
          } catch (error) {
            this.logger.error(`Error processing 'partner_yes' for user ${telegramUserId}:`, error);
            this.bot.answerCallbackQuery(callbackQuery.id, { text: messagesEn.ERROR_TRY_AGAIN });
          }
        } else {
          this.logger.warn(`ChatId not available for callback_query 'partner_yes' from user ${telegramUserId}`);
          this.bot.answerCallbackQuery(callbackQuery.id, { text: messagesEn.ERROR_COULD_NOT_PROCESS_REQUEST });
        }
        return; // Handled
      }

      else if (callbackQuery.data === 'partner_no') {
        const chatId = callbackQuery.message?.chat.id;
        if (chatId) {
          this.sendMessage(chatId, messagesEn.PARTNER_NO_MESSAGE)
        }
        this.bot.answerCallbackQuery(callbackQuery.id)
        return
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

      const encryptedUrl = encryptForUrl(this.configService.getOrThrow('HASH_KEY'), query)

      if (chatId) {

        await this.sendMessage(chatId, encryptedUrl)
        const url = `${this.telegramGameUrl}?${encryptedUrl}`
        this.sendMessage(chatId, url)
      }

      this.bot.answerCallbackQuery(callbackQuery.id, { url: 'google.com' });
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
              // Condition: Update if pending and (groupId isn't set OR (group has a username AND groupUsername isn't set in request))
              if (request && request.status === 'pending' && (!request.groupId || (msg.chat.username && !request.groupUsername))) {
                const updateData: Partial<Omit<Revshare, 'telegramUserId' | 'status'>> = { // Omit status as well, not changing it here
                  groupId: groupId,
                  message: request.message || '', // Preserve existing message or initialize
                };

                const chatUsername = msg.chat.username; // From Telegram API, no '@'
                let messageUpdate = `Bot added to group: ${groupTitle} (${groupId}) by ${adderUserId}.`;

                if (chatUsername) {
                  updateData.groupUsername = chatUsername;
                  updateData.groupHandle = `@${chatUsername}`; // Add '@' for groupHandle
                  messageUpdate += ` Group username: @${chatUsername}.`;
                  this.logger.log(`Group '${groupTitle}' (ID: ${groupId}) has username: '${chatUsername}'. Will update revshare request.`);
                } else {
                  messageUpdate += ` Group has no username.`;
                  this.logger.log(`Group '${groupTitle}' (ID: ${groupId}) does not have a username. Only groupId will be updated (if missing).`);
                }

                // Append to existing message or set if new
                updateData.message = request.message ? `${request.message}; ${messageUpdate}` : messageUpdate;

                await this.revshareService.updateRequest(adderUserId, updateData);
                this.logger.log(`Revshare request for ${adderUserId} updated with groupId ${groupId}` + (chatUsername ? ` and groupUsername '${chatUsername}'` : '') + `.`);

                // Now send confirmation to the user who added the bot
                try {
                  const finalMessageToUser = messagesEn.BOT_ADDED_TO_GROUP_CONFIRMATION(groupTitle || 'Unnamed Group');
                  await this.sendMessage(adderUserId, finalMessageToUser);
                  this.logger.log(`"Bot added to group" confirmation sent to user ${adderUserId}.`);
                } catch (messageError) {
                  this.logger.error(`Failed to send "Bot added to group" confirmation to user ${adderUserId}: ${messageError.message}`, messageError.stack);
                  // Do not rethrow, the main operation (DB update) was successful.
                }

                return; // Message handled
              } else if (request && request.status === 'pending') {
                // Log why no update happened if it was pending
                let logReason = `Revshare request for ${adderUserId} (group ${groupId}) not updated:`;
                if (request.groupId) logReason += ` groupId already exists (${request.groupId}).`;
                if (msg.chat.username && request.groupUsername) logReason += ` groupUsername already exists (${request.groupUsername}).`;
                if (!msg.chat.username && request.groupId) logReason += ` Group has no username and groupId already exists.`;
                this.logger.log(logReason);
              }
              else if (!request) {
                this.logger.log(`No pending revshare request found for user ${adderUserId} who added bot to group ${groupId}.`);
              } else { // Request exists but not pending
                this.logger.log(`Revshare request for ${adderUserId} is not in 'pending' state (status: ${request.status}). No update for group ${groupId}.`);
              }
            } catch (error) {
              this.logger.error(`Error updating revshare request with groupId/groupUsername for user ${adderUserId} and group ${groupId}:`, error);
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


      // Ensure telegramUserId is available. Note: `text` might be undefined for some message types
      // (e.g., when a user joins a group, there's no `msg.text`).
      // The "bot added to group" logic above handles messages where `msg.new_chat_members` is present.
      // Other message types that are not simple text messages might also not have `msg.text`.
      if (!telegramUserId) {
        this.logger.log('Message received without a `from.id` (telegramUserId). Skipping further processing in this handler.');
        return;
      }

      // If 'text' is not defined (e.g. for photo, sticker, user joining/leaving messages etc.),
      // and it wasn't handled by the "bot added to group" logic, then there's nothing more for this handler to do.
      if (typeof text === 'undefined') {
        // this.logger.log(`Received message of non-text type from ${telegramUserId} in chat ${chatId}. No text to process for @handle or other commands.`);
        return;
      }

      // At this point, telegramUserId and text are defined.
      // Any other specific command or text processing can go here.
      // For example, if you had other commands like /mygroupinfo etc.

      // Fallback logging for any text messages not handled by specific logic above.
      this.logger.log(`Received unhandled text message from ${telegramUserId} in chat ${chatId}: ${text}`);
      // this.bot.sendMessage(chatId, 'Received your message'); // Original placeholder, remove if not needed
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
  async sendMessage(chatId: number | string, text: string, options?: TelegramBot.SendMessageOptions) {
    if (!this.bot) {
      this.logger.error('Bot not initialized. Cannot send message.');
      throw new Error('Bot not initialized.');
    }
    try {
      return this.bot.sendMessage(chatId, text, options);
    } catch (e) {
      this.logger.error('Failed to send message', e)
    }
  }
}
