import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsOptional()
  @IsBoolean()
  isAcceptingChats?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxConcurrentChats?: number;
}
