import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import * as crypto from 'crypto';

/**
 * Security Controller
 *
 * Provides endpoints for security-related operations
 * such as CSRF token generation
 */
@Controller('security')
export class SecurityController {
  /**
   * GET /api/security/csrf-token
   *
   * Generate and return a new CSRF token
   * Client should include this token in the X-CSRF-Token header for POST/PUT/DELETE requests
   *
   * @param res Express response object
   * @returns CSRF token object
   */
  @Get('csrf-token')
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    // Set token in response header
    res.set('X-CSRF-Token', token);

    return {
      token,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      message: 'Include this token in X-CSRF-Token header for POST/PUT/DELETE requests',
    };
  }
}
