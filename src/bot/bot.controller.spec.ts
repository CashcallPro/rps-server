import { Test, TestingModule } from '@nestjs/testing';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';

describe('BotController', () => {
  let controller: BotController;

  const mockBotService = {
    sendGameScore: jest.fn(),
    sendMessage: jest.fn(),
    sendMessageToAllUsers: jest.fn(),
    sendMessageToUsers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotController],
      providers: [{ provide: BotService, useValue: mockBotService }],
    }).compile();

    controller = module.get<BotController>(BotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
