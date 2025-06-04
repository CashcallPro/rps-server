import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin, AdminDocument, ADMIN_SINGLETON_ID } from './schemas/admin.schema';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) {}

  async getAdmin(): Promise<AdminDocument> {
    let admin = await this.adminModel.findOne({ adminId: ADMIN_SINGLETON_ID }).exec();
    if (!admin) {
      this.logger.log('Admin document not found, creating one.');
      admin = new this.adminModel({ adminId: ADMIN_SINGLETON_ID, coins: 0 });
      await admin.save();
    }
    return admin;
  }

  async updateAdminCoins(amount: number): Promise<AdminDocument> {
    if (amount === 0) {
        // Avoid unnecessary database operation if amount is zero
        return this.getAdmin();
    }
    this.logger.log(`Updating admin coins by: ${amount}`);
    const updatedAdmin = await this.adminModel.findOneAndUpdate(
      { adminId: ADMIN_SINGLETON_ID },
      { $inc: { coins: amount } },
      { new: true, upsert: true, setDefaultsOnInsert: true }, // upsert ensures creation if not found
    ).exec();

    if (!updatedAdmin) {
        // This case should ideally be handled by upsert, but as a fallback:
        this.logger.error('Failed to update or create admin document. This should not happen with upsert.');
        // Attempt to create it explicitly if somehow upsert failed (highly unlikely)
        const admin = new this.adminModel({ adminId: ADMIN_SINGLETON_ID, coins: amount });
        return admin.save();
    }
    this.logger.log(`Admin coins updated. New balance: ${updatedAdmin.coins}`);
    return updatedAdmin;
  }

  // For potential future use or testing
  async getAdminCoins(): Promise<number> {
    const admin = await this.getAdmin();
    return admin.coins;
  }
}
