import { mkdir } from 'fs/promises';
import { join } from 'path';

const STORAGE_DIR = join(process.cwd(), 'storage', 'resumes');

/**
 * Returns the file path for a resume PDF and ensures the directory exists.
 * Format: ./storage/resumes/{jobId}-{timestamp}.pdf
 */
export async function getResumePath(jobId: string): Promise<string> {
  await mkdir(STORAGE_DIR, { recursive: true });
  const timestamp = Date.now();
  return join(STORAGE_DIR, `${jobId}-${timestamp}.pdf`);
}
