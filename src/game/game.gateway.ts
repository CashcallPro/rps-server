import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.provider';
import { Player } from 'src/types/player';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
import { AdminService } from 'src/admin/admin.service';
import { BotService } from 'src/bot/bot.service';
import { RevshareService } from 'src/revshare/revshare.service';
import { messagesEn } from 'src/i18n/en';

type Choice = 'rock' | 'paper' | 'scissors';

const ROUND_BET_AMOUNT = 10;
const PLAYER_FEE = 1; // Each player pays $1
const TOTAL_FEE_PER_ROUND = PLAYER_FEE * 2; // Admin collects $2
const WINNER_AMOUNT_AFTER_FEES = ROUND_BET_AMOUNT - TOTAL_FEE_PER_ROUND; // Winner gets $8

interface Score {
  [playerId: string]: number;
}

interface SessionData {
  players: Player[];
  startTime: number;
  choices: { [socketId: string]: Choice | null };
  lastActivity: number;
  scores: Score;
  isBotGame?: boolean;
  groupOwners?: number[]
}

@WebSocketGateway({ cors: true })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);

  private readonly turnTimeoutDuration: number;
  private readonly matchmakingBotTimeout: number;
  private matchmakingQueue: Player[] = [];
  private activeTurnTimers: Map<string, NodeJS.Timeout> = new Map();
  private socketToSessionMap: Map<string, string> = new Map();
  private matchmakingBotTimers: Map<string, NodeJS.Timeout> = new Map();

  private readonly BOT_ID_PREFIX = 'bot_';
  // Updated: Array of bot names
  private readonly BOT_USERNAMES: string[] = [
    'RoboPlayer',
    'AI Challenger',
    'Silicon Fists',
    'LogicLord',
    'ByteMasher',
    'The Strategist Bot',
    'Pixel Pummeler',
  ];


  constructor(
    private readonly redisService: RedisService,
    private configService: ConfigService,
    private userService: UsersService,
    private adminService: AdminService,
    private botService: BotService,
    private readonly revshareService: RevshareService,
  ) {
    const configuredTurnTimeout = this.configService.get<string>('TURN_TIMEOUT_DURATION_MS');
    if (!configuredTurnTimeout) {
      this.logger.warn('TURN_TIMEOUT_DURATION_MS not found in config, defaulting to 5000ms');
      this.turnTimeoutDuration = 5000;
    } else {
      this.turnTimeoutDuration = parseInt(configuredTurnTimeout, 10);
      if (isNaN(this.turnTimeoutDuration)) {
        this.logger.error('Invalid TURN_TIMEOUT_DURATION_MS in config, defaulting to 5000ms');
        this.turnTimeoutDuration = 5000;
      }
    }

    const configuredBotTimeout = this.configService.get<string>('MATCHMAKING_BOT_TIMEOUT_MS');
    if (!configuredBotTimeout) {
      this.logger.warn('MATCHMAKING_BOT_TIMEOUT_MS not found in config, defaulting to 10000ms');
      this.matchmakingBotTimeout = 10000;
    } else {
      this.matchmakingBotTimeout = parseInt(configuredBotTimeout, 10);
      if (isNaN(this.matchmakingBotTimeout)) {
        this.logger.error('Invalid MATCHMAKING_BOT_TIMEOUT_MS in config, defaulting to 10000ms');
        this.matchmakingBotTimeout = 10000;
      }
    }
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
    this.logger.log(`Turn Timeout: ${this.turnTimeoutDuration}ms, Bot Matchmaking Timeout: ${this.matchmakingBotTimeout}ms`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  private generateTimerKey(sessionId: string, waitingPlayerSocketId: string): string {
    return `${sessionId}_${waitingPlayerSocketId}_turntimer`;
  }

  private clearPlayerTurnTimer(sessionId: string, waitingPlayerSocketId: string) {
    const timerKey = this.generateTimerKey(sessionId, waitingPlayerSocketId);
    const existingTimer = this.activeTurnTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.activeTurnTimers.delete(timerKey);
      this.logger.log(`Cleared turn timer for key: ${timerKey}`);
    }
  }

  private clearAllTimersForSession(sessionId: string) {
    const timersToDelete: string[] = [];
    for (const [timerKey, timerId] of this.activeTurnTimers.entries()) {
      if (timerKey.startsWith(sessionId + '_')) {
        clearTimeout(timerId);
        timersToDelete.push(timerKey);
      }
    }
    timersToDelete.forEach(key => {
      this.activeTurnTimers.delete(key);
      this.logger.log(`Cleared timer ${key} for session ${sessionId} during session cleanup.`);
    });
  }

  private determineOutcome(player1Choice: Choice, player2Choice: Choice): 'win' | 'loss' | 'tie' {
    if (player1Choice === player2Choice) return 'tie';
    if (
      (player1Choice === 'rock' && player2Choice === 'scissors') ||
      (player1Choice === 'paper' && player2Choice === 'rock') ||
      (player1Choice === 'scissors' && player2Choice === 'paper')
    ) {
      return 'win';
    }
    return 'loss';
  }

  private async processRoundCompletion(
    sessionData: SessionData,
    sessionId: string,
    player1SocketId: string, player1Choice: Choice | null, // Renamed for clarity
    player2SocketId: string, player2Choice: Choice | null, // Renamed for clarity
    reasonPlayer1: string,
    reasonPlayer2: string,
    isBotRound?: boolean,
  ) {
    const player1Info = sessionData.players.find(p => p.socketId === player1SocketId);
    const player2Info = sessionData.players.find(p => p.socketId === player2SocketId);

    if (!player1Info || !player2Info) {
      this.logger.error(`Players not found in processRoundCompletion for session ${sessionId}`);
      return;
    }

    let player1ResultMsg: string;
    let player2ResultMsg: string;
    // Initialize winner/loser
    let winnerSocketId: string | null = null;
    let loserSocketId: string | null = null;
    let isActualTie = false; // Flag for actual ties, not just default messages

    if (!sessionData.scores) {
      this.logger.warn(`Scores object missing in sessionData for session ${sessionId}. Initializing.`);
      sessionData.scores = {
        [player1SocketId]: 0,
        [player2SocketId]: 0,
      };
    }
    if (sessionData.scores[player1SocketId] === undefined) sessionData.scores[player1SocketId] = 0;
    if (sessionData.scores[player2SocketId] === undefined) sessionData.scores[player2SocketId] = 0;

    if (!player1Choice) { // Player 2 wins by P1 timeout/no choice
      winnerSocketId = player2SocketId;
      loserSocketId = player1SocketId;
      player1ResultMsg = messagesEn.LOST_ROUND_DEFAULT(ROUND_BET_AMOUNT, reasonPlayer1);
      player2ResultMsg = messagesEn.WON_ROUND_DEFAULT(WINNER_AMOUNT_AFTER_FEES, reasonPlayer2);
      sessionData.scores[player2SocketId]++;
    } else if (!player2Choice) { // Player 1 wins by P2 timeout/no choice
      winnerSocketId = player1SocketId;
      loserSocketId = player2SocketId;
      player1ResultMsg = messagesEn.WON_ROUND_DEFAULT(WINNER_AMOUNT_AFTER_FEES, reasonPlayer1);
      player2ResultMsg = messagesEn.LOST_ROUND_DEFAULT(ROUND_BET_AMOUNT, reasonPlayer2);
      sessionData.scores[player1SocketId]++;
    } else { // Both players made choices
      const outcomeForPlayer1 = this.determineOutcome(player1Choice, player2Choice);
      if (outcomeForPlayer1 === 'win') {
        winnerSocketId = player1SocketId;
        loserSocketId = player2SocketId;
        player1ResultMsg = messagesEn.WON_ROUND(WINNER_AMOUNT_AFTER_FEES);
        player2ResultMsg = messagesEn.LOST_ROUND(ROUND_BET_AMOUNT);
        sessionData.scores[player1SocketId]++;
      } else if (outcomeForPlayer1 === 'loss') {
        winnerSocketId = player2SocketId;
        loserSocketId = player1SocketId;
        player1ResultMsg = messagesEn.LOST_ROUND(ROUND_BET_AMOUNT);
        player2ResultMsg = messagesEn.WON_ROUND(WINNER_AMOUNT_AFTER_FEES);
        sessionData.scores[player2SocketId]++;
      } else { // Actual Tie
        isActualTie = true;
        player1ResultMsg = messagesEn.ROUND_TIE;
        player2ResultMsg = messagesEn.ROUND_TIE;
        // No score change in a tie, no winner/loser for coin purposes
      }
    }

    // Perform coin transactions and fee collection only if NOT a bot game AND NOT an actual tie AND there's a winner/loser
    if (!isBotRound && !isActualTie && winnerSocketId && loserSocketId) {
      const winnerInfo = sessionData.players.find(p => p.socketId === winnerSocketId);
      const loserInfo = sessionData.players.find(p => p.socketId === loserSocketId);

      if (winnerInfo && loserInfo) {
        try {
          await this.userService.removeCoins(loserInfo.username, ROUND_BET_AMOUNT);
          this.logger.log(`Deducted ${ROUND_BET_AMOUNT} coins from loser ${loserInfo.username} in session ${sessionId}.`);

          try {
            await this.userService.addCoins(winnerInfo.username, WINNER_AMOUNT_AFTER_FEES);
            this.logger.log(`Added ${WINNER_AMOUNT_AFTER_FEES} coins to winner ${winnerInfo.username} in session ${sessionId}.`);

            // New Group Owner Bonus Logic & Adjusted Admin Fee Payment
            let adminFeeForThisRound = TOTAL_FEE_PER_ROUND; // Default admin fee
            const groupOwnerBonusPerOwner = 0.5; // Bonus per unique owner

            if (sessionData.groupOwners && Array.isArray(sessionData.groupOwners) && sessionData.groupOwners.length > 0) {
              // Filter for valid, unique numeric IDs.
              const uniqueOwnerIds = new Set(sessionData.groupOwners.filter(id => id !== null && id !== undefined));

              if (uniqueOwnerIds.size > 0) {
                const totalBonusAmount = uniqueOwnerIds.size * groupOwnerBonusPerOwner;
                this.logger.log(`Processing group owner bonuses for session ${sessionId}. Unique owners: ${uniqueOwnerIds.size}, Total calculated bonus: ${totalBonusAmount}`);

                adminFeeForThisRound = Math.max(0, TOTAL_FEE_PER_ROUND - totalBonusAmount);
                this.logger.log(`Admin fee before bonus: ${TOTAL_FEE_PER_ROUND}, Total bonus: ${totalBonusAmount}, Admin fee after bonus: ${adminFeeForThisRound}`);

                for (const ownerId of uniqueOwnerIds) {
                  try {
                    // Convert ownerId to string for the service call, as telegramUserId is expected as string.
                    const ownerUser = await this.userService.findOneByTelegramUserId(ownerId.toString());
                    if (ownerUser) {
                      await this.userService.addCoins(ownerUser.username, groupOwnerBonusPerOwner);
                      this.botService.sendMessage(ownerId, messagesEn.GROUP_OWNER_BONUS_NOTIFICATION(groupOwnerBonusPerOwner, player1Info.username, player2Info.username));
                      this.logger.log(`Successfully distributed ${groupOwnerBonusPerOwner} bonus to group owner ${ownerUser.username} (Telegram ID: ${ownerId}) for session ${sessionId}.`);
                    } else {
                      this.logger.warn(`Group owner with Telegram ID ${ownerId} not found. Bonus of ${groupOwnerBonusPerOwner} for session ${sessionId} will not be distributed to this owner.`);
                    }
                  } catch (error) {
                    this.logger.error(`Failed to find or distribute bonus to group owner (Telegram ID: ${ownerId}) for session ${sessionId}: ${error.message}`, error.stack);
                    // Decide if this error should be part of the addOrAdminError to trigger refund.
                    // For now, individual owner bonus failure does not stop others or admin fee.
                  }
                }
              } else {
                this.logger.log(`No valid (numeric, non-null) group owner IDs found in sessionData.groupOwners for session ${sessionId}. No bonuses paid.`);
              }
            } else {
              this.logger.log(`No groupOwners array, or it's empty/invalid in sessionData for session ${sessionId}. No bonuses to process.`);
            }

            // Update admin coins with the (potentially reduced) fee
            if (adminFeeForThisRound > 0) {
              await this.adminService.updateAdminCoins(adminFeeForThisRound);
              this.logger.log(`Added ${adminFeeForThisRound} coins to admin for session ${sessionId} (after potential owner bonuses).`);
            } else {
              this.logger.log(`Admin fee is 0 or less for session ${sessionId} after owner bonuses. No coins added to admin.`);
            }
            // End of New Group Owner Bonus Logic & Adjusted Admin Fee Payment

            // Player messages for win/loss are already set above,
            // but we might need to re-affirm them here if they were default messages
            // and now we are confirming the amounts after successful transactions.
            // This part might need slight adjustment if default messages were too generic.
            // For now, assuming the messages set when winner/loserSocketId are determined are sufficient.
            // Re-setting messages explicitly here if they were default, to confirm amounts.
            if (player1Choice && !player2Choice) { // P1 won by P2 default
              player1ResultMsg = messagesEn.WON_ROUND_DEFAULT(WINNER_AMOUNT_AFTER_FEES, reasonPlayer1);
              player2ResultMsg = messagesEn.LOST_ROUND_DEFAULT(ROUND_BET_AMOUNT, reasonPlayer2);
            } else if (!player1Choice && player2Choice) { // P2 won by P1 default
              player1ResultMsg = messagesEn.LOST_ROUND_DEFAULT(ROUND_BET_AMOUNT, reasonPlayer1);
              player2ResultMsg = messagesEn.WON_ROUND_DEFAULT(WINNER_AMOUNT_AFTER_FEES, reasonPlayer2);
            } // If both chose, messages are already accurate.


          } catch (addOrAdminError) {
            this.logger.error(`CRITICAL: Error during coin distribution or admin fee update for session ${sessionId}. Winner: ${winnerInfo.username}, Loser: ${loserInfo.username}. Error: ${addOrAdminError.message}. Attempting to refund loser if possible.`);
            try {
              await this.userService.addCoins(loserInfo.username, ROUND_BET_AMOUNT);
              this.logger.log(`REFUND: Successfully refunded ${ROUND_BET_AMOUNT} coins to loser ${loserInfo.username} due to error in winner/admin transaction.`);
            } catch (refundError) {
              this.logger.error(`CRITICAL REFUND FAILURE: Failed to refund ${loserInfo.username} after an error. Coins might be lost from loser. Error: ${refundError.message}`);
            }
            // Reset messages to reflect error
            player1ResultMsg = messagesEn.ROUND_PROCESSING_ERROR;
            player2ResultMsg = messagesEn.ROUND_PROCESSING_ERROR;
          }
        } catch (removeError) {
          this.logger.warn(`Failed to remove coins from loser ${loserInfo.username} in session ${sessionId} (Potentially insufficient funds or other error): ${removeError.message}`);
          // Update messages to reflect no coins exchanged if deduction failed.
          // Use original player1ResultMsg and player2ResultMsg and append, rather than replacing specific amounts.
          if (winnerSocketId === player1SocketId) {
            player1ResultMsg = (player1ResultMsg.includes('won') ? player1ResultMsg.split('!')[0] : messagesEn.WON_ROUND(0).split('!')[0]) + `! ${messagesEn.OPPONENT_CANT_COVER_BET}`;
            player2ResultMsg = (player2ResultMsg.includes('lost') ? player2ResultMsg.split('.')[0] : messagesEn.LOST_ROUND(0).split('.')[0]) + `. ${messagesEn.BET_VOIDED_INSUFFICIENT_COINS}`;
          } else {
            player2ResultMsg = (player2ResultMsg.includes('won') ? player2ResultMsg.split('!')[0] : messagesEn.WON_ROUND(0).split('!')[0]) + `! ${messagesEn.OPPONENT_CANT_COVER_BET}`;
            player1ResultMsg = (player1ResultMsg.includes('lost') ? player1ResultMsg.split('.')[0] : messagesEn.LOST_ROUND(0).split('.')[0]) + `. ${messagesEn.BET_VOIDED_INSUFFICIENT_COINS}`;
          }
        }
      }
    } else if (isActualTie) {
      this.logger.log(`Round was a tie for session ${sessionId}. No coin transactions or fees applied.`);
    } else if (isBotRound) {
      this.logger.log(`Bot game round completed for session ${sessionId}. No fee processing.`);
    }
    // The rest of processRoundCompletion (emitting results, resetting choices) remains largely the same.

    this.server.to(player1SocketId).emit('round_result', {
      yourChoice: player1Choice,
      opponentChoice: player2Choice,
      result: player1ResultMsg,
      reason: reasonPlayer1 || '',
      scores: {
        currentPlayer: sessionData.scores[player1SocketId],
        opponent: sessionData.scores[player2SocketId],
      },
    });

    if (!player2SocketId.startsWith(this.BOT_ID_PREFIX)) {
      this.server.to(player2SocketId).emit('round_result', {
        yourChoice: player2Choice,
        opponentChoice: player1Choice,
        result: player2ResultMsg,
        reason: reasonPlayer2 || '',
        scores: {
          currentPlayer: sessionData.scores[player2SocketId],
          opponent: sessionData.scores[player1SocketId],
        },
      });
    }

    this.logger.log(`Round result for session ${sessionId}: ${player1Info.username} (${player1Choice || 'timed out'}) vs ${player2Info.username} (${player2Choice || 'timed out'}). Scores: P1=${sessionData.scores[player1SocketId]}, P2=${sessionData.scores[player2SocketId]}`);

    sessionData.choices[player1SocketId] = null;
    sessionData.choices[player2SocketId] = null;
    sessionData.lastActivity = Date.now();
    await this.redisService.set(sessionId, JSON.stringify(sessionData));
    this.logger.log(`Choices reset for session ${sessionId} for next round.`);

    if (!isBotRound) {
      let p1CanContinue = true;
      let p2CanContinue = true;
      let p1Balance = 0;
      let p2Balance = 0;

      try {
        const user1 = await this.userService.findOneByUsername(player1Info.username);
        p1Balance = user1.coins;
        if (user1.coins < ROUND_BET_AMOUNT) p1CanContinue = false;
      } catch (e) { p1CanContinue = false; /* assume cannot continue on error */ }

      try {
        const user2 = await this.userService.findOneByUsername(player2Info.username);
        p2Balance = user2.coins;
        if (user2.coins < ROUND_BET_AMOUNT) p2CanContinue = false;
      } catch (e) { p2CanContinue = false; /* assume cannot continue on error */ }

      if (!p1CanContinue || !p2CanContinue) {
        this.logger.log(`Game in session ${sessionId} to end due to insufficient funds for next round. P1 (${player1Info.username}) can continue: ${p1CanContinue}, P2 (${player2Info.username}) can continue: ${p2CanContinue}.`);
        const endReason = !p1CanContinue && !p2CanContinue ? "Both players have insufficient coins for the next round."
          : !p1CanContinue ? `${player1Info.username} has insufficient coins for the next round.`
            : `${player2Info.username} has insufficient coins for the next round.`;

        // Emit a specific event or use game_ended with a reason
        this.server.to(player1SocketId).emit('game_ended_insufficient_funds', {
          message: messagesEn.GAME_OVER_INSUFFICIENT_FUNDS(endReason, p1Balance),
          canContinue: p1CanContinue,
          session: sessionData
        });
        this.server.to(player2SocketId).emit('game_ended_insufficient_funds', {
          message: messagesEn.GAME_OVER_INSUFFICIENT_FUNDS(endReason, p2Balance),
          canContinue: p2CanContinue,
          session: sessionData
        });

        // Clean up the session
        const playerSocketIdsInSession = sessionData.players.map(p => p.socketId);
        await this.cleanUpSession(sessionId, playerSocketIdsInSession);
        // Note: handleEndGame also calls cleanUpSession. Ensure this doesn't cause issues.
        // It might be better to have cleanUpSession be idempotent or guard against multiple calls.
        // Here, we are ending the game directly, not via a player's 'end_game' message.
      } else {
        // Both can continue, optionally notify them they can start next round
        this.server.to(player1SocketId).emit('next_round_ready', { message: messagesEn.NEXT_ROUND_READY });
        this.server.to(player2SocketId).emit('next_round_ready', { message: messagesEn.NEXT_ROUND_READY });
      }
    } else { // Bot game, always ready for next round from player's perspective
      this.server.to(player1SocketId).emit('next_round_ready', { message: messagesEn.NEXT_ROUND_READY });
    }
  }

  @SubscribeMessage('start')
  async handleStart(@MessageBody() data: { username: string, userId: string, groupOwner: number }, @ConnectedSocket() client: Socket) {
    const clientId = client.id;
    this.logger.log(`User ${data.username} id: ${data.userId} (Socket ID: ${clientId}) attempting to join matchmaking.`);

    let userCanAffordFirstRound = true;
    let userBalance = 0;

    try {
      const user = await this.userService.create({ coins: 0, username: data.username, telegramUserId: data.userId })

      userBalance = user.coins;
      if (user.coins < ROUND_BET_AMOUNT) {
        userCanAffordFirstRound = false;
      }

    } catch (error) {
      this.logger.error(`Error during user check/create for ${data.username} (Socket ID: ${clientId}): ${error.message}`, error.stack);
      // If user creation/fetching fails, they can't play.
      client.emit('matchmaking_failed_system_error', { message: messagesEn.MATCHMAKING_FAILED_SYSTEM_ERROR });
      return;
    }

    if (!userCanAffordFirstRound) {
      this.logger.log(`User ${data.username} (Socket ID: ${clientId}) has insufficient coins (${userBalance}) for the first round bet of ${ROUND_BET_AMOUNT}. Not adding to queue.`);
      client.emit('matchmaking_failed_insufficient_coins', {
        message: messagesEn.MATCHMAKING_FAILED_INSUFFICIENT_COINS(ROUND_BET_AMOUNT, userBalance),
        required: ROUND_BET_AMOUNT,
        currentBalance: userBalance,
      });
      return;
    }

    const isAlreadyInQueue = this.matchmakingQueue.some(p => p.socketId === clientId);
    if (isAlreadyInQueue) {
      this.logger.warn(`Socket ${clientId} (User: ${data.username}) is already in the matchmaking queue.`);
      client.emit('already_in_queue', { message: messagesEn.ALREADY_IN_QUEUE });
      return;
    }

    if (this.socketToSessionMap.has(clientId)) {
      this.logger.warn(`User ${data.username} (Socket ID: ${clientId}) is already in an active session: ${this.socketToSessionMap.get(clientId)}. Cannot join matchmaking.`);
      client.emit('already_in_session', { message: messagesEn.ALREADY_IN_SESSION });
      return;
    }

    const player: Player = { socketId: clientId, username: data.username, groupOwner: data.groupOwner };
    this.matchmakingQueue.push(player);
    this.logger.log(`User ${data.username} (Socket ID: ${clientId}) (owner: ${data.groupOwner}) added to matchmaking. Queue size: ${this.matchmakingQueue.length}. Players: ${this.matchmakingQueue.map(p => p.username).join(', ')}`);

    if (this.matchmakingQueue.length >= 2) {
      const firstPlayerInQueueId = this.matchmakingQueue[0].socketId;
      if (this.matchmakingBotTimers.has(firstPlayerInQueueId)) {
        clearTimeout(this.matchmakingBotTimers.get(firstPlayerInQueueId)!);
        this.matchmakingBotTimers.delete(firstPlayerInQueueId);
        this.logger.log(`Cleared bot matchmaking timer for ${firstPlayerInQueueId} as a real match was found.`);
      }
      const secondPlayerInQueueId = this.matchmakingQueue[1].socketId;
      if (this.matchmakingBotTimers.has(secondPlayerInQueueId)) {
        clearTimeout(this.matchmakingBotTimers.get(secondPlayerInQueueId)!);
        this.matchmakingBotTimers.delete(secondPlayerInQueueId);
        this.logger.log(`Cleared bot matchmaking timer for ${secondPlayerInQueueId} as a real match was found (precautionary).`);
      }

      const player1 = this.matchmakingQueue.shift()!;
      const player2 = this.matchmakingQueue.shift()!;

      const groupOwners: number[] = [];

      if (player1.groupOwner) {
        try {
          const request = await this.revshareService.findRequestByTelegramUserId(player1.groupOwner.toString());
          if (request && request.status === 'approved') {
            groupOwners.push(player1.groupOwner);
            this.logger.log(`Added group owner ${player1.groupOwner} for player ${player1.username} to session. Status: approved.`);
          } else {
            this.logger.log(`Skipped adding group owner ${player1.groupOwner} for player ${player1.username}. Status: ${request ? request.status : 'not found'}.`);
          }
        } catch (error) {
          this.logger.error(`Error checking revshare status for group owner ${player1.groupOwner} of player ${player1.username}: ${error.message}`);
        }
      }

      if (player2.groupOwner) {
        try {
          const request = await this.revshareService.findRequestByTelegramUserId(player2.groupOwner.toString());
          if (request && request.status === 'approved') {
            groupOwners.push(player2.groupOwner);
            this.logger.log(`Added group owner ${player2.groupOwner} for player ${player2.username} to session. Status: approved.`);
          } else {
            this.logger.log(`Skipped adding group owner ${player2.groupOwner} for player ${player2.username}. Status: ${request ? request.status : 'not found'}.`);
          }
        } catch (error) {
          this.logger.error(`Error checking revshare status for group owner ${player2.groupOwner} of player ${player2.username}: ${error.message}`);
        }
      }

      const initialScores: Score = {
        [player1.socketId]: 0,
        [player2.socketId]: 0,
      };

      const sessionId = `session_${Date.now()}_${player1.socketId.slice(-4)}_${player2.socketId.slice(-4)}`;
      const sessionData: SessionData = {
        players: [player1, player2],
        startTime: Date.now(),
        choices: { [player1.socketId]: null, [player2.socketId]: null },
        lastActivity: Date.now(),
        scores: initialScores,
        isBotGame: false,
        groupOwners: groupOwners
      };

      try {
        await this.redisService.set(sessionId, JSON.stringify(sessionData));
        this.socketToSessionMap.set(player1.socketId, sessionId);
        this.socketToSessionMap.set(player2.socketId, sessionId);

        this.server.to(player1.socketId).emit('match_found', { sessionId, opponent: player2.username, yourUsername: player1.username, isBotGame: false });
        this.server.to(player2.socketId).emit('match_found', { sessionId, opponent: player1.username, yourUsername: player2.username, isBotGame: false });
        this.logger.log(`Match created: ${player1.username} vs ${player2.username}. Session: ${sessionId}`);
      } catch (error) {
        this.logger.error(`Failed to set session ${sessionId} in Redis:`, error);
        this.matchmakingQueue.unshift(player1, player2);
        this.socketToSessionMap.delete(player1.socketId);
        this.socketToSessionMap.delete(player2.socketId);
        this.server.to(player1.socketId).emit('matchmaking_error', { message: messagesEn.MATCHMAKING_ERROR_SERVER });
        this.server.to(player2.socketId).emit('matchmaking_error', { message: messagesEn.MATCHMAKING_ERROR_SERVER });
      }
    } else {
      client.emit('waiting_for_opponent', { message: messagesEn.WAITING_FOR_OPPONENT });
      const botMatchTimer = setTimeout(() => {
        this.matchWithBot(player.socketId);
      }, this.matchmakingBotTimeout);
      this.matchmakingBotTimers.set(player.socketId, botMatchTimer);
      this.logger.log(`Bot matchmaking timer started for ${player.username} (${player.socketId}) for ${this.matchmakingBotTimeout}ms.`);
    }
  }

  private getRandomBotName(): string {
    if (this.BOT_USERNAMES.length === 0) return 'RPS Titans Bot'; // Fallback
    const randomIndex = Math.floor(Math.random() * this.BOT_USERNAMES.length);
    return this.BOT_USERNAMES[randomIndex];
  }

  private async matchWithBot(playerSocketId: string) {
    this.logger.log(`Attempting to match player ${playerSocketId} with a bot.`);
    if (this.matchmakingBotTimers.has(playerSocketId)) {
      clearTimeout(this.matchmakingBotTimers.get(playerSocketId)!);
      this.matchmakingBotTimers.delete(playerSocketId);
    }

    const playerIndex = this.matchmakingQueue.findIndex(p => p.socketId === playerSocketId);

    if (playerIndex === -1 || this.matchmakingQueue.length !== 1 || this.matchmakingQueue[0].socketId !== playerSocketId) {
      this.logger.log(`Player ${playerSocketId} no longer eligible for bot match (not in queue, not alone, or already matched). Queue size: ${this.matchmakingQueue.length}`);
      return;
    }

    const player1 = this.matchmakingQueue.shift()!;
    this.logger.log(`Player ${player1.username} removed from queue to match with bot.`);

    const botPlayer: Player = {
      socketId: `${this.BOT_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: this.getRandomBotName(), // Use the new method here
    };

    this.userService.create({ coins: 0, username: botPlayer.username, telegramUserId: botPlayer.username })

    const initialScores: Score = {
      [player1.socketId]: 0,
      [botPlayer.socketId]: 0,
    };

    const sessionId = `session_bot_${Date.now()}_${player1.socketId.slice(-4)}`;
    const sessionData: SessionData = {
      players: [player1, botPlayer],
      startTime: Date.now(),
      choices: { [player1.socketId]: null, [botPlayer.socketId]: null },
      lastActivity: Date.now(),
      scores: initialScores,
      isBotGame: true,
    };

    try {
      await this.redisService.set(sessionId, JSON.stringify(sessionData));
      this.socketToSessionMap.set(player1.socketId, sessionId);

      this.server.to(player1.socketId).emit('match_found', {
        sessionId,
        opponent: botPlayer.username,
        yourUsername: player1.username,
        isBotGame: true,
      });
      this.logger.log(`Bot match created: ${player1.username} vs ${botPlayer.username}. Session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to set bot session ${sessionId} in Redis for ${player1.username}:`, error);
      this.matchmakingQueue.unshift(player1);
      this.socketToSessionMap.delete(player1.socketId);
      this.server.to(player1.socketId).emit('matchmaking_error', { message: messagesEn.MATCHMAKING_ERROR_BOT_SERVER });
    }
  }


  @SubscribeMessage('cancel_matchmaking')
  handleCancelMatchmaking(@ConnectedSocket() client: Socket) {
    const clientId = client.id;

    if (this.socketToSessionMap.has(clientId)) {
      this.logger.log(`Client ${clientId} tried to cancel matchmaking but is already in session ${this.socketToSessionMap.get(clientId)}.`);
      client.emit('cannot_cancel_in_game', { message: messagesEn.CANNOT_CANCEL_IN_GAME });
      return;
    }

    if (this.matchmakingBotTimers.has(clientId)) {
      clearTimeout(this.matchmakingBotTimers.get(clientId)!);
      this.matchmakingBotTimers.delete(clientId);
      this.logger.log(`Cleared bot matchmaking timer for ${clientId} due to cancellation.`);
    }

    const playerIndex = this.matchmakingQueue.findIndex(p => p.socketId === clientId);
    if (playerIndex > -1) {
      const removedPlayer = this.matchmakingQueue.splice(playerIndex, 1)[0];
      this.logger.log(`Player ${removedPlayer.username} (Socket ID: ${clientId}) cancelled matchmaking. Queue size: ${this.matchmakingQueue.length}`);
      client.emit('matchmaking_cancelled', { message: messagesEn.MATCHMAKING_CANCELLED });
    } else {
      this.logger.log(`Client ${clientId} tried to cancel matchmaking but was not found in queue.`);
      client.emit('not_in_queue', { message: messagesEn.NOT_IN_QUEUE });
    }
  }

  @SubscribeMessage('make_choice')
  async handleMakeChoice(
    @MessageBody() data: { sessionId: string; choice: Choice },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId, choice } = data;
    const currentPlayerId = client.id;

    if (!sessionId || !choice || !['rock', 'paper', 'scissors'].includes(choice)) {
      this.logger.warn(`Invalid choice data from ${currentPlayerId}: ${JSON.stringify(data)}`);
      client.emit('error_occurred', { message: messagesEn.INVALID_CHOICE_DATA });
      return;
    }

    try {
      const sessionString = await this.redisService.get(sessionId);
      if (!sessionString) {
        this.logger.warn(`Session ${sessionId} not found for choice by ${currentPlayerId}.`);
        client.emit('error_occurred', { message: messagesEn.SESSION_NOT_FOUND_OR_ENDED });
        return;
      }

      let sessionData: SessionData = JSON.parse(sessionString);
      const currentPlayerInfo = sessionData.players.find(p => p.socketId === currentPlayerId);
      if (!currentPlayerInfo) {
        this.logger.warn(`Player ${currentPlayerId} not part of session ${sessionId}.`);
        client.emit('error_occurred', { message: messagesEn.NOT_IN_GAME_SESSION });
        return;
      }

      if (sessionData.choices[currentPlayerId] !== null) {
        this.logger.log(`Player ${currentPlayerInfo.username} already chose in session ${sessionId}.`);
        client.emit('choice_already_made', { message: messagesEn.CHOICE_ALREADY_MADE });
        return;
      }

      if (!sessionData.isBotGame) {
        try {
          const userMakingChoice = await this.userService.findOneByUsername(currentPlayerInfo.username);
          if (userMakingChoice.coins < ROUND_BET_AMOUNT) {
            this.logger.warn(`Player ${currentPlayerInfo.username} (Socket: ${currentPlayerId}) in session ${sessionId} has insufficient coins (${userMakingChoice.coins}) to make a choice (bet: ${ROUND_BET_AMOUNT}).`);
            client.emit('insufficient_coins_for_round', {
              message: messagesEn.INSUFFICIENT_COINS_FOR_ROUND_CHOICE(ROUND_BET_AMOUNT, userMakingChoice.coins),
              required: ROUND_BET_AMOUNT,
              current: userMakingChoice.coins,
            });
            // Optionally, you could end the game here if a player can't continue
            // Or emit an event to the opponent.
            // For now, just prevent the choice.

            this.handleEndGame({ sessionId: sessionId }, client)

            return;
          }
        } catch (error) {
          this.logger.error(`Error checking coins for ${currentPlayerInfo.username} in session ${sessionId}: ${error.message}`);
          client.emit('error_occurred', { message: messagesEn.SERVER_ERROR_CHECKING_BALANCE });
          return;
        }
      }

      sessionData.choices[currentPlayerId] = choice;
      sessionData.lastActivity = Date.now();
      this.logger.log(`Player ${currentPlayerInfo.username} in session ${sessionId} chose: ${choice}`);

      const opponentInfo = sessionData.players.find(p => p.socketId !== currentPlayerId);
      if (!opponentInfo) {
        this.logger.error(`Opponent not found for ${currentPlayerInfo.username} in session ${sessionId}. Critical error.`);
        await this.cleanUpSession(sessionId, [currentPlayerId]);
        client.emit('error_occurred', { message: messagesEn.CRITICAL_OPPONENT_DATA_MISSING });
        return;
      }
      const opponentId = opponentInfo.socketId;

      if (sessionData.isBotGame && opponentId.startsWith(this.BOT_ID_PREFIX)) {
        const choicesArray: Choice[] = ['rock', 'paper', 'scissors'];
        const botChoice = choicesArray[Math.floor(Math.random() * choicesArray.length)];
        sessionData.choices[opponentId] = botChoice;
        this.logger.log(`Bot ${opponentInfo.username} (ID: ${opponentId}) in session ${sessionId} auto-chose: ${botChoice}`);

        client.emit('choice_registered', { message: messagesEn.CHOICE_REGISTERED_BOT_MOVING });
        setTimeout(async () => {
          await this.processRoundCompletion(sessionData, sessionId, currentPlayerId, choice, opponentId, botChoice, '', '');
        }, 500);

      } else {
        this.clearPlayerTurnTimer(sessionId, currentPlayerId);

        const opponentChoice = sessionData.choices[opponentId];
        if (opponentChoice) {
          this.logger.log(`Both players in session ${sessionId} have made choices. Processing round.`);

          try {
            const opponentUser = await this.userService.findOneByUsername(opponentInfo.username);
            if (opponentUser.coins < ROUND_BET_AMOUNT) {
              this.logger.warn(`Opponent ${opponentInfo.username} in session ${sessionId} has insufficient coins for the bet. Current player ${currentPlayerInfo.username} wins by default (opponent financial forfeit).`);
              // Current player wins, opponent loses due to no funds.
              // Handle this as a special case in processRoundCompletion or here.
              // For simplicity, let's make processRoundCompletion handle coin transfers based on who is determined winner/loser.
              // The key is that the game *can* proceed to round completion.
              // We just need to ensure processRoundCompletion is aware of this potential state.
              // Let's assume processRoundCompletion will attempt deductions and they might fail if coins are insufficient
              // by the time it runs, which it should handle gracefully.
              // OR, we award win to currentPlayer now.

              // Award win to currentPlayer because opponent cannot cover bet
              this.server.to(currentPlayerId).emit('opponent_forfeit_coins', {
                message: messagesEn.UNABLE_TO_COVER_BET(opponentInfo.username, ROUND_BET_AMOUNT),
              });
              this.server.to(opponentId).emit('forfeit_coins', {
                message: messagesEn.FORFEIT_BET_INSUFFICIENT_COINS(ROUND_BET_AMOUNT),
              });

              // Update scores: currentPlayer wins, opponent loses
              sessionData.scores[currentPlayerId]++;
              // No coin transfer here, just score. Coins are handled after round result.
              // OR, if we treat this as an immediate win, we could process a simplified round completion
              await this.processRoundCompletion(
                sessionData, sessionId,
                currentPlayerId, choice, // Current player made a choice
                opponentId, null,       // Opponent effectively made no choice / forfeited
                `${opponentInfo.username} forfeited due to insufficient coins.`, // reasonPlayer1 for logs
                `You forfeited due to insufficient coins.`, // reasonPlayer2 for logs
                false // isBotRound
              );
              return; // Round processed due to forfeit
            }
          } catch (error) {
            this.logger.error(`Error checking opponent ${opponentInfo.username}'s coins in session ${sessionId}: ${error.message}`);
            // If error, how to proceed? Maybe let the round process and coin deduction fail gracefully.
            // Or halt. For now, let it proceed.
          }

          await this.processRoundCompletion(sessionData, sessionId, currentPlayerId, choice, opponentId, opponentChoice, '', '');
        } else {
          client.emit('choice_registered', { message: messagesEn.CHOICE_REGISTERED_WAITING_OPPONENT });
          this.server.to(opponentId).emit('opponent_made_choice', {
            message: messagesEn.OPPONENT_MADE_CHOICE_YOUR_TURN(currentPlayerInfo.username, this.turnTimeoutDuration / 1000),
            timerDetails: {
              activeFor: opponentId,
              duration: this.turnTimeoutDuration,
            },
          });

          const opponentTimerKey = this.generateTimerKey(sessionId, opponentId);
          this.clearPlayerTurnTimer(sessionId, opponentId);

          const timerId = setTimeout(async () => {
            this.activeTurnTimers.delete(opponentTimerKey);
            const currentSessionString = await this.redisService.get(sessionId);
            if (!currentSessionString) {
              this.logger.warn(`Session ${sessionId} disappeared before timer for ${opponentInfo.username} could fire.`);
              return;
            }
            let currentSessionData: SessionData = JSON.parse(currentSessionString);

            const originalChooserStillInSession = currentSessionData.players.find(p => p.socketId === currentPlayerId);

            if (originalChooserStillInSession && currentSessionData.choices[opponentId] === null && currentSessionData.choices[currentPlayerId] !== null) {
              this.logger.log(`Timer expired for ${opponentInfo.username} in session ${sessionId}. ${currentPlayerInfo.username} wins by default.`);
              await this.processRoundCompletion(
                currentSessionData, sessionId,
                currentPlayerId, currentSessionData.choices[currentPlayerId],
                opponentId, null,
                `${opponentInfo.username} timed out.`, // reasonPlayer1 for logs
                `You timed out.`, // reasonPlayer2 for logs
              );
            } else {
              this.logger.log(`Timer for ${opponentInfo.username} in ${sessionId} expired, but state changed. No action from this timer.`);
            }
          }, this.turnTimeoutDuration);

          this.activeTurnTimers.set(opponentTimerKey, timerId);
          this.logger.log(`Turn timer started for ${opponentInfo.username} (key: ${opponentTimerKey}) in session ${sessionId}.`);
          await this.redisService.set(sessionId, JSON.stringify(sessionData));
        }
      }
    } catch (error) {
      this.logger.error(`Error processing choice for session ${sessionId} by ${currentPlayerId}:`, error);
      client.emit('error_occurred', { message: messagesEn.SERVER_ERROR_PROCESSING_CHOICE });
    }
  }

  private async cleanUpSession(sessionId: string, playerSocketIds: string[]) {
    this.clearAllTimersForSession(sessionId);
    try {
      await this.redisService.del(sessionId);
      this.logger.log(`Session ${sessionId} deleted from Redis.`);
    } catch (delError) {
      this.logger.error(`Error deleting session ${sessionId} from Redis:`, delError);
    }
    playerSocketIds.forEach(socketId => {
      if (!socketId.startsWith(this.BOT_ID_PREFIX)) { // Don't try to delete bots from map
        this.socketToSessionMap.delete(socketId);
      }
    });
    this.logger.log(`Socket to session map cleared for human players in session ${sessionId}.`);
  }


  @SubscribeMessage('end_game')
  async handleEndGame(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { sessionId } = data;
    const clientId = client.id;
    this.logger.log(`Client ${clientId} initiated 'end_game' for session ${sessionId}`);

    if (!sessionId) {
      this.logger.warn(`'end_game' received from ${clientId} without a sessionId.`);
      client.emit('error_occurred', { message: messagesEn.SESSION_ID_REQUIRED_TO_END_GAME });
      return;
    }

    try {
      const sessionString = await this.redisService.get(sessionId);
      if (!sessionString) {
        this.logger.warn(`Session ${sessionId} not found for 'end_game' request by ${clientId}.`);
        client.emit('game_already_ended', { message: messagesEn.GAME_ALREADY_ENDED });
        if (this.socketToSessionMap.get(clientId) === sessionId) {
          this.socketToSessionMap.delete(clientId);
        }
        return;
      }

      let sessionData: SessionData = JSON.parse(sessionString);
      const playerInitiating = sessionData.players.find(p => p.socketId === clientId);

      if (!playerInitiating) {
        this.logger.warn(`Client ${clientId} is not part of session ${sessionId} but tried to end it.`);
        client.emit('error_occurred', { message: messagesEn.NOT_IN_GAME_SESSION });
        return;
      }

      const endMessage = messagesEn.GAME_ENDED_BY_PLAYER(playerInitiating.username);
      const playerSocketIdsInSession: string[] = [];

      sessionData.players.forEach(p => {
        const scores = sessionData.scores
        const userScore = scores[p.socketId] || 0

        const players = sessionData.players

        // this.userService.addCoins(p.username, userScore * 2)

        this.userService.addMatch(p.username, {
          players: players.map(player => player.username),
          scores: players.map(player => ({ username: player.username, score: scores[player.socketId] })),
          sessionId: sessionId
        })

        playerSocketIdsInSession.push(p.socketId);
        if (!p.socketId.startsWith(this.BOT_ID_PREFIX)) {
          this.server.to(p.socketId).emit('game_ended', { message: endMessage, initiator: playerInitiating.username });
        }
      });

      this.logger.log(`Notified players in session ${sessionId} that the game has ended by ${playerInitiating.username}.`);
      await this.cleanUpSession(sessionId, playerSocketIdsInSession);

    } catch (error) {
      this.logger.error(`Error handling 'end_game' for session ${sessionId} by ${clientId}:`, error);
      client.emit('error_occurred', { message: messagesEn.SERVER_ERROR_ENDING_GAME });
    }
  }


  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const clientId = client.id;
    this.logger.log(`Client disconnected: ${clientId}`);

    if (this.matchmakingBotTimers.has(clientId)) {
      clearTimeout(this.matchmakingBotTimers.get(clientId)!);
      this.matchmakingBotTimers.delete(clientId);
      this.logger.log(`Cleared bot matchmaking timer for disconnected client ${clientId}.`);
    }

    const queueIndex = this.matchmakingQueue.findIndex(p => p.socketId === clientId);
    if (queueIndex > -1) {
      const player = this.matchmakingQueue.splice(queueIndex, 1)[0];
      this.logger.log(`Player ${player?.username || clientId} removed from matchmaking queue due to disconnection. Queue size: ${this.matchmakingQueue.length}`);
    }

    const sessionId = this.socketToSessionMap.get(clientId);
    if (sessionId) {
      this.logger.log(`Client ${clientId} was in active session ${sessionId}. Handling game termination due to disconnect.`);
      try {
        const sessionString = await this.redisService.get(sessionId);
        if (sessionString) {
          const sessionData: SessionData = JSON.parse(sessionString);
          const disconnectedPlayer = sessionData.players.find(p => p.socketId === clientId);
          const opponent = sessionData.players.find(p => p.socketId !== clientId);

          const allPlayerSocketIdsInSession = sessionData.players.map(p => p.socketId);

          if (opponent && !opponent.socketId.startsWith(this.BOT_ID_PREFIX)) {
            this.server.to(opponent.socketId).emit('opponent_disconnected', {
              message: messagesEn.OPPONENT_DISCONNECTED(disconnectedPlayer?.username ?? 'username not found'),
            });
            this.logger.log(`Notified opponent ${opponent.username} in session ${sessionId} about ${disconnectedPlayer?.username}'s disconnection.`);
          } else if (opponent && opponent.socketId.startsWith(this.BOT_ID_PREFIX)) {
            this.logger.log(`Disconnected player ${disconnectedPlayer?.username} was playing against bot ${opponent.username}. No notification needed for bot.`);
          }
          await this.cleanUpSession(sessionId, allPlayerSocketIdsInSession);
        } else {
          this.logger.log(`Session ${sessionId} for disconnected client ${clientId} not found in Redis. Already cleaned up?`);
          this.socketToSessionMap.delete(clientId);
        }
      } catch (error) {
        this.logger.error(`Error cleaning up session ${sessionId} for disconnected client ${clientId}:`, error);
        this.socketToSessionMap.delete(clientId);
      }
    } else {
      this.logger.log(`Client ${clientId} was not in an active session (no entry in socketToSessionMap at disconnect).`);
    }
  }
}