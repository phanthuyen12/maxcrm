import { IsString } from 'class-validator';

export class CreateCatalogItemDto {
  @IsString()
  name: string;
}

export class UpdateCatalogItemDto {
  @IsString()
  name: string;
}
