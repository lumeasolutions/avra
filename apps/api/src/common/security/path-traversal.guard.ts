import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

/**
 * Path Traversal Protection Utility
 *
 * Validates file paths to prevent directory traversal attacks (e.g., ../../../etc/passwd)
 * Ensures uploaded files stay within the upload directory
 */
export class PathTraversalGuard {
  /**
   * Validate that a file path remains within the safe upload directory
   * @param filePath The relative file path to validate
   * @param uploadDir The base upload directory
   * @throws BadRequestException if path traversal is detected
   * @returns The resolved and validated file path
   */
  static validateUploadPath(filePath: string, uploadDir: string = process.env.UPLOAD_DIR ?? '/tmp/uploads'): string {
    // Normalize the path to resolve .. and .
    const normalizedPath = path.normalize(filePath);

    // Resolve the full path
    const fullPath = path.resolve(uploadDir, normalizedPath);
    const resolvedUploadDir = path.resolve(uploadDir);

    // Check if the resolved path starts with the upload directory
    if (!fullPath.startsWith(resolvedUploadDir)) {
      throw new BadRequestException(
        'Invalid file path: Path traversal detected. Files must remain within the upload directory.'
      );
    }

    // Additional check: ensure no null bytes in the path
    if (filePath.includes('\0') || normalizedPath.includes('\0')) {
      throw new BadRequestException('Invalid file path: Null bytes are not allowed.');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = ['..', '~', '$'];
    for (const pattern of suspiciousPatterns) {
      if (normalizedPath.includes(pattern)) {
        throw new BadRequestException(`Invalid file path: Character '${pattern}' is not allowed in file paths.`);
      }
    }

    return fullPath;
  }

  /**
   * Validate a storage key (filename stored in DB)
   * @param storageKey The storage key from the database
   * @throws BadRequestException if validation fails
   * @returns The validated storage key
   */
  static validateStorageKey(storageKey: string): string {
    // Storage keys should be UUIDs or alphanumeric with minimal special chars
    if (!storageKey || storageKey.length === 0) {
      throw new BadRequestException('Invalid storage key: Empty key.');
    }

    // Allow: alphanumeric, dashes, underscores, dots
    const validPattern = /^[a-zA-Z0-9._-]+$/;
    if (!validPattern.test(storageKey)) {
      throw new BadRequestException(
        'Invalid storage key: Only alphanumeric characters, dashes, underscores, and dots are allowed.'
      );
    }

    // Prevent directory traversal patterns
    if (storageKey.includes('/') || storageKey.includes('\\') || storageKey.includes('..')) {
      throw new BadRequestException('Invalid storage key: Directory separators are not allowed.');
    }

    return storageKey;
  }
}
