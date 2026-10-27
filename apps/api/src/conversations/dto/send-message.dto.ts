import { IsIn, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsIn(['TEXT', 'IMAGE', 'FILE', 'TEMPLATE'])
  type?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
