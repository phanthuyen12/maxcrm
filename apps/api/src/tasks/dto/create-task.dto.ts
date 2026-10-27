import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsString()
  assigneeId: string;

  @IsDateString()
  dueAt: string;

  @IsOptional()
  @IsString()
  priority?: string;
}
