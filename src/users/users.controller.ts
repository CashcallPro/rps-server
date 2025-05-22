import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  // NotFoundException, // No longer needed here as service handles it
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateCoinsDto } from './dto/update-coins.dto';
import { AddMatchDto } from './dto/add-match.dto'; // Import AddMatchDto

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':username')
  async findOne(@Param('username') username: string) {
    return this.usersService.findOneByUsername(username);
  }

  @Patch(':username')
  async update(
    @Param('username') username: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(username, updateUserDto);
  }

  @Delete(':username')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('username') username: string) {
    await this.usersService.remove(username);
    // No need to return the user, 204 implies success
  }

  @Patch(':username/add-coins')
  async addCoins(
    @Param('username') username: string,
    @Body() updateCoinsDto: UpdateCoinsDto,
  ) {
    return this.usersService.addCoins(username, updateCoinsDto.amount);
  }

  @Patch(':username/remove-coins')
  async removeCoins(
    @Param('username') username: string,
    @Body() updateCoinsDto: UpdateCoinsDto,
  ) {
    return this.usersService.removeCoins(username, updateCoinsDto.amount);
  }

  // --- New endpoint to add a match to a user ---
  @Post(':username/matches')
  @HttpCode(HttpStatus.CREATED)
  async addMatchToUser(
    @Param('username') username: string,
    @Body() addMatchDto: AddMatchDto, // Use the DTO for validation
  ) {
    // The service will return the updated user document, including the new match
    return this.usersService.addMatch(username, addMatchDto);
  }

  // --- New endpoint to get all matches for a user ---
  @Get(':username/matches')
  async getUserMatches(@Param('username') username: string) {
    return this.usersService.getUserMatches(username);
  }
}