import { Controller, Get, Logger, UseGuards, Patch, Param, HttpCode, HttpStatus, Inject, forwardRef } from '@nestjs/common'; // Added UseGuards, Patch, Param, HttpCode, HttpStatus
import { RevshareService } from './revshare.service';
import { Revshare } from './schemas/revshare.schema';
import { BotService } from '../bot/bot.service'; // Added BotService import
// import { AdminGuard } from '../admin/guards/admin.guard'; // Example guard, assuming you have one
// import { AdminGuard } from '../../admin/guards/admin.guard'; // Assuming path to admin guard


@Controller('revshare')
export class RevshareController {
  private readonly logger = new Logger(RevshareController.name);

  constructor(
    private readonly revshareService: RevshareService,
    private readonly botService: BotService,
  ) { }

  // Example: Get all requests (potentially for an admin dashboard)
  // Consider adding authentication/authorization guards here
  // @UseGuards(AdminGuard) // Uncomment and adjust if you have an AdminGuard
  @Get('requests')
  async getAllRequests(): Promise<Revshare[]> {
    this.logger.log('Received request to get all revshare requests.');
    return this.revshareService.findPendingRequests(); // Assuming you'll add this method to service
  }

  // Add other endpoints as needed, for example:
  // @Get(':telegramUserId')
  // async getRequestByTelegramId(@Param('telegramUserId') telegramUserId: string): Promise<Revshare | null> {
  //   return this.revshareService.findRequestByTelegramUserId(telegramUserId);
  // }

  // @UseGuards(AdminGuard) // Protect this route
  @Patch(':telegramUserId/approve')
  @HttpCode(HttpStatus.OK)
  async approveRequest(@Param('telegramUserId') telegramUserId: string): Promise<Revshare> {
    this.logger.log(`Received request to approve revshare for telegramUserId: ${telegramUserId}`);
    const updatedRequest = await this.revshareService.updateRequest(telegramUserId, { status: 'approved' });

    try {
      await this.botService.sendMessage(
        updatedRequest.telegramUserId,
        "Congratulations! Your rev-share request has been approved. You can now start playing by typing /play in your group."
      );
      this.logger.log(`Approval notification sent to ${updatedRequest.telegramUserId}`);
    } catch (error) {
      this.logger.error(`Failed to send approval notification to ${updatedRequest.telegramUserId}: ${error.message}`, error.stack);
      // Do not rethrow; the admin operation itself (status update) succeeded.
    }
    return updatedRequest;
  }

  // @UseGuards(AdminGuard) // Placeholder
  @Patch(':telegramUserId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectRequest(@Param('telegramUserId') telegramUserId: string): Promise<Revshare> {
    this.logger.log(`Received request to reject revshare for telegramUserId: ${telegramUserId}`);
    const updatedRequest = await this.revshareService.updateRequest(telegramUserId, { status: 'rejected' });

    try {
      await this.botService.sendMessage(
        updatedRequest.telegramUserId,
        "We regret to inform you that your rev-share request has been rejected. Please contact support for further assistance."
      );
      this.logger.log(`Rejection notification sent to ${updatedRequest.telegramUserId}`);
    } catch (error) {
      this.logger.error(`Failed to send rejection notification to ${updatedRequest.telegramUserId}: ${error.message}`, error.stack);
      // Do not rethrow
    }
    return updatedRequest;
  }
}
