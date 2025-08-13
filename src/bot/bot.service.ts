import { Injectable, OnModuleInit, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api'; // Use * as import
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { RevshareService } from '../revshare/revshare.service';
import { Revshare } from 'src/revshare/schemas/revshare.schema';
import { getMessages } from 'src/i18n';
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
    this.referreBonus = this.configService.get<number>('REFEREE_BONUS');
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
      throw new Error('REFEREE_BONUS is not defined in environment variables for BotService');
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

    this.bot.onText(/\/optimusprime/, (msg) => {
      const chatId = msg.chat.id;
      this.logger.log(`Received /optimusprime from chat ${chatId}. Sending game: ${this.gameShortName}`);
      this.bot.sendGame(chatId, this.gameShortName!)
        .then(() => {
          this.logger.log(`Game "${this.gameShortName}" sent to chat ${chatId}`)
        })
        .catch(err => this.logger.error(`Error sending game to ${chatId}:`, err.response?.body || err.message || err));
    });

    this.bot.onText(/\/play/, (msg) => {
      const chatId = msg.chat.id;
      this.logger.log(`Received /playgame from chat ${chatId}. Sending game: ${this.gameShortName}`);
      this.sendMessage(chatId, '⚔️ RPS Titans — Coming Soon')
      return
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

      const userExists = await this.userService.findOneByTelegramUserId(userId);

      if (userExists && userExists.language) {
        // If the user exists and has a language set, send the welcome message directly
        this.sendWelcomeMessage(chatId, userExists.language);
      } else {
        // If the user is new or hasn't selected a language, send the language selection message
        this.sendLanguageSelection(chatId);
      }

      if (referralCode == userId) {
        this.sendMessage(chatId, getMessages('en').CANT_REFER_SELF);
        return
      }

      if (!userExists) {
        // Create user only if they don't exist
        const user: CreateUserDto = {
          coins: this.referralBonus!,
          username: username,
          telegramUserId: userId,
        }

        if (referralCode) {
          user.pendingReferralCode = referralCode;
        }
        await this.userService.create(user)
      }
    });

    this.bot.onText(/\/refer/, async (msg) => {
      if (!msg.from) return;
      const user = await this.userService.findOneByTelegramUserId(msg.from.id.toString());
      const messages = getMessages(user?.language || 'en');
      const message = messages.REFERRAL_LINK_MESSAGE(msg.from?.id || '');
      this.sendMessage(msg.chat.id, message);
    })

    this.bot.on("callback_query", async (callbackQuery) => {
      if (callbackQuery.data && callbackQuery.data.startsWith('set_language_')) {
        const lang = callbackQuery.data.split('_')[2];
        if (!callbackQuery.message) return;
        const chatId = callbackQuery.message.chat.id;
        const userId = callbackQuery.from.id.toString();

        const user = await this.userService.findOneByTelegramUserId(userId);
        if (user) {
          await this.userService.updateByTelegramId(userId, { language: lang });
          if (user.pendingReferralCode) {
            const refereeUser = await this.userService.findOneByTelegramUserId(user.pendingReferralCode);
            if (refereeUser) {
              const messages = getMessages(lang);
              const refereeMessages = getMessages(refereeUser.language || 'en');

              this.userService.updateByTelegramId(refereeUser.telegramUserId, { referralToAdd: userId });
              this.userService.addCoins(refereeUser.username, this.referreBonus!);
              this.userService.updateByTelegramId(userId, { refereeId: refereeUser.telegramUserId, pendingReferralCode: '' });

              this.sendMessage(chatId, messages.JOINED_WITH_REFERRAL(refereeUser.username, this.referralBonus!));
              this.sendMessage(refereeUser.telegramUserId, refereeMessages.NEW_REFERRAL(user.username, this.referreBonus!));
            }
          }
        }

        this.sendWelcomeMessage(chatId, lang);
        this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }
      else if (callbackQuery.data === 'request_referral_link') {
        const chatId = callbackQuery.message?.chat.id;
        const userId = callbackQuery.from.id;

        if (chatId) {
          const user = await this.userService.findOneByTelegramUserId(userId.toString());
          const messages = getMessages(user?.language || 'en');
          const message = messages.REFERRAL_LINK_MESSAGE(userId);
          this.bot.sendMessage(chatId, message);
          this.bot.answerCallbackQuery(callbackQuery.id); // Acknowledge
          return; // Handled, no further processing needed for this callback type
        } else {
          this.logger.warn(`ChatId not available for callback_query 'request_referral_link' from user ${userId}`);
          this.bot.answerCallbackQuery(callbackQuery.id, { text: getMessages('en').ERROR_PROCESSING_REFERRAL_REQUEST });
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
          const messages = getMessages(user.language || 'en');
          const alreadyWishlisted = user?.badges.find((badge) => badge === 'og')

          if (!alreadyWishlisted) {
            await this.userService.updateByTelegramId(telegramUserId, { badgeToAdd: 'og' })
            this.bot.sendPhoto(chatId, this.wishlistPhoto, { caption: messages.WISHLIST_SUCCESS(user?.username) })
          }
        }
        this.bot.answerCallbackQuery(callbackQuery.id)
        return;
      }

      else if (callbackQuery.data === 'earn_more_options') {
        const chatId = callbackQuery.message?.chat.id;
        if (chatId) {
          const user = await this.userService.findOneByTelegramUserId(callbackQuery.from.id.toString());
          const messages = getMessages(user?.language || 'en');
          const messageText: string = messages.REV_SHARE_INFO;
          const messageOptions: TelegramBot.SendMessageOptions = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: messages.PARTNER_YES_BUTTON, callback_data: 'partner_yes' },
                  { text: messages.PARTNER_NO_BUTTON, callback_data: 'partner_no' }
                ]
              ]
            }
          };
          this.bot.sendMessage(chatId, messageText, messageOptions);
          this.bot.answerCallbackQuery(callbackQuery.id); // Acknowledge the 'Earn More' button press
        } else {
          this.logger.warn(`ChatId not available for callback_query 'earn_more_options' from user ${callbackQuery.from.id}`);
          this.bot.answerCallbackQuery(callbackQuery.id, { text: getMessages('en').ERROR_COULD_NOT_PROCESS_REQUEST });
        }
        return; // Handled
      }

      else if (callbackQuery.data === 'partner_yes') {
        const chatId = callbackQuery.message?.chat.id;
        const telegramUserId = callbackQuery.from.id.toString();

        if (chatId) {
          try {
            const user = await this.userService.findOneByTelegramUserId(telegramUserId);
            const messages = getMessages(user?.language || 'en');
            const existingRequest = await this.revshareService.findRequestByTelegramUserId(telegramUserId);
            if (existingRequest) {

              if (existingRequest.status === 'approved') {
                this.bot.sendMessage(chatId, messages.REV_SHARE_REQUEST_APPROVED);
                this.bot.answerCallbackQuery(callbackQuery.id);
                return
              }

              this.bot.sendMessage(chatId, messages.REV_SHARE_REQUEST_PROCESSING);
            } else {
              await this.revshareService.createRequest(telegramUserId, undefined, undefined, 'Initial request from partner_yes');
              const instructions = messages.PARTNER_INSTRUCTIONS;
              this.bot.sendMessage(chatId, instructions);
            }
            this.bot.answerCallbackQuery(callbackQuery.id);
          } catch (error) {
            this.logger.error(`Error processing 'partner_yes' for user ${telegramUserId}:`, error);
            this.bot.answerCallbackQuery(callbackQuery.id, { text: getMessages('en').ERROR_TRY_AGAIN });
          }
        } else {
          this.logger.warn(`ChatId not available for callback_query 'partner_yes' from user ${telegramUserId}`);
          this.bot.answerCallbackQuery(callbackQuery.id, { text: getMessages('en').ERROR_COULD_NOT_PROCESS_REQUEST });
        }
        return; // Handled
      }

      else if (callbackQuery.data === 'partner_no') {
        const chatId = callbackQuery.message?.chat.id;
        if (chatId) {
          const user = await this.userService.findOneByTelegramUserId(callbackQuery.from.id.toString());
          const messages = getMessages(user?.language || 'en');
          this.sendMessage(chatId, messages.PARTNER_NO_MESSAGE)
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
        const url = `${this.telegramGameUrl}?${encryptedUrl}`
        this.bot.answerCallbackQuery(callbackQuery.id, { url });
      }
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
                  const user = await this.userService.findOneByTelegramUserId(adderUserId);
                  const messages = getMessages(user?.language || 'en');
                  const finalMessageToUser = messages.BOT_ADDED_TO_GROUP_CONFIRMATION(groupTitle || 'Unnamed Group');
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

    // disabled inline_query for now
    // this.bot.on('inline_query', (query) => {

    //   const inlineQueryId = query.id;
    //   this.logger.log(`Received inline query (ID: ${inlineQueryId}) for game: ${this.gameShortName}`);
    //   const results: TelegramBot.InlineQueryResult[] = [{
    //     type: 'game',
    //     id: '1', // Unique ID for this result
    //     game_short_name: this.gameShortName!,
    //   }];
    //   this.bot.answerInlineQuery(inlineQueryId, results)
    //     .then(() => this.logger.log(`Answered inline query ${inlineQueryId} with game ${this.gameShortName}`))
    //     .catch(err => this.logger.error("Error answering inline query:", err.response?.body || err.message || err));
    // });

    this.bot.on('polling_error', (error) => {
      this.logger.error(`Telegram Polling Error: ${error.message}`, error);
      // You might want to add more sophisticated error handling here,
      // like attempting to restart polling after a delay, or notifying an admin.
    });

    this.logger.log(`Telegram bot initialized with game short name: ${this.gameShortName}. Listening for commands...`);
  }

  private async sendLanguageSelection(chatId: number | string) {
    const options: TelegramBot.SendMessageOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'English', callback_data: 'set_language_en' },
            { text: 'Русский', callback_data: 'set_language_ru' },
          ],
          [
            { text: 'Türkiye', callback_data: 'set_language_tr' },
            { text: 'فارسی', callback_data: 'set_language_fa' },
          ],
        ],
      },
    };
    this.bot.sendMessage(chatId, 'Please select your language:', options);
  }

  private async sendWelcomeMessage(chatId: number | string, language: string) {
    const messages = getMessages(language);
    const welcomeMessage: string = messages.WELCOME_MESSAGE;

    const options: TelegramBot.SendMessageOptions = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: messages.WISHLIST_BUTTON, callback_data: 'wishlist' }
          ],
          [
            { text: messages.JOIN_CHANNEL_BUTTON, url: 'https://t.me/rps_titans' },
            { text: messages.COMMUNITY_BUTTON, url: 'https://t.me/rpstitans' }
          ],
          [
            { text: messages.REFERRAL_BUTTON, callback_data: 'request_referral_link' }
          ],
          [
            { text: messages.EARN_MORE_BUTTON, callback_data: 'earn_more_options' }
          ],
        ]
      }
    };
    this.bot.sendMessage(chatId, welcomeMessage, options);
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

  async sendPhoto(chatId: number | string, caption: string, photo: string) {
    if (!this.bot) {
      this.logger.error('Bot not initialized. Cannot send message.');
      throw new Error('Bot not initialized.');
    }
    try {
      return this.bot.sendPhoto(chatId, photo, { caption })
    } catch (e) {
      this.logger.error('Failed to send photo', e)
    }
  }
}
