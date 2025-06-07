import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Revshare, RevshareDocument } from './schemas/revshare.schema';

@Injectable()
export class RevshareService {
  private readonly logger = new Logger(RevshareService.name);

  constructor(
    @InjectModel(Revshare.name) private revshareModel: Model<RevshareDocument>,
  ) {}

  async createRequest(
    telegramUserId: string,
    groupHandle?: string,
    groupId?: string,
    message?: string,
  ): Promise<Revshare> {
    this.logger.log(
      `Creating revshare request for telegramUserId: ${telegramUserId}`,
    );
    const newRequest = new this.revshareModel({
      telegramUserId,
      groupHandle,
      groupId,
      message,
      status: 'pending', // Default status
    });
    try {
      return await newRequest.save();
    } catch (error) {
      this.logger.error(
        `Failed to create revshare request for ${telegramUserId}: ${error.message}`,
        error.stack,
      );
      // Rethrow or handle specific errors as needed
      throw error;
    }
  }

  async findRequestByTelegramUserId(
    telegramUserId: string,
  ): Promise<RevshareDocument | null> {
    this.logger.log(
      `Finding revshare request for telegramUserId: ${telegramUserId}`,
    );
    return this.revshareModel.findOne({ telegramUserId }).exec();
  }

  async updateRequest(
    telegramUserId: string,
    data: Partial<Omit<Revshare, 'telegramUserId'>>,
  ): Promise<RevshareDocument> {
    this.logger.log(
      `Updating revshare request for telegramUserId: ${telegramUserId}`,
    );
    const existingRequest = await this.revshareModel
      .findOneAndUpdate({ telegramUserId }, { $set: data }, { new: true })
      .exec();

    if (!existingRequest) {
      throw new NotFoundException(
        `Revshare request for telegramUserId ${telegramUserId} not found.`,
      );
    }
    return existingRequest;
  }

  // Potential future methods:
  // async approveRequest(telegramUserId: string): Promise<RevshareDocument> { ... }
  // async rejectRequest(telegramUserId: string, reason: string): Promise<RevshareDocument> { ... }
  async findPendingRequests(): Promise<RevshareDocument[]> {
    this.logger.log('Finding all pending revshare requests.');
    return this.revshareModel.find({ status: 'pending' }).exec();
  }
}
