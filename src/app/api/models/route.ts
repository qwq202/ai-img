import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-gemini-api-key')?.trim() || '';
    const apiUrl = request.headers.get('x-gemini-api-url')?.trim() || '';
    if (!apiKey || !apiUrl) {
      return NextResponse.json(
        { error: 'API configuration missing' },
        { status: 400 }
      );
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const endpoint = `${baseUrl}/v1beta/models`;

    const response = await fetch(endpoint, {
      headers: {
        'x-goog-api-key': apiKey
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to fetch models', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const models: string[] = Array.isArray(data.models)
      ? data.models
          .map((model: { name?: string; supportedGenerationMethods?: string[] }) => {
            const name = model?.name || '';
            return name.startsWith('models/') ? name.slice(7) : name;
          })
          .filter((name: string) => name.includes('gemini'))
      : [];

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error in models API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
