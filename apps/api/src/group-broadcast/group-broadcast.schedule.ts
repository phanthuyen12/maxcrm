import { GroupBroadcastRepeat } from '@prisma/client';

/**
 * Lịch gửi được tính theo giờ Việt Nam. Việt Nam không có giờ mùa hè nên cộng
 * thêm số ngày trên mốc UTC vẫn giữ nguyên giờ treo tường — chỉ lặp theo tháng
 * mới cần quy đổi về các thành phần ngày/giờ.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function vnFields(date: Date) {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

function fromVnFields(year: number, month: number, day: number, hour: number, minute: number, second: number) {
  return new Date(Date.UTC(year, month, day, hour, minute, second) - VN_OFFSET_MS);
}

function stepOnce(from: Date, repeat: GroupBroadcastRepeat, weekdays: number[]): Date | null {
  if (repeat === GroupBroadcastRepeat.NONE) return null;
  if (repeat === GroupBroadcastRepeat.DAILY) return new Date(from.getTime() + DAY_MS);
  if (repeat === GroupBroadcastRepeat.WEEKLY) {
    if (!weekdays.length) return new Date(from.getTime() + 7 * DAY_MS);
    for (let offset = 1; offset <= 7; offset++) {
      const candidate = new Date(from.getTime() + offset * DAY_MS);
      if (weekdays.includes(vnFields(candidate).weekday)) return candidate;
    }
    return new Date(from.getTime() + 7 * DAY_MS);
  }
  const fields = vnFields(from);
  const monthIndex = fields.month + 1;
  const year = fields.year + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return fromVnFields(year, month, Math.min(fields.day, daysInMonth), fields.hour, fields.minute, fields.second);
}

/** Mốc gửi kế tiếp sau `base` và phải nằm ở tương lai so với `now`. */
export function nextRunAfter(base: Date, repeat: GroupBroadcastRepeat, weekdays: number[], now = new Date()): Date | null {
  if (repeat === GroupBroadcastRepeat.NONE) return null;
  let candidate = base;
  for (let guard = 0; guard < 500; guard++) {
    const next = stepOnce(candidate, repeat, weekdays);
    if (!next) return null;
    candidate = next;
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  return null;
}

/**
 * Lần gửi đầu tiên: giữ nguyên mốc người dùng chọn, trừ khi lặp theo tuần mà
 * hôm đó không nằm trong các thứ đã chọn, hoặc mốc đã trôi qua và lịch có lặp.
 */
export function firstRunAt(scheduledAt: Date, repeat: GroupBroadcastRepeat, weekdays: number[], now = new Date()): Date | null {
  const matchesWeekday = repeat !== GroupBroadcastRepeat.WEEKLY || !weekdays.length || weekdays.includes(vnFields(scheduledAt).weekday);
  if (matchesWeekday && scheduledAt.getTime() > now.getTime()) return scheduledAt;
  if (repeat === GroupBroadcastRepeat.NONE) return null;
  return nextRunAfter(scheduledAt, repeat, weekdays, now);
}

export function parseWeekdays(value: string | null | undefined): number[] {
  if (!value) return [];
  return [...new Set(value.split(',').map((part) => Number.parseInt(part.trim(), 10)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort();
}

export function serializeWeekdays(days: number[] | undefined): string | null {
  const normalized = parseWeekdays((days ?? []).join(','));
  return normalized.length ? normalized.join(',') : null;
}
