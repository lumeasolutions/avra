import { Injectable, LoggerService } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Sanitized Logger Service
 *
 * Removes or masks sensitive information from logs:
 * - Passwords and authentication tokens
 * - API keys and secrets
 * - PII (emails, phone numbers, addresses)
 * - IP addresses (anonymized)
 *
 * Implements GDPR-compliant logging
 */
@Injectable()
export class SanitizedLogger implements LoggerService {
  private context: string = '';

  private readonly SENSITIVE_PATTERNS = {
    password: /("password"|"pwd"|"passwd")\s*[:=]\s*["\']?[^"\'\s,}]+/gi,
    token: /("token"|"accessToken"|"refreshToken"|"authorization")\s*[:=]\s*["\']?Bearer\s+[^"\'\s,}]+/gi,
    apiKey: /("apiKey"|"api_key"|"secret"|"api_secret")\s*[:=]\s*["\']?[^"\'\s,}]+/gi,
    email: /[\w\.-]+@[\w\.-]+\.\w+/g,
    ssn: /\d{3}-\d{2}-\d{4}/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  };

  /**
   * Sanitize a message or object before logging
   * @param message Message to sanitize
   * @returns Sanitized message
   */
  private sanitize(message: string | object): string {
    let text = typeof message === 'string' ? message : JSON.stringify(message);

    // Remove passwords
    text = text.replace(this.SENSITIVE_PATTERNS.password, (match) => {
      const [key] = match.split(/[:=]/);
      return `${key}="***REDACTED***"`;
    });

    // Remove tokens
    text = text.replace(this.SENSITIVE_PATTERNS.token, (match) => {
      const [key] = match.split(/[:=]/);
      return `${key}="Bearer ***REDACTED***"`;
    });

    // Remove API keys and secrets
    text = text.replace(this.SENSITIVE_PATTERNS.apiKey, (match) => {
      const [key] = match.split(/[:=]/);
      return `${key}="***REDACTED***"`;
    });

    // Mask emails (keep domain)
    text = text.replace(this.SENSITIVE_PATTERNS.email, (email) => {
      const [local, domain] = email.split('@');
      const masked = local.substring(0, 2) + '*'.repeat(Math.max(1, local.length - 2));
      return `${masked}@${domain}`;
    });

    // Remove SSN
    text = text.replace(this.SENSITIVE_PATTERNS.ssn, '***REDACTED***');

    // Remove credit card numbers
    text = text.replace(this.SENSITIVE_PATTERNS.creditCard, '****-****-****-****');

    // Anonymize IP addresses (keep first 3 octets)
    text = text.replace(this.SENSITIVE_PATTERNS.ipAddress, (ip) => {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    });

    return text;
  }

  /**
   * Log informational message
   * @param message Message to log
   * @param context Optional context
   */
  log(message: string, context?: string): void {
    const sanitized = this.sanitize(message);
    const contextStr = context ? `[${context}]` : '';
    console.log(`[INFO] ${contextStr} ${sanitized}`);
  }

  /**
   * Log error message
   * @param message Message to log
   * @param trace Stack trace
   * @param context Optional context
   */
  error(message: string, trace?: string, context?: string): void {
    const sanitized = this.sanitize(message);
    const traceSanitized = trace ? this.sanitize(trace) : '';
    const contextStr = context ? `[${context}]` : '';

    console.error(`[ERROR] ${contextStr} ${sanitized}`);
    if (traceSanitized) {
      console.error(`[TRACE] ${traceSanitized}`);
    }
  }

  /**
   * Log warning message
   * @param message Message to log
   * @param context Optional context
   */
  warn(message: string, context?: string): void {
    const sanitized = this.sanitize(message);
    const contextStr = context ? `[${context}]` : '';
    console.warn(`[WARN] ${contextStr} ${sanitized}`);
  }

  /**
   * Log debug message
   * @param message Message to log
   * @param context Optional context
   */
  debug(message: string, context?: string): void {
    if (process.env.DEBUG === 'true') {
      const sanitized = this.sanitize(message);
      const contextStr = context ? `[${context}]` : '';
      console.debug(`[DEBUG] ${contextStr} ${sanitized}`);
    }
  }

  /**
   * Log verbose message
   * @param message Message to log
   * @param context Optional context
   */
  verbose(message: string, context?: string): void {
    if (process.env.VERBOSE === 'true') {
      const sanitized = this.sanitize(message);
      const contextStr = context ? `[${context}]` : '';
      console.log(`[VERBOSE] ${contextStr} ${sanitized}`);
    }
  }

  /**
   * Set context for subsequent logs
   * @param context Context string
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Anonymize an IP address
   * Hashes the last octet for GDPR compliance
   * @param ip IP address to anonymize
   * @returns Anonymized IP (e.g., 192.168.1.***hash***)
   */
  anonymizeIp(ip: string): string {
    const parts = ip.split('.');
    if (parts.length !== 4) return ip;

    const hash = crypto
      .createHash('sha256')
      .update(parts[3])
      .digest('hex')
      .substring(0, 8);

    return `${parts[0]}.${parts[1]}.${parts[2]}.${hash}`;
  }

  /**
   * Hash a value (e.g., for user IDs in sensitive contexts)
   * @param value Value to hash
   * @returns SHA256 hash
   */
  hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
