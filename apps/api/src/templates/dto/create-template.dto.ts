import { IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  category?: string;
}
