import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiModels } from '@/lib/gemini-models';

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

    const modelData = await fetchGeminiModels(apiKey, apiUrl);
    return NextResponse.json(modelData);
  } catch (error) {
    const status = (error as { status?: number })?.status;
    const details = (error as { details?: unknown })?.details;
    if (status) {
      return NextResponse.json(
        { error: 'Failed to fetch models', details },
        { status }
      );
    }

    console.error('Error in models API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
