import { Controller, Get, Logger, UseGuards } from '@nestjs/common'; // Added UseGuards
import { RevshareService } from './revshare.service';
import { Revshare } from './schemas/revshare.schema';
// import { AdminGuard } from '../admin/guards/admin.guard'; // Example guard, assuming you have one

@Controller('revshare')
export class RevshareController {
  private readonly logger = new Logger(RevshareController.name);

  constructor(private readonly revshareService: RevshareService) {}

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
}
