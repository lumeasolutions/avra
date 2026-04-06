import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
            phone: signer.phone || undefined,
            locale: 'fr',
          },
          signature_level: 'electronic_signature',
          signature_authentication_mode: 'no_otp',
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
