import { NextRequest, NextResponse } from 'next/server';
import { taskStore } from '@/lib/task-store';
import { fetchGeminiModels, type ModelCapabilities } from '@/lib/gemini-models';

export const runtime = 'nodejs';
export const maxDuration = 300;

type ReferenceImage = { mimeType: string; data: string };

class UpstreamApiError extends Error {
  status: number;
  rawBody: string;
  upstreamMessage?: string;
  upstreamCode?: string | number;

  constructor(status: number, rawBody: string, upstreamMessage?: string, upstreamCode?: string | number) {
    super(`API error ${status}: ${rawBody}`);
    this.name = 'UpstreamApiError';
    this.status = status;
    this.rawBody = rawBody;
    this.upstreamMessage = upstreamMessage;
    this.upstreamCode = upstreamCode;
  }
}

function jsonError(status: number, code: string, error: string, details?: unknown) {
  return NextResponse.json(
    { code, error, details },
    { status }
  );
}

function toFriendlyTaskError(error: unknown): string {
  if (error instanceof UpstreamApiError) {
    const upstreamMessage = (error.upstreamMessage || '').toLowerCase();

    if (upstreamMessage.includes('auth_unavailable') || upstreamMessage.includes('no auth available')) {
      return '上游鉴权服务暂不可用，请稍后重试';
    }
    if (error.status === 503 || upstreamMessage.includes('no capacity available')) {
      return '服务端暂时不可用，请稍后重试';
    }
    if (error.status === 504 || upstreamMessage.includes('timeout')) {
      return '服务端响应超时，请稍后重试';
    }
    if (error.status === 502) {
      return '服务连接异常，请稍后重试';
    }
    if (error.status === 429) {
      return '请求过于频繁，请稍后再试';
    }
    if (error.status === 401 || error.status === 403) {
      return '鉴权失败，请检查 API Key 是否有效';
    }
    if (error.status >= 500) {
      return '服务端发生错误，请稍后重试';
    }
    if (upstreamMessage.includes('provided image is not valid')) {
      return '上传图片无效，请更换图片后重试';
    }
    return error.upstreamMessage || '请求失败，请稍后重试';
  }

  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes('aborterror') || normalized.includes('timeout') || normalized.includes('timed out')) {
      return '请求超时，请稍后重试';
    }
    if (normalized.includes('econnreset') || normalized.includes('socketerror') || normalized.includes('failed to fetch')) {
      return '网络连接异常，请稍后重试';
    }
  }

  return '请求失败，请稍后重试';
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = 180000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchAndReadWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  timeout = 180000
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Fetch] Attempt ${attempt + 1}/${maxRetries + 1}`);

      const response = await fetchWithTimeout(url, options, timeout);

      if (!response.ok) {
        const errorText = await response.text();
        let upstreamMessage: string | undefined;
        let upstreamCode: string | number | undefined;

        try {
          const parsed = JSON.parse(errorText) as {
            error?: { message?: string; code?: string | number };
          };
          upstreamMessage = parsed.error?.message;
          upstreamCode = parsed.error?.code;
        } catch {
          // ignore parse error, keep raw response text
        }

        throw new UpstreamApiError(response.status, errorText, upstreamMessage, upstreamCode);
      }

      const text = await response.text();
      console.log(`[Fetch] Successfully read ${text.length} bytes`);
      return text;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryableStatus =
        error instanceof UpstreamApiError &&
        [429, 500, 502, 503, 504].includes(error.status);
      const isRetryableNetwork =
        errorMessage.includes('terminated') ||
        errorMessage.includes('SocketError') ||
        errorMessage.includes('other side closed') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('AbortError');
      const isRetryable = isRetryableStatus || isRetryableNetwork;

      console.log(`[Fetch] Attempt ${attempt + 1} failed: ${errorMessage}`);

      if (isRetryable && attempt < maxRetries) {
        const delay = 2000 * (attempt + 1);
        console.log(`[Fetch] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else if (!isRetryable) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

