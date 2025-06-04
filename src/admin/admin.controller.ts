import { Controller, Get, Patch, Body, Logger } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminDocument } from './schemas/admin.schema';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get('coins')
  async getAdminCoins(): Promise<{ coins: number }> {
    this.logger.log('Received request to get admin coins');
    const coins = await this.adminService.getAdminCoins();
    return { coins };
  }

  // Example endpoint for manual adjustment - use with caution
  @Patch('coins/adjust')
  async adjustAdminCoins(@Body() body: { amount: number }): Promise<AdminDocument> {
    const { amount } = body;
    this.logger.log(`Received request to adjust admin coins by: ${amount}`);
    if (typeof amount !== 'number') {
        throw new Error('Amount must be a number');
    }
    return this.adminService.updateAdminCoins(amount);
  }
}
