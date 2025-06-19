import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// You can use PartialType to make all properties optional
// export class UpdateUserDto extends PartialType(CreateUserDto) {}

// Or define explicitly for more control
export class UpdateUserDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  coins?: number;

  @IsOptional()
  @IsString({ message: 'Each referral item must be a string.' })
  referralToAdd?: string;
  
  @IsOptional()
  @IsString({ message: 'Badge must be a string.' })
  badgeToAdd?: string;
}