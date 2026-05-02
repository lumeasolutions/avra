import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server/auth-guard';

function resolveBackendUrl(req: NextRequest): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  if (/^https?:\/\//i.test(raw)) return raw;
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host');
  return `${proto}://${host}${raw}`;
}

/**
 * GET /api/signature - Fetch signature requests
 * Proxy to backend
 */
export async function GET(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = req.cookies.get('access_token')?.value;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const backendUrl = resolveBackendUrl(req);
    const url = projectId
      ? `${backendUrl}/signature?projectId=${projectId}`
      : `${backendUrl}/signature`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Backend request failed', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Signature API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/signature - Create a signature request with YouSign integration
 * Uploads PDF to YouSign and creates signing request
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const accessToken = req.cookies.get('access_token')?.value;
    const backendUrl = resolveBackendUrl(req);

    const response = await fetch(`${backendUrl}/signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Backend request failed', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Signature POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// NOTE: PUT /api/signature/:id/status et DELETE /api/signature/:id
// nécessitent des routes dynamiques Next.js :
//   app/api/signature/[id]/status/route.ts  → PUT
//   app/api/signature/[id]/route.ts         → DELETE
// Ces handlers ne peuvent pas être définis ici car cette route
// ne reçoit que les requêtes vers /api/signature (sans segment dynamique).
