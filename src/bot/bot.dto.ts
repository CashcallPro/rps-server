import { IsString, IsNotEmpty, IsNumber, IsInt } from 'class-validator';

export class SendGameScoreDto {
  @IsString()
  @IsNotEmpty() // Ensures the string is not empty
  clientInlineMessageId: string;

  @IsNumber()
  @IsInt() // Ensures it's an integer
  @IsNotEmpty()
  userId: number;

  @IsNumber()
  @IsNotEmpty()
  score: number;
}


export class SendMessageDto {
  @IsString()
  message: string;

  @IsString()
  chatId: string;
}