async function processTask(
  taskId: string,
  prompt: string,
  aspectRatio: string | undefined,
  imageSize: string,
  useGoogleSearch: boolean,
  referenceImages: ReferenceImage[],
  apiKey: string,
  apiUrl: string,
  model: string,
  capabilities: ModelCapabilities
) {
  try {
    taskStore.updateTask(taskId, { status: 'processing', phase: 'preparing' });

    if (!apiKey || !apiUrl) {
      taskStore.updateTask(taskId, {
        status: 'failed',
        error: 'API configuration missing'
      });
      return;
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const endpoint = `${baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse`;

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: prompt }
    ];

    if (referenceImages.length > 0) {
      referenceImages.forEach((image) => {
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: image.data
          }
        });
      });
    }

    const generationConfig: {
      responseModalities: string[];
      imageConfig?: { aspectRatio?: string; imageSize?: string };
    } = {
      responseModalities: ['TEXT', 'IMAGE'],
    };

    if (capabilities.supportsAspectRatio || capabilities.supportsImageSize || capabilities.forcedImageSize) {
      generationConfig.imageConfig = {};
      if (capabilities.supportsAspectRatio && aspectRatio) {
        generationConfig.imageConfig.aspectRatio = aspectRatio;
      }
      if (capabilities.forcedImageSize) {
        generationConfig.imageConfig.imageSize = capabilities.forcedImageSize;
      } else if (capabilities.supportsImageSize) {
        generationConfig.imageConfig.imageSize = imageSize;
      }
    }

    const requestBody: {
      contents: Array<{ parts: typeof parts }>;
      generationConfig: typeof generationConfig;
      tools?: Array<{ google_search: Record<string, never> }>;
    } = {
      contents: [{
        parts
      }],
      generationConfig
    };

    if (useGoogleSearch && capabilities.supportsSearchGrounding) {
      requestBody.tools = [{ google_search: {} }];
    }

    console.log(`[Task ${taskId}] Starting API request to ${endpoint}`);
    taskStore.updateTask(taskId, { phase: 'calling_model' });

    const responseText = await fetchAndReadWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[Task ${taskId}] Received SSE response, length: ${responseText.length}`);
    taskStore.updateTask(taskId, { phase: 'parsing_response' });

    let generatedText = '';
    let generatedImage = '';
    let groundingMetadata = null;

    const lines = responseText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const chunk = JSON.parse(jsonStr);

          if (chunk.candidates && chunk.candidates.length > 0) {
            const candidate = chunk.candidates[0];
            const partsResponse = candidate.content?.parts || [];

            for (const part of partsResponse) {
              if (part.text) {
                generatedText += part.text;
              }
              if (part.inlineData) {
                generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }
            }
          }

          if (chunk.groundingMetadata) {
            groundingMetadata = chunk.groundingMetadata;
          }
        } catch {
          console.log(`[Task ${taskId}] Failed to parse SSE chunk:`, jsonStr.substring(0, 100));
        }
      }
    }

    console.log(`[Task ${taskId}] Parsed response - text length: ${generatedText.length}, has image: ${!!generatedImage}`);

    if (!generatedText && !generatedImage) {
      taskStore.updateTask(taskId, {
        status: 'failed',
        phase: 'failed',
        error: 'No content returned from API'
      });
      return;
    }

    taskStore.updateTask(taskId, {
      status: 'completed',
      phase: 'completed',
      result: {
        text: generatedText,
        image: generatedImage,
        groundingMetadata
      }
    });
  } catch (error) {
    if (error instanceof UpstreamApiError) {
      console.warn(
        `[Task ${taskId}] Upstream error: status=${error.status}, code=${String(error.upstreamCode || '')}, message=${error.upstreamMessage || ''}`
      );
    } else {
      console.error('Error processing task:', error);
    }
    taskStore.updateTask(taskId, {
      status: 'failed',
      phase: 'failed',
      error: toFriendlyTaskError(error)
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-gemini-api-key')?.trim() || '';
    const apiUrl = request.headers.get('x-gemini-api-url')?.trim() || '';
    if (!apiKey || !apiUrl) {
      return jsonError(400, 'API_CONFIG_MISSING', 'API configuration missing');
    }

    const body = await request.json();
    const {
      prompt,
      model,
      aspectRatio,
      imageSize = '1K',
      useGoogleSearch = false,
      referenceImages = []
    } = body as {
      prompt?: string;
      model?: string;
      aspectRatio?: string;
      imageSize?: string;
      useGoogleSearch?: boolean;
      referenceImages?: Array<{ mimeType?: string; data?: string }>;
    };

    if (!prompt || typeof prompt !== 'string') {
      return jsonError(400, 'INVALID_INPUT', 'Prompt is required and must be a string');
    }
    if (!model || typeof model !== 'string') {
      return jsonError(400, 'INVALID_INPUT', 'Model is required');
    }

    const modelData = await fetchGeminiModels(apiKey, apiUrl);
    const targetModel = modelData.imageModels.find((item) => item.id === model);
    if (!targetModel) {
      return jsonError(400, 'MODEL_NOT_AVAILABLE', 'Selected model is not currently available from API');
    }
    if (!targetModel.capabilities.supportsGenerate) {
      return jsonError(400, 'MODEL_CAPABILITY_MISMATCH', 'Selected model only supports image editing');
    }

    const normalizedImages = (Array.isArray(referenceImages) ? referenceImages : [])
      .filter((img): img is { mimeType: string; data: string } => !!img?.mimeType && !!img?.data)
      .map((img) => ({ mimeType: img.mimeType, data: img.data }));

    if (normalizedImages.length > targetModel.capabilities.maxReferenceImages) {
      return jsonError(
        400,
        'MODEL_CAPABILITY_MISMATCH',
        `Selected model supports up to ${targetModel.capabilities.maxReferenceImages} reference images`
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

    const normalizedAspectRatio =
      typeof aspectRatio === 'string' && aspectRatio.trim() && aspectRatio !== 'auto'
        ? aspectRatio
        : undefined;

    const taskId = taskStore.createTask({
      prompt,
      aspectRatio: normalizedAspectRatio || 'auto',
      imageSize,
      useGoogleSearch
    });

    processTask(
      taskId,
      prompt,
      normalizedAspectRatio,
      imageSize,
      useGoogleSearch,
      normalizedImages,
      apiKey,
      apiUrl,
      targetModel.id,
      targetModel.capabilities
    ).catch((err) => {
      console.error('Background task error:', err);
      taskStore.updateTask(taskId, {
        status: 'failed',
        phase: 'failed',
        error: err instanceof Error ? err.message : 'Background task failed'
      });
    });

    return NextResponse.json({
      success: true,
      taskId
    });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    const details = (error as { details?: unknown })?.details;
    if (status) {
      return jsonError(status, 'MODEL_LIST_FETCH_FAILED', 'Failed to fetch models', details);
    }

    console.error('Error in generate API:', error);
    return jsonError(
      500,
      'INTERNAL_SERVER_ERROR',
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
