import { access } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';

/**
 * Đổi một URL `/uploads/<tên tệp>` thành đường dẫn thật trên đĩa. Chỉ nhận tệp
 * nằm trong thư mục uploads để một URL dựng tay không đọc được tệp khác của máy.
 */
export function uploadPathFromUrl(attachmentUrl: string) {
  let pathname: string;
  try {
    pathname = new URL(attachmentUrl, 'http://crm.local').pathname;
  } catch {
    throw new Error('Đường dẫn tệp đính kèm không hợp lệ');
  }
  if (!pathname.startsWith('/uploads/')) throw new Error('Tệp gửi Zalo phải nằm trong thư mục uploads');
  const filename = basename(pathname);
  const uploadDirectory = resolve(process.cwd(), 'uploads');
  const filePath = resolve(uploadDirectory, filename);
  if (!filename || !filePath.startsWith(`${uploadDirectory}${sep}`)) throw new Error('Đường dẫn tệp đính kèm không hợp lệ');
  return filePath;
}

/** Như trên nhưng kiểm tra tệp còn tồn tại. */
export async function existingUploadPath(attachmentUrl: string) {
  const filePath = uploadPathFromUrl(attachmentUrl);
  try {
    await access(filePath);
  } catch {
    throw new Error(`Không tìm thấy tệp đã tải lên: ${basename(filePath)}`);
  }
  return filePath;
}
