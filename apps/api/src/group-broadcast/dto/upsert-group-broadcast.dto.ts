import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsISO8601, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
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
  @MinLength(1)
  @MaxLength(20000)
  contentHtml: string;

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
