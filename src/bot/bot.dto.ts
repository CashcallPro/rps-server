import { IsString, IsNotEmpty, IsNumber, IsInt, IsArray, ArrayNotEmpty } from 'class-validator';

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

export class SendMessageToAllDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class SendMessageToListDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  chatIds: string[];
}