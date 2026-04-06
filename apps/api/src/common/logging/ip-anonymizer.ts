import * as crypto from 'crypto';

/**
 * IP Anonymizer - GDPR Compliant
 *
 * Anonymizes IP addresses according to GDPR requirements:
 * - IPv4: Hash the last octet to make it pseudo-anonymous
 * - IPv6: Hash the last 64 bits
 *
 * This satisfies GDPR's requirement for pseudo-anonymization
 * while maintaining enough information for security analysis
 *
 * Reference: GDPR Recital 26 - Pseudo-anonymization
 */
export class IpAnonymizer {
  /**
   * Anonymize an IPv4 or IPv6 address
   * @param ip IP address to anonymize
   * @returns Anonymized IP address
   */
  static anonymize(ip: string): string {
    if (!ip) return 'unknown';

    // IPv4 detection
    if (ip.includes('.')) {
      return this.anonymizeIpv4(ip);
    }

    // IPv6 detection
    if (ip.includes(':')) {
      return this.anonymizeIpv6(ip);
    }

    return 'invalid';
  }

  /**
   * Anonymize IPv4 address
   * Format: XXX.XXX.XXX.*** (last octet hashed)
   * @param ip IPv4 address
   * @returns Anonymized IPv4
   */
  private static anonymizeIpv4(ip: string): string {
    const parts = ip.split('.');

    if (parts.length !== 4) {
      return 'invalid-ipv4';
    }

    // Validate octets
    if (!parts.every((part) => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    })) {
      return 'invalid-ipv4';
    }

    // Hash the last octet for GDPR compliance
    const lastOctet = parts[3];
    const hash = crypto
      .createHash('sha256')
      .update(lastOctet)
      .digest('hex')
      .substring(0, 8);

    return `${parts[0]}.${parts[1]}.${parts[2]}.${hash}`;
  }

  /**
   * Anonymize IPv6 address
   * Format: ****:****:****:****:****.***.***.*** (last 64 bits hashed)
   * @param ip IPv6 address
   * @returns Anonymized IPv6
   */
  private static anonymizeIpv6(ip: string): string {
    const parts = ip.split(':');

    if (parts.length < 3) {
      return 'invalid-ipv6';
    }

    // Keep first half, anonymize second half (last 64 bits)
    const keepParts = Math.ceil(parts.length / 2);
    const keptParts = parts.slice(0, keepParts);

    // Hash the removed parts
    const removedParts = parts.slice(keepParts).join(':');
    const hash = crypto
      .createHash('sha256')
      .update(removedParts)
      .digest('hex')
      .substring(0, 8);

    return `${keptParts.join(':')}:${hash}`;
  }

  /**
   * Check if an IP should be logged
   * Excludes private/internal IPs if configured
   * @param ip IP address to check
   * @returns true if IP should be logged
   */
  static shouldLog(ip: string): boolean {
    if (!ip) return false;

    // Private IPv4 ranges
    const privateIpv4 = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
    ];

    // Private IPv6
    const privateIpv6 = [
      /^fc00:/i,
      /^fd00:/i,
      /^::1/i,
      /^fe80:/i,
    ];

    for (const pattern of privateIpv4) {
      if (pattern.test(ip)) {
        return false; // Don't log private IPs
      }
    }

    for (const pattern of privateIpv6) {
      if (pattern.test(ip)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract client IP from various sources
   * Handles X-Forwarded-For, X-Real-IP, and direct connection
   * @param request Express request object
   * @returns Client IP address
   */
  static extractClientIp(request: any): string {
    // Check X-Forwarded-For (for proxies)
    const forwarded = request.get?.('X-Forwarded-For');
    if (forwarded) {
      // Take the first IP if multiple are listed
      return forwarded.split(',')[0].trim();
    }

    // Check X-Real-IP (for some reverse proxies)
    const realIp = request.get?.('X-Real-IP');
    if (realIp) {
      return realIp;
    }

    // Use socket remote address
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  /**
   * Validate IP address format
   * @param ip IP to validate
   * @returns true if valid IPv4 or IPv6
   */
  static isValid(ip: string): boolean {
    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Pattern.test(ip)) {
      const parts = ip.split('.');
      return parts.every((part) => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }

    // IPv6 pattern (simplified)
    const ipv6Pattern = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;
    return ipv6Pattern.test(ip);
  }
}
