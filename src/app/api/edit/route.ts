import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-gemini-api-key')?.trim() || '';
    const apiUrl = request.headers.get('x-gemini-api-url')?.trim() || '';
    if (!apiKey || !apiUrl) {
      return NextResponse.json(
        { error: 'API configuration missing' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { prompt, images, model, aspectRatio, imageSize } = body as {
      prompt?: string;
      images?: Array<{ mimeType?: string; data?: string }>;
      model?: string;
      aspectRatio?: string;
      imageSize?: string;
    };

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: 'Images are required' },
        { status: 400 }
      );
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const selectedModel =
      model === 'gemini-3-pro-image-preview' || model === 'gemini-2.5-flash-image'
        ? model
        : 'gemini-2.5-flash-image';
    const endpoint = `${baseUrl}/v1beta/models/${selectedModel}:generateContent`;

    const requestBody: {
      contents: Array<{ parts: Array<Record<string, unknown>> }>;
      generationConfig?: {
        responseModalities: string[];
        imageConfig: { aspectRatio: string; imageSize: string };
      };
    } = {
      contents: [
        {
          parts: [
            { text: prompt },
            ...images
              .filter((img) => img?.mimeType && img?.data)
              .map((img) => ({
                inline_data: {
                  mime_type: img.mimeType,
                  data: img.data
                }
              }))
          ]
        }
      ]
    };

    if (selectedModel === 'gemini-3-pro-image-preview') {
      requestBody.generationConfig = {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio || '1:1',
          imageSize: imageSize || '1K'
        }
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to edit image', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];

    let generatedText = '';
    let generatedImage = '';

    for (const part of parts) {
      if (part.text) {
        generatedText += part.text;
      }
      if (part.inlineData) {
        generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    if (!generatedText && !generatedImage) {
      return NextResponse.json(
        { error: 'No content returned from API' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      text: generatedText,
      image: generatedImage
    });

  } catch (error) {
    console.error('Error in edit API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
