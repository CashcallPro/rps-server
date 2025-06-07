import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger, // Import Logger
  InternalServerErrorException, // Import InternalServerErrorException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, Match } from './schemas/user.schema'; // Import Match
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AddMatchDto } from './dto/add-match.dto'; // Import AddMatchDto
import { messagesEn } from 'src/i18n/en';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name); // Instantiate Logger

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log('user to create', `name: ${createUserDto.username}, referee: ${createUserDto.refereeId}`)
    const createdUser = new this.userModel(createUserDto);
    try {
      return await createdUser.save();
    } catch (error) {
      if (error.code === 11000) {
        return this.findOneByUsername(createUserDto.username)
      }
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw new InternalServerErrorException(messagesEn.COULD_NOT_CREATE_USER);
    }
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOneByUsername(username: string) { // Return User, not User | null
    const user = await this.userModel.findOne({ username }).exec();
    if (!user) {
      throw new NotFoundException(messagesEn.USER_NOT_FOUND_USERNAME(username));
    }
    return user;
  }

  async findOneByTelegramUserId(userId: string) {
    const user = await this.userModel.findOne({ telegramUserId: userId }).exec();
    if (!user) {
      return null
    }
    return user;
  }

  async findById(id: string): Promise<User> { // Return User, not User | null
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(messagesEn.USER_NOT_FOUND_ID(id));
    }
    return user;
  }

  async updateByTelegramId(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const { referralToAdd, ...otherUpdates } = updateUserDto; // Destructure DTO

    const updateOps: any = {};

    if (Object.keys(otherUpdates).length > 0) {
      Object.assign(updateOps, otherUpdates);
    }

    if (referralToAdd) {
      if (referralToAdd.trim() === '') {
        throw new BadRequestException(messagesEn.REFERRAL_CODE_EMPTY);
      }
      updateOps.$push = { referrals: referralToAdd };
    }

    if (Object.keys(updateOps).length === 0) {
      const existingUser = await this.userModel.findOne({ telegramUserId: userId }).exec();
      if (!existingUser) {
        throw new NotFoundException(messagesEn.USER_NOT_FOUND_TELEGRAM_ID(userId));
      }
      return existingUser;
    }

    const updatedUser = await this.userModel
      .findOneAndUpdate(
        { telegramUserId: userId },
        updateOps, 
        { new: true }
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(messagesEn.USER_NOT_FOUND_TELEGRAM_ID(userId));
    }
    return updatedUser;
  }

  async update(username: string, updateUserDto: UpdateUserDto): Promise<User> { // Return User, not User | null
    const updatedUser = await this.userModel
      .findOneAndUpdate({ username }, updateUserDto, { new: true })
      .exec();
    if (!updatedUser) {
      throw new NotFoundException(messagesEn.USER_NOT_FOUND_USERNAME(username));
    }
    return updatedUser;
  }

  async remove(username: string): Promise<User> { // Return User, not User | null
    const deletedUser = await this.userModel.findOneAndDelete({ username }).exec();
    if (!deletedUser) {
      throw new NotFoundException(messagesEn.USER_NOT_FOUND_USERNAME(username));
    }
    return deletedUser;
  }

  async addCoins(username: string, amount: number): Promise<User> {
    if (amount < 0) {
      throw new BadRequestException(messagesEn.AMOUNT_NON_NEGATIVE);
    }
    const user = await this.userModel.findOneAndUpdate(
      { username },
      { $inc: { coins: amount } },
      { new: true },
    ).exec();

    if (!user) {
      throw new NotFoundException(messagesEn.USER_NOT_FOUND_USERNAME(username));
    }
    return user;
  }

  async removeCoins(username: string, amount: number): Promise<User> {
    // ... (existing code)
    if (amount < 0) {
      throw new BadRequestException(messagesEn.AMOUNT_NON_NEGATIVE);
    }
    const user = await this.findOneByUsername(username);
    if (user.coins < amount) {
      throw new BadRequestException(messagesEn.USER_INSUFFICIENT_COINS(username, user.coins, amount));
    }
    const updatedUser = await this.userModel.findOneAndUpdate(
      { username },
      { $inc: { coins: -amount } },
      { new: true },
    ).exec();
    if (!updatedUser) { // Should ideally not happen if findOneByUsername passed
      throw new NotFoundException(messagesEn.USER_NOT_FOUND_USERNAME(username));
    }
    return updatedUser;
  }

  // --- New method to add a match ---
  async addMatch(username: string, addMatchDto: AddMatchDto): Promise<User> {
    const user = await this.findOneByUsername(username); // Ensures user exists

    // Optional: Check if a match with this sessionId already exists for this user
    const existingMatch = user.matches.find(
      (match) => match.sessionId === addMatchDto.sessionId,
    );
    if (existingMatch) {
      throw new BadRequestException(messagesEn.MATCH_ALREADY_RECORDED(addMatchDto.sessionId, username));
    }

    // Create a new match object conforming to the Match sub-schema
    const newMatch: Omit<Match, 'createdAt' | 'updatedAt'> = { // Omit Mongoose-managed fields
      sessionId: addMatchDto.sessionId,
      players: addMatchDto.players,
      scores: addMatchDto.scores.map(s => ({ username: s.username, score: s.score })),
    };

    user.matches.push(newMatch as Match); // Add to the array

    try {
      await user.save();
      return user; // Return the updated user document
    } catch (error) {
      this.logger.error(
        `Failed to add match for user '${username}': ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(messagesEn.COULD_NOT_RECORD_MATCH);
    }
  }

  // --- New method to get matches for a user ---
  async getUserMatches(username: string): Promise<Match[]> {
    const user = await this.findOneByUsername(username);
    return user.matches;
  }
}