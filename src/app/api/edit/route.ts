import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiModels } from '@/lib/gemini-models';

export const runtime = 'nodejs';

function jsonError(status: number, code: string, error: string, details?: unknown) {
  return NextResponse.json(
    { code, error, details },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-gemini-api-key')?.trim() || '';
    const apiUrl = request.headers.get('x-gemini-api-url')?.trim() || '';
    if (!apiKey || !apiUrl) {
      return jsonError(400, 'API_CONFIG_MISSING', 'API configuration missing');
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
      return jsonError(400, 'INVALID_INPUT', 'Prompt is required and must be a string');
    }

    const normalizedImages = (Array.isArray(images) ? images : [])
      .filter((img): img is { mimeType: string; data: string } => !!img?.mimeType && !!img?.data)
      .map((img) => ({
        mimeType: img.mimeType,
        data: img.data
      }));

    if (normalizedImages.length === 0) {
      return jsonError(400, 'INVALID_INPUT', 'Images are required');
    }

    const modelData = await fetchGeminiModels(apiKey, apiUrl);
    const targetModel = modelData.imageModels.find((item) => item.id === model);
    if (!targetModel) {
      return jsonError(400, 'MODEL_NOT_AVAILABLE', 'Selected model is not currently available from API');
    }

    if (!targetModel.capabilities.supportsEdit) {
      return jsonError(400, 'MODEL_CAPABILITY_MISMATCH', 'Selected model does not support image editing');
    }

    if (normalizedImages.length > targetModel.capabilities.maxReferenceImages) {
      return jsonError(
        400,
        'MODEL_CAPABILITY_MISMATCH',
        `Selected model supports up to ${targetModel.capabilities.maxReferenceImages} input images`
      );
    }

    if (
      targetModel.capabilities.forcedImageSize &&
      imageSize &&
      imageSize !== targetModel.capabilities.forcedImageSize
    ) {
      return jsonError(
        400,
        'MODEL_CAPABILITY_MISMATCH',
        `Selected model only supports ${targetModel.capabilities.forcedImageSize} image size`
      );
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const endpoint = `${baseUrl}/v1beta/models/${targetModel.id}:generateContent`;

    const requestBody: {
      contents: Array<{ parts: Array<Record<string, unknown>> }>;
      generationConfig?: {
        responseModalities: string[];
        imageConfig?: { aspectRatio?: string; imageSize?: string };
      };
    } = {
      contents: [
        {
          parts: [
            { text: prompt },
            ...normalizedImages.map((img) => ({
              inline_data: {
                mime_type: img.mimeType,
                data: img.data
              }
            }))
          ]
        }
      ]
    };

    const imageConfig: { aspectRatio?: string; imageSize?: string } = {};
    if (
      targetModel.capabilities.supportsAspectRatio &&
      typeof aspectRatio === 'string' &&
      aspectRatio.trim() &&
      aspectRatio !== 'auto'
    ) {
      imageConfig.aspectRatio = aspectRatio;
    }
    if (targetModel.capabilities.forcedImageSize) {
      imageConfig.imageSize = targetModel.capabilities.forcedImageSize;
    } else if (targetModel.capabilities.supportsImageSize) {
      imageConfig.imageSize = imageSize || '1K';
    }
    if (Object.keys(imageConfig).length > 0) {
      requestBody.generationConfig = {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig
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
      return jsonError(response.status, 'UPSTREAM_API_ERROR', 'Failed to edit image', errorData);
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
      return jsonError(500, 'EMPTY_RESPONSE', 'No content returned from API');
    }

    return NextResponse.json({
      success: true,
      text: generatedText,
      image: generatedImage
    });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    const details = (error as { details?: unknown })?.details;
    if (status) {
      return jsonError(status, 'MODEL_LIST_FETCH_FAILED', 'Failed to fetch models', details);
    }

    console.error('Error in edit API:', error);
    return jsonError(
      500,
      'INTERNAL_SERVER_ERROR',
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
