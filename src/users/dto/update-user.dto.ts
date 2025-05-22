import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

// You can use PartialType to make all properties optional
// export class UpdateUserDto extends PartialType(CreateUserDto) {}

// Or define explicitly for more control
export class UpdateUserDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  coins?: number;

  // Note: Username updates are often handled differently or disallowed.
  // If you want to allow username updates, add it here:
  // @IsOptional()
  // @IsString()
  // @IsNotEmpty()
  // username?: string;
}