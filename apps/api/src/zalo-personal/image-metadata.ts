import fs from 'node:fs';
import sharp from 'sharp';

export async function imageMetadataGetter(filePath: string) {
  const data = await fs.promises.readFile(filePath);
  const metadata = await sharp(data).metadata();
  return {
    height: metadata.height,
    width: metadata.width,
    size: metadata.size || data.length,
  };
}
