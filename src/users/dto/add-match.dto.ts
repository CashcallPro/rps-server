import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

// DTO for a score entry when adding a match
export class ScoreEntryDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsNumber()
  score: number;
}

// DTO for adding a new match
export class AddMatchDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1) // A match should have at least one player
  @IsNotEmpty({ each: true })
  players: string[];

  @IsArray()
  @ValidateNested({ each: true }) // Validates each object in the array
  @Type(() => ScoreEntryDto)     // Transforms plain objects to ScoreEntryDto instances
  @ArrayMinSize(1) // A match should have scores for at least one player
  scores: ScoreEntryDto[];
}