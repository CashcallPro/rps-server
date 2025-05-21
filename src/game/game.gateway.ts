import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayInit, // For logging
  OnGatewayConnection, // For logging
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.provider';
import { Player } from 'src/types/player';
import { Logger } from '@nestjs/common'; // For better logging

type Choice = 'rock' | 'paper' | 'scissors';

interface Score {
  [playerId: string]: number
}

interface SessionData {
  players: Player[];
  startTime: number;
  choices: { [socketId: string]: Choice | null };
  // scores: { [socketId: string]: number }; // If you add scores
  lastActivity: number;

  scores: Score
}

@WebSocketGateway({ cors: true })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  constructor(private readonly redisService: RedisService) { }

  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);
  private matchmakingQueue: Player[] = [];

  // In-memory map to store active turn timers. Key: `sessionId_waitingPlayerSocketId`
  private activeTurnTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly TURN_TIMEOUT_DURATION_MS = 5000; // 5 seconds
  // private readonly 
  // 

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  private generateTimerKey(sessionId: string, waitingPlayerSocketId: string): string {
    return `${sessionId}_${waitingPlayerSocketId}_turntimer`;
  }

  // Helper to clear a specific player's turn timer for a session
  private clearPlayerTurnTimer(sessionId: string, waitingPlayerSocketId: string) {
    const timerKey = this.generateTimerKey(sessionId, waitingPlayerSocketId);
    const existingTimer = this.activeTurnTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.activeTurnTimers.delete(timerKey);
      this.logger.log(`Cleared turn timer for key: ${timerKey}`);
    }
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

  // Refactored logic for processing a completed round
  private async processRoundCompletion(
    sessionData: SessionData,
    sessionId: string,
    currentPlayerId: string, currentPlayerChoice: Choice | null, // Choice can be null if timed out
    opponentId: string, opponentChoice: Choice | null, // Choice can be null if timed out
    reasonPlayer1?: string, // Optional reason for display (e.g., "Opponent timed out")
    reasonPlayer2?: string  // Optional reason for display (e.g., "You timed out")
  ) {
    const player1Info = sessionData.players.find(p => p.socketId === currentPlayerId);
    const player2Info = sessionData.players.find(p => p.socketId === opponentId);

    if (!player1Info || !player2Info) {
      this.logger.error(`Players not found in processRoundCompletion for session ${sessionId}`);
      return;
    }

    let player1ResultMsg: string;
    let player2ResultMsg: string;

    if (!sessionData.scores) {
      this.logger.warn(`Scores object missing in sessionData for session ${sessionId}. Initializing.`);
      sessionData.scores = { currentPlayerId: 0, opponentId: 0 };
    }
    if (sessionData.scores[currentPlayerId] === undefined) sessionData.scores[currentPlayerId] = 0;
    if (sessionData.scores[opponentId] === undefined) sessionData.scores[opponentId] = 0;

    if (!currentPlayerChoice) { // Player 1 timed out
      player1ResultMsg = 'You lost!';
      player2ResultMsg = 'You won!';

      sessionData.scores[opponentId] += 1

    } else if (!opponentChoice) { // Player 2 timed out
      player1ResultMsg = 'You won!';
      player2ResultMsg = 'You lost!';

      sessionData.scores[currentPlayerId] += 1

    } else { // Both made choices
      const outcomeForPlayer1 = this.determineOutcome(currentPlayerChoice, opponentChoice);
      if (outcomeForPlayer1 === 'win') {
        player1ResultMsg = 'You won!';
        player2ResultMsg = 'You lost!';

        sessionData.scores[currentPlayerId] += 1

      } else if (outcomeForPlayer1 === 'loss') {
        player1ResultMsg = 'You lost!';
        player2ResultMsg = 'You won!';

        sessionData.scores[opponentId] += 1

      } else {
        player1ResultMsg = "It's a tie!";
        player2ResultMsg = "It's a tie!";
      }
    }

    this.server.to(currentPlayerId).emit('round_result', {
      yourChoice: currentPlayerChoice,
      opponentChoice: opponentChoice,
      result: player1ResultMsg,
      reason: reasonPlayer1 || '', // Send reason if any
      scores: {
        currentPlayer: sessionData.scores[currentPlayerId],
        opponent: sessionData.scores[opponentId]
      }
    });
    this.server.to(opponentId).emit('round_result', {
      yourChoice: opponentChoice,
      opponentChoice: currentPlayerChoice,
      result: player2ResultMsg,
      reason: reasonPlayer2 || '', // Send reason if any      
      scores: {
        currentPlayer: sessionData.scores[opponentId],
        opponent: sessionData.scores[currentPlayerId]
      }
    });

    this.logger.log(`Round result for session ${sessionId}: ${player1Info.username} (${currentPlayerChoice || 'timed out'}) vs ${player2Info.username} (${opponentChoice || 'timed out'}). round result: ${sessionData.scores}`);

    // Reset choices for the next round in the session data
    sessionData.choices[currentPlayerId] = null;
    sessionData.choices[opponentId] = null;
    sessionData.lastActivity = Date.now();
    await this.redisService.set(sessionId, JSON.stringify(sessionData));
    this.logger.log(`Choices reset for session ${sessionId} for next round.`);
  }


  @SubscribeMessage('start')
  async handleStart(@MessageBody() data: { username: string }, @ConnectedSocket() client: Socket) {
    this.logger.log(`User ${data.username} (Socket ID: ${client.id}) attempting to join matchmaking.`);

    const isAlreadyInQueue = this.matchmakingQueue.some(
      (p) => p.username === data.username || p.socketId === client.id,
    );

    if (isAlreadyInQueue) {
      this.logger.warn(`User ${data.username} or socket ${client.id} is already in the matchmaking queue.`);
      client.emit('already_in_queue', { message: 'You are already searching for a match.' });
      return;
    }

    // TODO: Add check if client.id is in an active session already (more complex, requires session iteration or lookup table)

    const player: Player = { socketId: client.id, username: data.username };
    this.matchmakingQueue.push(player);
    this.logger.log(`User ${data.username} added to matchmaking. Queue: ${this.matchmakingQueue.map(p => p.username).join(', ')}`);

    if (this.matchmakingQueue.length >= 2) {
      const player1 = this.matchmakingQueue.shift();
      const player2 = this.matchmakingQueue.shift();

      if (!player1 || !player2) { /* ... error handling ... */ return; }

      const initialScores: Score = {
        currentPlayer: 0,
        opponent: 0,
      };

      const sessionId = `session_${Date.now()}_${player1.socketId.slice(-4)}_${player2.socketId.slice(-4)}`;
      const sessionData: SessionData = {
        players: [player1, player2],
        startTime: Date.now(),
        choices: { [player1.socketId]: null, [player2.socketId]: null },
        lastActivity: Date.now(),
        scores: initialScores
      };

      try {
        await this.redisService.set(sessionId, JSON.stringify(sessionData));
        this.server.to(player1.socketId).emit('match_found', { sessionId, opponent: player2.username, yourUsername: player1.username });
        this.server.to(player2.socketId).emit('match_found', { sessionId, opponent: player1.username, yourUsername: player2.username });
        this.logger.log(`Match created: ${player1.username} vs ${player2.username}. Session: ${sessionId}`);
      } catch (error) {
        // ... error handling, put players back ...
        this.logger.error(`Failed to set session ${sessionId} in Redis:`, error);
        this.matchmakingQueue.unshift(player1, player2);
        client.emit('matchmaking_error', { message: 'Server error starting match.' });
        const otherClientSocketId = player1.socketId === client.id ? player2.socketId : player1.socketId;
        this.server.to(otherClientSocketId).emit('matchmaking_error', { message: 'Server error starting match.' });
      }
    } else {
      client.emit('waiting_for_opponent', { message: 'In queue, waiting for an opponent.' });
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
      client.emit('error_occurred', { message: 'Invalid choice data.' });
      return;
    }

    try {
      const sessionString = await this.redisService.get(sessionId);
      if (!sessionString) {
        this.logger.warn(`Session ${sessionId} not found for choice by ${currentPlayerId}.`);
        client.emit('error_occurred', { message: 'Session not found or ended.' });
        return;
      }

      let sessionData: SessionData = JSON.parse(sessionString);
      const currentPlayerInfo = sessionData.players.find(p => p.socketId === currentPlayerId);
      if (!currentPlayerInfo) {
        this.logger.warn(`Player ${currentPlayerId} not part of session ${sessionId}.`);
        client.emit('error_occurred', { message: 'You are not in this game session.' });
        return;
      }

      if (sessionData.choices[currentPlayerId] !== null) {
        this.logger.log(`Player ${currentPlayerInfo.username} already chose in session ${sessionId}.`);
        // client.emit('choice_already_made', { message: 'You have already chosen.' });
        return;
      }

      // Record current player's choice
      sessionData.choices[currentPlayerId] = choice;
      sessionData.lastActivity = Date.now();
      this.logger.log(`Player ${currentPlayerInfo.username} in session ${sessionId} chose: ${choice}`);

      const opponentInfo = sessionData.players.find(p => p.socketId !== currentPlayerId);
      if (!opponentInfo) {
        this.logger.error(`Opponent not found for ${currentPlayerInfo.username} in session ${sessionId}. Critical error.`);
        return; // Should not happen
      }
      const opponentId = opponentInfo.socketId;

      // Player made a choice, so clear any timer that was running for them
      this.clearPlayerTurnTimer(sessionId, currentPlayerId);

      const opponentChoice = sessionData.choices[opponentId];

      if (opponentChoice) {
        // ---- BOTH PLAYERS HAVE NOW CHOSEN ----
        this.logger.log(`Both players in session ${sessionId} have made choices. Processing round.`);
        await this.processRoundCompletion(sessionData, sessionId, currentPlayerId, choice, opponentId, opponentChoice);
        // Note: processRoundCompletion now handles updating Redis after resetting choices.
      } else {
        // ---- OPPONENT HAS NOT YET CHOSEN ----
        client.emit('choice_registered', { message: 'Choice registered. Waiting for opponent.' });
        this.server.to(opponentId).emit('opponent_made_choice', {
          message: `${currentPlayerInfo.username} made their choice! You have ${this.TURN_TIMEOUT_DURATION_MS / 1000}s.`,
          timerDetails: {
            activeFor: opponentId,
            duration: this.TURN_TIMEOUT_DURATION_MS,
          }
        });

        // Start timer for the opponent
        const opponentTimerKey = this.generateTimerKey(sessionId, opponentId);
        // Ensure no old timer for opponent (safety)
        this.clearPlayerTurnTimer(sessionId, opponentId);

        const timerId = setTimeout(async () => {
          this.activeTurnTimers.delete(opponentTimerKey); // Remove from map once handled

          // Re-fetch session, as opponent might have chosen just as timer was firing.
          const currentSessionString = await this.redisService.get(sessionId);
          if (!currentSessionString) {
            this.logger.warn(`Session ${sessionId} disappeared before timer for ${opponentInfo.username} could fire completely.`);
            return;
          }
          let currentSessionData: SessionData = JSON.parse(currentSessionString);

          // If opponent STILL hasn't chosen, they time out. Current player wins by default.
          if (currentSessionData.choices[opponentId] === null && currentSessionData.choices[currentPlayerId] !== null) {
            this.logger.log(`Timer expired for ${opponentInfo.username} in session ${sessionId}. ${currentPlayerInfo.username} wins by default.`);
            await this.processRoundCompletion(
              currentSessionData, sessionId,
              currentPlayerId, currentSessionData.choices[currentPlayerId], // Current player's choice
              opponentId, null, // Opponent's choice is null (timed out)
              `${opponentInfo.username} timed out.`, // Reason for current player
              `You timed out.` // Reason for opponent
            );
          } else {
            // Opponent chose in time, or something else changed. Their 'make_choice' would have handled it.
            this.logger.log(`Timer for ${opponentInfo.username} expired, but state indicates they chose or round resolved. No action from timer.`);
          }
        }, this.TURN_TIMEOUT_DURATION_MS);

        this.activeTurnTimers.set(opponentTimerKey, timerId);
        this.logger.log(`Turn timer started for ${opponentInfo.username} (key: ${opponentTimerKey}) in session ${sessionId}.`);
        // Update Redis with the current player's choice (opponent's choice is still null)
        await this.redisService.set(sessionId, JSON.stringify(sessionData));
      }
    } catch (error) {
      this.logger.error(`Error processing choice for session ${sessionId} by ${currentPlayerId}:`, error);
      client.emit('error_occurred', { message: 'Server error processing your choice.' });
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const clientId = client.id;
    this.logger.log(`Client disconnected: ${clientId}`);

    // 1. Remove from matchmaking queue
    const queueIndex = this.matchmakingQueue.findIndex(p => p.socketId === clientId);
    if (queueIndex > -1) {
      const player = this.matchmakingQueue.splice(queueIndex, 1)[0];
      this.logger.log(`Player ${player?.username || clientId} removed from matchmaking queue.`);
    }

    // 2. Handle disconnection from an active game
    //    This requires finding which session the client was in. This part can be complex.
    //    A simple approach: Iterate all active timers. If a timer key includes the disconnected client's ID,
    //    it implies they were in a game. This isn't perfect, as a player might disconnect when no timer is active for them.
    //    A better way: when a session starts, store a mapping like `socketId -> sessionId`.
    //    For this example, we'll iterate active timers and then search session keys (less efficient).

    let disconnectedFromSessionId: string | null = null;

    for (const [timerKey, timerId] of this.activeTurnTimers.entries()) {
      // timerKey is `sessionId_waitingPlayerSocketId_turntimer`
      const [sessionIdPart, waitingPlayerIdPart] = timerKey.split('_');
      const sessionIdFromTimer = `${sessionIdPart}_${timerKey.split('_')[1]}`; // Reconstruct session part of key

      if (waitingPlayerIdPart === clientId) { // Disconnected client was being timed
        clearTimeout(timerId);
        this.activeTurnTimers.delete(timerKey);
        this.logger.log(`Cleared timer ${timerKey} for disconnected client ${clientId} who was being timed.`);
        disconnectedFromSessionId = sessionIdFromTimer; // The key format here needs to match exactly your session ID format
        break;
      }
      // If the other player in the session (whose timer this is for) disconnected
      // This requires knowing the other player. For now, this check is basic.
      // A more robust check would be to fetch the session data using sessionIdFromTimer
      // and see if `clientId` is one of the players, and if the timer is for the *other* player.
    }

    // If we found a session based on active timers, or if we had another way to find the session:
    // This part is complex. Let's assume we have a way to get `activeSessionId` for the `clientId`.
    // const activeSessionId = await this.findSessionForSocket(clientId);
    // if (activeSessionId) { ... }

    // Simplified: Find all sessions, check if player was in one. (Can be slow)
    // const sessionKeys = await this.redisService.keys('session_*');
    // for (const key of sessionKeys) {
    //   const sessionString = await this.redisService.get(key);
    //   if (sessionString) {
    //     let sessionData: SessionData = JSON.parse(sessionString);
    //     const playerIndex = sessionData.players.findIndex(p => p.socketId === clientId);
    //     if (playerIndex > -1) {
    //       disconnectedFromSessionId = key; // This IS the session ID
    //       const disconnectedPlayer = sessionData.players[playerIndex];
    //       const opponent = sessionData.players.find(p => p.socketId !== clientId);

    //       this.logger.log(`Player ${disconnectedPlayer.username} disconnected from active session ${disconnectedFromSessionId}.`);
    //       if (disconnectedFromSessionId) {
    //         // Clear any timers related to this session for EITHER player
    //         this.clearPlayerTurnTimer(disconnectedFromSessionId, clientId);
    //         if (opponent) {
    //           this.clearPlayerTurnTimer(disconnectedFromSessionId, opponent.socketId);
    //           // Notify opponent
    //           this.server.to(opponent.socketId).emit('opponent_disconnected', {
    //             message: `${disconnectedPlayer.username} has disconnected. The game has ended.`,
    //           });
    //         }
    //         // Delete session from Redis
    //         await this.redisService.del(disconnectedFromSessionId);
    //         this.logger.log(`Session ${disconnectedFromSessionId} deleted due to player disconnection.`);
    //         break; // Found the session, no need to check others
    //       }
    //     }
    //   }
    // }
  }
}