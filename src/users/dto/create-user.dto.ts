import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  telegramUserId: string;

  @IsString()
  refereeId?: string;

  @IsNumber()
  @Min(0)
  coins: number;
}