import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { UsersService } from '../users/users.service';
import { AdminService } from '../admin/admin.service';
import { RevshareService } from '../revshare/revshare.service'; // Added
import { RedisService } from '../redis/redis.provider';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Define constants from game.gateway.ts
const ROUND_BET_AMOUNT = 10;
const PLAYER_FEE = 1;
const TOTAL_FEE_PER_ROUND = PLAYER_FEE * 2;
const WINNER_AMOUNT_AFTER_FEES = ROUND_BET_AMOUNT - TOTAL_FEE_PER_ROUND;
const GROUP_OWNER_BONUS_PER_OWNER = 0.5;

// Define SessionData type locally for tests if not easily importable or to avoid dependency issues
interface Player {
  socketId: string;
  username: string;
  groupOwner?: number;
}
interface Score {
  [playerId: string]: number;
}
interface SessionData {
  players: Player[];
  startTime: number;
  choices: { [socketId: string]: 'rock' | 'paper' | 'scissors' | null };
  lastActivity: number;
  scores: Score;
  isBotGame?: boolean;
  groupOwners?: number[];
}

describe('GameGateway', () => {
  let gateway: GameGateway;
  let usersService: UsersService;
  let adminService: AdminService;
  let revshareService: RevshareService; // Added
  // let redisService: RedisService; // Mocked but not directly used in these specific tests yet
  // let configService: ConfigService; // Mocked but not directly used in these specific tests yet

  // Mock implementations
  const mockUsersService = {
    findOneByUsername: jest.fn(),
    findOneByTelegramUserId: jest.fn(),
    addCoins: jest.fn(),
    removeCoins: jest.fn(),
    create: jest.fn(), // Added for potential calls during game setup if tests were broader
    addMatch: jest.fn(), // Added for potential calls during game end if tests were broader
  };

  const mockAdminService = {
    updateAdminCoins: jest.fn(),
  };

  const mockRevshareService = { // Added
    findRequestByTelegramUserId: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(), // Added for cleanup if tests were broader
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TURN_TIMEOUT_DURATION_MS') return '5000';
      if (key === 'MATCHMAKING_BOT_TIMEOUT_MS') return '10000';
      return null;
    }),
  };

  beforeEach(async () => {
    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        { provide: UsersService, useValue: mockUsersService },
        { provide: AdminService, useValue: mockAdminService },
        { provide: RevshareService, useValue: mockRevshareService }, // Added
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    usersService = module.get<UsersService>(UsersService);
    adminService = module.get<AdminService>(AdminService);
    revshareService = module.get<RevshareService>(RevshareService); // Added
    // redisService = module.get<RedisService>(RedisService);
    // configService = module.get<ConfigService>(ConfigService);

    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock the WebSocketServer
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
    expect(gateway.server).toBeDefined(); // Also check if server is defined
  });

  describe('processRoundCompletion - Group Owner Bonus Logic', () => {
    const mockPlayer1: Player = { socketId: 'p1socket', username: 'player1' };
    const mockPlayer2: Player = { socketId: 'p2socket', username: 'player2' };
    const defaultSessionId = 'testSessionId';

    // Helper to create basic session data
    const createSessionData = (groupOwners?: number[]): SessionData => ({
      players: [mockPlayer1, mockPlayer2],
      startTime: Date.now(),
      choices: { [mockPlayer1.socketId]: 'rock', [mockPlayer2.socketId]: 'scissors' },
      lastActivity: Date.now(),
      scores: { [mockPlayer1.socketId]: 0, [mockPlayer2.socketId]: 0 },
      isBotGame: false,
      groupOwners: groupOwners || [],
    });

    beforeEach(() => {
      // Default mock for removeCoins (loser pays)
      (usersService.removeCoins as jest.Mock).mockResolvedValue(null);
      // Default mock for addCoins (winner gets paid) - this will be overridden or checked for other calls
      (usersService.addCoins as jest.Mock).mockResolvedValue(null);
      // Default mock for admin coins
      (adminService.updateAdminCoins as jest.Mock).mockResolvedValue(null);
    });

    it('Scenario 1: should pay TOTAL_FEE_PER_ROUND to admin if no group owners', async () => {
      const sessionData = createSessionData(); // No group owners

      await gateway['processRoundCompletion'](
        sessionData, defaultSessionId,
        mockPlayer1.socketId, 'rock', // P1 wins
        mockPlayer2.socketId, 'scissors',
      );

      expect(adminService.updateAdminCoins).toHaveBeenCalledWith(TOTAL_FEE_PER_ROUND);
      expect(usersService.addCoins).toHaveBeenCalledWith(mockPlayer1.username, WINNER_AMOUNT_AFTER_FEES);
      // Ensure addCoins was not called for any group owner bonus
      expect((usersService.addCoins as jest.Mock).mock.calls.filter(call => call[0] !== mockPlayer1.username).length).toBe(0);
    });

    it('Scenario 2: should correctly pay one group owner and adjust admin fee', async () => {
      const ownerTelegramId = 123;
      const ownerUsername = 'owner123';
      const sessionData = createSessionData([ownerTelegramId]);

      (usersService.findOneByTelegramUserId as jest.Mock).mockResolvedValueOnce({ username: ownerUsername, coins: 100 });

      await gateway['processRoundCompletion'](
        sessionData, defaultSessionId,
        mockPlayer1.socketId, 'rock',
        mockPlayer2.socketId, 'scissors',
      );

      const expectedAdminFee = Math.max(0, TOTAL_FEE_PER_ROUND - GROUP_OWNER_BONUS_PER_OWNER);
      expect(adminService.updateAdminCoins).toHaveBeenCalledWith(expectedAdminFee);
      expect(usersService.addCoins).toHaveBeenCalledWith(mockPlayer1.username, WINNER_AMOUNT_AFTER_FEES);
      expect(usersService.addCoins).toHaveBeenCalledWith(ownerUsername, GROUP_OWNER_BONUS_PER_OWNER);
    });

    it('Scenario 3: should correctly pay two unique group owners and adjust admin fee', async () => {
      const owner1TgId = 123;
      const owner1Username = 'owner123';
      const owner2TgId = 456;
      const owner2Username = 'owner456';
      const sessionData = createSessionData([owner1TgId, owner2TgId]);

      (usersService.findOneByTelegramUserId as jest.Mock)
        .mockResolvedValueOnce({ username: owner1Username, coins: 100 }) // For owner1TgId
        .mockResolvedValueOnce({ username: owner2Username, coins: 100 }); // For owner2TgId

      await gateway['processRoundCompletion'](
        sessionData, defaultSessionId,
        mockPlayer1.socketId, 'rock',
        mockPlayer2.socketId, 'scissors',
      );

      const totalBonus = GROUP_OWNER_BONUS_PER_OWNER * 2;
      const expectedAdminFee = Math.max(0, TOTAL_FEE_PER_ROUND - totalBonus);
      expect(adminService.updateAdminCoins).toHaveBeenCalledWith(expectedAdminFee);
      expect(usersService.addCoins).toHaveBeenCalledWith(mockPlayer1.username, WINNER_AMOUNT_AFTER_FEES);
      expect(usersService.addCoins).toHaveBeenCalledWith(owner1Username, GROUP_OWNER_BONUS_PER_OWNER);
      expect(usersService.addCoins).toHaveBeenCalledWith(owner2Username, GROUP_OWNER_BONUS_PER_OWNER);
    });

    it('Scenario 4: should pay bonus once for non-unique group owners and adjust admin fee', async () => {
      const ownerTelegramId = 123;
      const ownerUsername = 'owner123';
      const sessionData = createSessionData([ownerTelegramId, ownerTelegramId]); // Duplicate IDs

      (usersService.findOneByTelegramUserId as jest.Mock).mockResolvedValueOnce({ username: ownerUsername, coins: 100 });

      await gateway['processRoundCompletion'](
        sessionData, defaultSessionId,
        mockPlayer1.socketId, 'rock',
        mockPlayer2.socketId, 'scissors',
      );

      const expectedAdminFee = Math.max(0, TOTAL_FEE_PER_ROUND - GROUP_OWNER_BONUS_PER_OWNER);
      expect(adminService.updateAdminCoins).toHaveBeenCalledWith(expectedAdminFee);
      expect(usersService.addCoins).toHaveBeenCalledWith(mockPlayer1.username, WINNER_AMOUNT_AFTER_FEES);
      expect(usersService.addCoins).toHaveBeenCalledWith(ownerUsername, GROUP_OWNER_BONUS_PER_OWNER);
      // Ensure it was called only once for the owner despite duplicate entries
      expect((usersService.addCoins as jest.Mock).mock.calls.filter(call => call[0] === ownerUsername).length).toBe(1);
    });

    it('Scenario 5: should cap admin fee at 0 if total bonus exceeds TOTAL_FEE_PER_ROUND', async () => {
      const ownerTelegramId = 123;
      const ownerUsername = 'owner123';
      // Temporarily override TOTAL_FEE_PER_ROUND for this test's logic by directly using a smaller value
      const smallTotalFee = 0.25;
      // To make this test effective, we need to ensure gateway uses this smallTotalFee.
      // This is tricky as TOTAL_FEE_PER_ROUND is a const. For a true unit test,
      // TOTAL_FEE_PER_ROUND might need to be injectable or part of config.
      // Here, we'll calculate expected based on the real TOTAL_FEE_PER_ROUND but verify logic.
      // The code itself has Math.max(0, ...), so this test verifies that behavior.

      const sessionData = createSessionData([ownerTelegramId]);
      (usersService.findOneByTelegramUserId as jest.Mock).mockResolvedValueOnce({ username: ownerUsername, coins: 100 });

      // If we could mock TOTAL_FEE_PER_ROUND to be smallTotalFee, the expected admin fee would be 0.
      // Since we can't directly mock the const, we test the Math.max(0, ...) part.
      // If TOTAL_FEE_PER_ROUND (2) - 0.5 is > 0, it will be that. If it was < 0, it would be 0.
      // Let's assume TOTAL_FEE_PER_ROUND is its normal value (2)
      // const expectedAdminFee = Math.max(0, TOTAL_FEE_PER_ROUND - GROUP_OWNER_BONUS_PER_OWNER); // This part is removed as it's not the main focus of this test case.
      // If we want to test the specific case where fee becomes 0:
      // const manyOwners = [1,2,3,4,5]; // 5 * 0.5 = 2.5 bonus
      // const sessionDataManyOwners = createSessionData(manyOwners);
      // (usersService.findOneByTelegramUserId as jest.Mock).mockImplementation(tgId => Promise.resolve({username: `owner${tgId}`}));
      // await gateway['processRoundCompletion'](sessionDataManyOwners, ...);
      // expect(adminService.updateAdminCoins).toHaveBeenCalledWith(0);
      // This test will use one owner, and the Math.max(0,...) in source code is what's tested.

      // To test the specific zero-cap with current constants:
      // This part tests when total bonus (2.5) exceeds TOTAL_FEE_PER_ROUND (2)
      const ownerIds = [1, 2, 3, 4, 5]; // 5 owners * 0.5 = 2.5 bonus
      const sessionDataForZeroFee = createSessionData(ownerIds);

      // Reset and re-mock findOneByTelegramUserId specifically for this test's needs
      (usersService.findOneByTelegramUserId as jest.Mock).mockReset();
      (usersService.findOneByTelegramUserId as jest.Mock).mockImplementation(async (tgId: string) => {
        return { username: `owner${tgId}`, coins: 100 };
      });
      // also reset addCoins to ensure clean call list for this test.
      (usersService.addCoins as jest.Mock).mockReset();
      (usersService.addCoins as jest.Mock).mockResolvedValue(null); // default behavior for addCoins

      await gateway['processRoundCompletion'](
        sessionDataForZeroFee, "zeroFeeSession",
        mockPlayer1.socketId, 'rock',
        mockPlayer2.socketId, 'scissors',
      );
      // Winner still gets paid
      expect(usersService.addCoins).toHaveBeenCalledWith(mockPlayer1.username, WINNER_AMOUNT_AFTER_FEES);
      // Admin fee should be 0, so updateAdminCoins should not be called due to `if (adminFeeForThisRound > 0)`
      expect(adminService.updateAdminCoins).not.toHaveBeenCalled();
      for(let i=0; i < ownerIds.length; i++){
          expect(usersService.addCoins).toHaveBeenCalledWith(`owner${ownerIds[i]}`, GROUP_OWNER_BONUS_PER_OWNER);
      }
    });

    it('Scenario 6: should reduce admin fee even if group owner not found, and not pay non-existent owner', async () => {
      const ownerTelegramId = 789;
      const sessionData = createSessionData([ownerTelegramId]);

      (usersService.findOneByTelegramUserId as jest.Mock).mockResolvedValueOnce(null); // Owner not found

      await gateway['processRoundCompletion'](
        sessionData, defaultSessionId,
        mockPlayer1.socketId, 'rock',
        mockPlayer2.socketId, 'scissors',
      );

      // Admin fee is reduced because an attempt to pay a unique owner was made.
      // The problem description implies the fee is reduced by the *number* of unique owners,
      // not by the number of *successfully paid* owners.
      const expectedAdminFee = Math.max(0, TOTAL_FEE_PER_ROUND - GROUP_OWNER_BONUS_PER_OWNER);
      expect(adminService.updateAdminCoins).toHaveBeenCalledWith(expectedAdminFee);
      expect(usersService.addCoins).toHaveBeenCalledWith(mockPlayer1.username, WINNER_AMOUNT_AFTER_FEES);
      // Ensure addCoins was not called for the non-existent owner's username
      const addCoinsCalls = (usersService.addCoins as jest.Mock).mock.calls;
      const ownerPaymentCall = addCoinsCalls.find(call => call[1] === GROUP_OWNER_BONUS_PER_OWNER && call[0] !== mockPlayer1.username);
      expect(ownerPaymentCall).toBeUndefined();
    });

    it('Scenario 7: should correctly handle mixed valid and invalid (null/undefined) group owner entries', async () => {
        const owner1TgId = 123;
        const owner1Username = 'owner123';
        const owner2TgId = 456;
        const owner2Username = 'owner456';
        // Explicitly type the array to include null/undefined if SessionData allows, or ensure filtering handles it.
        // The code `filter(id => typeof id === 'number' && id !== null && id !== undefined)` handles this.
        const sessionData = createSessionData([owner1TgId, null, owner2TgId, undefined] as any[]);


        (usersService.findOneByTelegramUserId as jest.Mock)
            .mockImplementation(async (tgId: string) => {
            if (tgId === owner1TgId.toString()) return { username: owner1Username, coins: 100 };
            if (tgId === owner2TgId.toString()) return { username: owner2Username, coins: 100 };
            return null;
            });

        await gateway['processRoundCompletion'](
            sessionData, defaultSessionId,
            mockPlayer1.socketId, 'rock',
            mockPlayer2.socketId, 'scissors',
        );

        const totalBonus = GROUP_OWNER_BONUS_PER_OWNER * 2; // For two valid owners
        const expectedAdminFee = Math.max(0, TOTAL_FEE_PER_ROUND - totalBonus);
        expect(adminService.updateAdminCoins).toHaveBeenCalledWith(expectedAdminFee);
        expect(usersService.addCoins).toHaveBeenCalledWith(mockPlayer1.username, WINNER_AMOUNT_AFTER_FEES);
        expect(usersService.addCoins).toHaveBeenCalledWith(owner1Username, GROUP_OWNER_BONUS_PER_OWNER);
        expect(usersService.addCoins).toHaveBeenCalledWith(owner2Username, GROUP_OWNER_BONUS_PER_OWNER);
        // Ensure addCoins was called exactly 3 times (winner + 2 owners)
        expect((usersService.addCoins as jest.Mock).mock.calls.length).toBe(3);
    });

    // Additional test: What if admin fee is exactly covered by bonuses?
    it('should handle admin fee being exactly covered by bonuses (admin fee becomes 0)', async () => {
        // Need 4 owners to make bonus 4 * 0.5 = 2, which is TOTAL_FEE_PER_ROUND
        const ownerIds = [10, 20, 30, 40];
        const usernames = ownerIds.map(id => `owner${id}`);
        const sessionData = createSessionData(ownerIds);

        (usersService.findOneByTelegramUserId as jest.Mock).mockImplementation(async (tgId: string) => {
            const id = parseInt(tgId);
            if (ownerIds.includes(id)) return { username: `owner${id}`, coins: 100 };
            return null;
        });

        await gateway['processRoundCompletion'](
            sessionData, defaultSessionId,
            mockPlayer1.socketId, 'rock',
            mockPlayer2.socketId, 'scissors',
        );
        // If adminFeeForThisRound is 0, updateAdminCoins is not called due to `if (adminFeeForThisRound > 0)`
        expect(adminService.updateAdminCoins).not.toHaveBeenCalled();
        expect(usersService.addCoins).toHaveBeenCalledWith(mockPlayer1.username, WINNER_AMOUNT_AFTER_FEES);
        for (const username of usernames) {
            expect(usersService.addCoins).toHaveBeenCalledWith(username, GROUP_OWNER_BONUS_PER_OWNER);
        }
    });
  });

  describe('handleStart - Group Owner Logic', () => {
    const mockClientSocket = { id: 'client1Socket', emit: jest.fn() };
    const mockClientSocket2 = { id: 'client2Socket', emit: jest.fn() };

    beforeEach(() => {
      // Mock userService.create to return a user with enough coins by default
      (mockUsersService.create as jest.Mock).mockImplementation((dto: { username: string, telegramUserId: string }) =>
        Promise.resolve({
          username: dto.username,
          telegramUserId: dto.telegramUserId,
          coins: ROUND_BET_AMOUNT * 2 // Ensure enough coins
        })
      );
      (mockRedisService.set as jest.Mock).mockResolvedValue('OK');
      // Reset matchmaking queue and other relevant states if necessary
      gateway['matchmakingQueue'] = [];
      gateway['socketToSessionMap'] = new Map();
      gateway['matchmakingBotTimers'] = new Map();

    });

    const callHandleStart = async (playerData: { username: string, userId: string, groupOwner?: number }, clientSocket: any) => {
      await gateway.handleStart(playerData, clientSocket as any);
    };

    it('Test Case 1: Player 1 group owner approved', async () => {
      (mockRevshareService.findRequestByTelegramUserId as jest.Mock).mockResolvedValue({ status: 'approved' });

      await callHandleStart({ username: 'p1', userId: 'u1', groupOwner: 123 }, mockClientSocket);
      await callHandleStart({ username: 'p2', userId: 'u2' }, mockClientSocket2); // Player 2 to start the game

      expect(mockRedisService.set).toHaveBeenCalled();
      const sessionData: SessionData = JSON.parse((mockRedisService.set as jest.Mock).mock.calls[0][1]);
      expect(sessionData.groupOwners).toContain(123);
    });

    it('Test Case 2: Player 1 group owner pending', async () => {
      (mockRevshareService.findRequestByTelegramUserId as jest.Mock).mockResolvedValue({ status: 'pending' });

      await callHandleStart({ username: 'p1', userId: 'u1', groupOwner: 123 }, mockClientSocket);
      await callHandleStart({ username: 'p2', userId: 'u2' }, mockClientSocket2);

      expect(mockRedisService.set).toHaveBeenCalled();
      const sessionData: SessionData = JSON.parse((mockRedisService.set as jest.Mock).mock.calls[0][1]);
      expect(sessionData.groupOwners).not.toContain(123);
    });

    it('Test Case 3: Player 1 group owner not found', async () => {
      (mockRevshareService.findRequestByTelegramUserId as jest.Mock).mockResolvedValue(null);

      await callHandleStart({ username: 'p1', userId: 'u1', groupOwner: 123 }, mockClientSocket);
      await callHandleStart({ username: 'p2', userId: 'u2' }, mockClientSocket2);

      expect(mockRedisService.set).toHaveBeenCalled();
      const sessionData: SessionData = JSON.parse((mockRedisService.set as jest.Mock).mock.calls[0][1]);
      expect(sessionData.groupOwners).not.toContain(123);
    });

    it('Test Case 4: Player 2 group owner approved', async () => {
      // Player 1 has no group owner, Player 2 has an approved one
      (mockRevshareService.findRequestByTelegramUserId as jest.Mock).mockImplementation(async (tgId) => {
        if (tgId === '456') return { status: 'approved' };
        return null;
      });

      await callHandleStart({ username: 'p1', userId: 'u1' }, mockClientSocket);
      await callHandleStart({ username: 'p2', userId: 'u2', groupOwner: 456 }, mockClientSocket2);

      expect(mockRedisService.set).toHaveBeenCalled();
      const sessionData: SessionData = JSON.parse((mockRedisService.set as jest.Mock).mock.calls[0][1]);
      expect(sessionData.groupOwners).toContain(456);
      expect(sessionData.groupOwners.length).toBe(1);
    });

    it('Test Case 5: Both players group owners approved', async () => {
      (mockRevshareService.findRequestByTelegramUserId as jest.Mock).mockImplementation(async (tgId) => {
        if (tgId === '123' || tgId === '456') return { status: 'approved' };
        return null;
      });

      await callHandleStart({ username: 'p1', userId: 'u1', groupOwner: 123 }, mockClientSocket);
      await callHandleStart({ username: 'p2', userId: 'u2', groupOwner: 456 }, mockClientSocket2);

      expect(mockRedisService.set).toHaveBeenCalled();
      const sessionData: SessionData = JSON.parse((mockRedisService.set as jest.Mock).mock.calls[0][1]);
      expect(sessionData.groupOwners).toContain(123);
      expect(sessionData.groupOwners).toContain(456);
      expect(sessionData.groupOwners.length).toBe(2);
    });

    it('Test Case 6: P1 owner approved, P2 owner not (e.g. pending)', async () => {
      (mockRevshareService.findRequestByTelegramUserId as jest.Mock).mockImplementation(async (tgId) => {
        if (tgId === '123') return { status: 'approved' };
        if (tgId === '456') return { status: 'pending' };
        return null;
      });

      await callHandleStart({ username: 'p1', userId: 'u1', groupOwner: 123 }, mockClientSocket);
      await callHandleStart({ username: 'p2', userId: 'u2', groupOwner: 456 }, mockClientSocket2);

      expect(mockRedisService.set).toHaveBeenCalled();
      const sessionData: SessionData = JSON.parse((mockRedisService.set as jest.Mock).mock.calls[0][1]);
      expect(sessionData.groupOwners).toContain(123);
      expect(sessionData.groupOwners).not.toContain(456);
      expect(sessionData.groupOwners.length).toBe(1);
    });

    it('Test Case 7: No group owners provided by either player', async () => {
      (mockRevshareService.findRequestByTelegramUserId as jest.Mock).mockResolvedValue(null); // Should not be called ideally

      await callHandleStart({ username: 'p1', userId: 'u1' }, mockClientSocket);
      await callHandleStart({ username: 'p2', userId: 'u2' }, mockClientSocket2);

      expect(mockRedisService.set).toHaveBeenCalled();
      const sessionData: SessionData = JSON.parse((mockRedisService.set as jest.Mock).mock.calls[0][1]);
      // Check if groupOwners is empty or not defined (based on implementation, it should be an empty array if no owners are added)
      expect(sessionData.groupOwners).toBeDefined();
      expect(sessionData.groupOwners.length).toBe(0);
      expect(mockRevshareService.findRequestByTelegramUserId).not.toHaveBeenCalled();
    });

     it('Error during revshare check for P1 owner, P2 owner approved', async () => {
      (mockRevshareService.findRequestByTelegramUserId as jest.Mock).mockImplementation(async (tgId) => {
        if (tgId === '123') throw new Error("Revshare service error");
        if (tgId === '456') return { status: 'approved' };
        return null;
      });
      jest.spyOn(gateway['logger'], 'error'); // Spy on logger.error

      await callHandleStart({ username: 'p1', userId: 'u1', groupOwner: 123 }, mockClientSocket);
      await callHandleStart({ username: 'p2', userId: 'u2', groupOwner: 456 }, mockClientSocket2);

      expect(mockRedisService.set).toHaveBeenCalled();
      const sessionData: SessionData = JSON.parse((mockRedisService.set as jest.Mock).mock.calls[0][1]);
      expect(sessionData.groupOwners).not.toContain(123);
      expect(sessionData.groupOwners).toContain(456);
      expect(sessionData.groupOwners.length).toBe(1);
      expect(gateway['logger'].error).toHaveBeenCalledWith(expect.stringContaining('Error checking revshare status for group owner 123'), expect.any(String));
    });

  });
});
