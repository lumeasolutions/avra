import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server/auth-guard';

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

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

/**
 * PUT /api/signature/:id/status - Update signature status
 */
export async function PUT(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const signatureId = pathParts[3];

    if (!signatureId) {
      return NextResponse.json(
        { error: 'Missing signature ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const accessToken = req.cookies.get('access_token')?.value;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const response = await fetch(
      `${backendUrl}/signature/${signatureId}/status`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

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
    console.error('Signature PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/signature/:id - Delete a signature request
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const signatureId = pathParts[3];

    if (!signatureId) {
      return NextResponse.json(
        { error: 'Missing signature ID' },
        { status: 400 }
      );
    }

    const accessToken = req.cookies.get('access_token')?.value;
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const response = await fetch(`${backendUrl}/signature/${signatureId}`, {
      method: 'DELETE',
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
    console.error('Signature DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
