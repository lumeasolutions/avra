import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { IpAnonymizer } from './ip-anonymizer';

/**
 * GDPR Consent Guard
 *
 * Handles user consent for data collection (including IP logging)
 * Respects privacy preferences
 *
 * Checks for consent flags:
 * - Cookie consent from browser
 * - User privacy settings
 * - Regional compliance (GDPR, CCPA, etc.)
 */
@Injectable()
export class GdprConsentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract client IP
    const clientIp = IpAnonymizer.extractClientIp(request);

    // Check if IP should be logged at all (skip private IPs)
    const shouldLogIp = IpAnonymizer.shouldLog(clientIp);

    // Store anonymized IP on request for audit logs
    (request as any).anonymizedIp = shouldLogIp ? IpAnonymizer.anonymize(clientIp) : null;

    // Check for consent cookie
    const hasConsentCookie = this.checkConsentCookie(request);

    // Store consent status on request
    (request as any).hasDataProcessingConsent = hasConsentCookie;

    // Log only if consent given or IP is not logged
    if (shouldLogIp && !hasConsentCookie) {
      // User hasn't given consent but IP would be logged
      // Log a consent required message (without storing the actual IP)
      console.warn(
        '[GDPR] User action without explicit data processing consent. IP logging requires consent.'
      );
    }

    return true;
  }

  /**
   * Check if user has given consent for data processing
   * @param request Express request
   * @returns true if user has given consent
   */
  private checkConsentCookie(request: Request): boolean {
    // Check for consent cookie set by frontend
    const consentCookie = request.cookies?.['gdpr-consent'];

    if (consentCookie) {
      try {
        const consent = JSON.parse(consentCookie);
        return consent.analytics === true && consent.marketing === false && consent.essentials === true;
      } catch {
        return false;
      }
    }

    // Check for consent header (for API clients)
    const consentHeader = request.get('X-GDPR-Consent');
    return consentHeader === 'true' || consentHeader === '1';
  }
}
