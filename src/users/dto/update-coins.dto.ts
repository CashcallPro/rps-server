import { IsNotEmpty, IsNumber, Min } from "class-validator";

export class UpdateCoinsDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0) // Ensure the amount to add/remove is non-negative
  amount: number;
}