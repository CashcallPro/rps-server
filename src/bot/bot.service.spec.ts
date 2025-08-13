import { Test, TestingModule } from '@nestjs/testing';
import { BotService } from './bot.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RevshareService } from '../revshare/revshare.service';

describe('BotService', () => {
  let service: BotService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'fake-token';
      if (key === 'TELEGRAM_GAME_SHORTNAME') return 'fake-game';
      if (key === 'TELEGRAM_GAME_URL') return 'http://fake.url';
      if (key === 'REFERRAL_BONUS') return 100;
      if (key === 'REFEREE_BONUS') return 50;
      if (key === 'WISHLIST_PHOTO') return 'http://fake.photo';
      return null;
    }),
  };

  const mockUsersService = {
    findAll: jest.fn(),
  };

  const mockRevshareService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: RevshareService, useValue: mockRevshareService },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
