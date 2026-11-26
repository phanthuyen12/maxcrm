import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsISO8601, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { GroupBroadcastRepeat } from '@prisma/client';

export class GroupBroadcastTargetDto {
  @IsString()
  @MaxLength(64)
  groupId: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  groupName?: string;
}

export class GroupBroadcastImageDto {
  /** URL do endpoint tải ảnh trả về; chỉ nhận tệp trong thư mục uploads. */
  @IsString()
  @Matches(/^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/, { message: 'Ảnh phải là tệp đã tải lên qua hệ thống' })
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class UpsertGroupBroadcastDto {
  @IsString()
  @MaxLength(64)
  accountId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  /** HTML soạn từ editor; server tự chuyển sang text + style của Zalo. */
  @IsString()
  @MaxLength(20000)
  contentHtml: string;

  /** Ảnh gửi kèm, theo đúng thứ tự muốn gửi. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => GroupBroadcastImageDto)
  images?: GroupBroadcastImageDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => GroupBroadcastTargetDto)
  targets: GroupBroadcastTargetDto[];

  /** Thời điểm gửi lần đầu, ISO-8601 (ví dụ 2026-11-27T09:00:00+07:00). */
  @IsISO8601()
  scheduledAt: string;

  @IsOptional()
  @IsEnum(GroupBroadcastRepeat)
  repeat?: GroupBroadcastRepeat;

  /** Chỉ dùng cho lặp theo tuần: các thứ trong tuần, 0 = Chủ nhật. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  repeatDays?: number[];

  /** Giãn cách giữa hai nhóm, tránh Zalo chặn vì gửi quá nhanh. */
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(60000)
  intervalMs?: number;
}
