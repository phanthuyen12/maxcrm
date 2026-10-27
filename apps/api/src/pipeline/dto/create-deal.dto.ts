import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateDealDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsInt()
  value: number;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
