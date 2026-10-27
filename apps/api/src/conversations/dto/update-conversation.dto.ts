import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateConversationDto {
  @IsOptional()
  @IsIn(['UNREAD', 'PROCESSING', 'RESOLVED'])
  status?: string;

  @IsOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
