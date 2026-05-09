import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Normalize a raw phone number to E.164 format.
 * Required by YouSign for OTP-SMS authentication mode.
 *
 * Examples:
 *   "06 12 34 56 78"     -> "+33612345678"
 *   "06.12.34.56.78"     -> "+33612345678"
 *   "+33 6 12 34 56 78"  -> "+33612345678"
 *   "0033612345678"      -> "+33612345678"
 */
export function normalizePhone(raw: string | undefined | null, defaultCountry = 'FR'): string | null {
  if (!raw) return null;
  // Strip everything except digits and leading +
  let cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  // 0033... -> +33...
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2);
  }
  // National FR number starting with 0 -> +33XXXXXXXXX
  if (defaultCountry === 'FR' && cleaned.startsWith('0') && cleaned.length === 10) {
    return '+33' + cleaned.slice(1);
  }
  // Fallback: assume already a national number, prepend country code
  if (defaultCountry === 'FR') {
    return '+33' + cleaned;
  }
  return '+' + cleaned;
}

export interface SignatureRequestResponse {
  id: string;
  status: string;
}

export interface DocumentResponse {
  id: string;
  signature_request_id?: string;
}

export interface SignerResponse {
  id: string;
  signature_link?: string;
}

export interface ActivatedRequestResponse {
  id: string;
  status: string;
  signers?: Array<{
    id: string;
    signature_link?: string;
  }>;
}

@Injectable()
export class YouSignService {
  private readonly logger = new Logger(YouSignService.name);
  private apiKey: string;
  private baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('YOUSIGN_API_KEY', '');
    this.baseUrl = this.configService.get<string>('YOUSIGN_BASE_URL', 'https://api-sandbox.yousign.app/v3');
  }

  isEnabled(): boolean {
    return !!this.apiKey;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...((options.headers as Record<string, string>) || {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`YouSign API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Create a signature request in YouSign
   */
  async createSignatureRequest(
    name: string,
    deliveryMode = 'email'
  ): Promise<SignatureRequestResponse> {
    return this.request<SignatureRequestResponse>('/signature_requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, delivery_mode: deliveryMode }),
    });
  }

  /**
   * Upload a document to a signature request
   */
  async uploadDocument(
    signatureRequestId: string,
    pdfBuffer: Buffer,
    fileName: string
  ): Promise<DocumentResponse> {
    const formData = new FormData();
    const arrayBuffer = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    formData.append('file', blob, fileName);
    formData.append('nature', 'signable_document');

    const url = `${this.baseUrl}/signature_requests/${signatureRequestId}/documents`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        // Do NOT set Content-Type — fetch sets it automatically with boundary for FormData
      },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`YouSign upload error ${res.status}: ${body}`);
    }
    return res.json() as Promise<DocumentResponse>;
  }

  /**
   * Add a signer to a signature request
   */
  async addSigner(
    signatureRequestId: string,
    documentId: string,
    signer: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    }
  ): Promise<SignerResponse> {
    // Determine auth mode (default to OTP SMS for eIDAS-advanced compliance).
    // YOUSIGN_AUTH_MODE=no_otp explicitly disables OTP for legacy/dev use.
    const authMode =
      this.configService.get<string>('YOUSIGN_AUTH_MODE') === 'no_otp'
        ? 'no_otp'
        : 'otp_sms';

    const normalizedPhone = normalizePhone(signer.phone);

    if (authMode === 'otp_sms' && !normalizedPhone) {
      // Do not silently fall back to a weaker auth level — surface the issue.
      throw new BadRequestException(
        'Téléphone requis pour signature OTP SMS (mode YOUSIGN_AUTH_MODE=otp_sms). ' +
          'Renseigner un numéro pour le signataire ou définir YOUSIGN_AUTH_MODE=no_otp.'
      );
    }

    return this.request<SignerResponse>(
      `/signature_requests/${signatureRequestId}/signers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          info: {
            first_name: signer.firstName,
            last_name: signer.lastName,
            email: signer.email,
            phone_number: normalizedPhone || undefined,
            locale: 'fr',
          },
          signature_level: 'electronic_signature',
          signature_authentication_mode: authMode,
          fields: [
            {
              document_id: documentId,
              type: 'signature',
              page: 1,
              x: 77,
              y: 624,
              width: 214,
              height: 55,
            },
          ],
        }),
      }
    );
  }

  /**
   * Activate a signature request (prepare for signing)
   */
  async activateRequest(signatureRequestId: string): Promise<ActivatedRequestResponse> {
    return this.request<ActivatedRequestResponse>(
      `/signature_requests/${signatureRequestId}/activate`,
      { method: 'POST' }
    );
  }

  /**
   * Get full details of a signature request
   */
  async getRequest(signatureRequestId: string): Promise<any> {
    return this.request<any>(`/signature_requests/${signatureRequestId}`);
  }
}
