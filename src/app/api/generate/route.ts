import { NextRequest, NextResponse } from 'next/server';
import { taskStore } from '@/lib/task-store';

export const runtime = 'nodejs';
export const maxDuration = 300;

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
        throw new Error(`API error ${response.status}: ${errorText}`);
      }
      
      // 读取完整响应体
      const text = await response.text();
      console.log(`[Fetch] Successfully read ${text.length} bytes`);
      return text;
      
    } catch (error) {
      lastError = error as Error;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = 
        errorMessage.includes('terminated') ||
        errorMessage.includes('SocketError') ||
        errorMessage.includes('other side closed') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('AbortError');
      
      console.log(`[Fetch] Attempt ${attempt + 1} failed: ${errorMessage}`);
      
      if (isRetryable && attempt < maxRetries) {
        const delay = 2000 * (attempt + 1);
        console.log(`[Fetch] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
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
  aspectRatio: string,
  imageSize: string,
  useGoogleSearch: boolean,
  referenceImages: Array<{mimeType: string; data: string}>,
  apiKey: string,
  apiUrl: string,
  model: string
) {
  try {
    taskStore.updateTask(taskId, { status: 'processing' });

    if (!apiKey || !apiUrl) {
      taskStore.updateTask(taskId, {
        status: 'failed',
        error: 'API configuration missing'
      });
      return;
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const selectedModel = model || 'gemini-3-pro-image-preview';
    // 使用流式端点，避免代理超时
    const endpoint = `${baseUrl}/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse`;

    const parts: Array<{text?: string; inline_data?: {mime_type: string; data: string}}> = [
      { text: prompt }
    ];

    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      referenceImages.forEach((image: {mimeType: string; data: string}) => {
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: image.data
          }
        });
      });
    }

    const requestBody: {
      contents: Array<{parts: typeof parts}>;
      generationConfig: {
        responseModalities: string[];
        imageConfig: {
          aspectRatio: string;
          imageSize: string;
        };
      };
      tools?: Array<{google_search: Record<string, never>}>;
    } = {
      contents: [{
        parts
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio,
          imageSize
        }
      }
    };

    if (useGoogleSearch) {
      requestBody.tools = [{ google_search: {} }];
    }

    console.log(`[Task ${taskId}] Starting API request to ${endpoint}`);

    const responseText = await fetchAndReadWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[Task ${taskId}] Received SSE response, length: ${responseText.length}`);

    let generatedText = '';
    let generatedImage = '';
    let groundingMetadata = null;

    // SSE 格式: 每行以 "data: " 开头
    const lines = responseText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        
        try {
          const chunk = JSON.parse(jsonStr);
          
          if (chunk.candidates && chunk.candidates.length > 0) {
            const candidate = chunk.candidates[0];
            const parts_response = candidate.content?.parts || [];
            
            for (const part of parts_response) {
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
        } catch (parseError) {
          console.log(`[Task ${taskId}] Failed to parse SSE chunk:`, jsonStr.substring(0, 100));
        }
      }
    }

    console.log(`[Task ${taskId}] Parsed response - text length: ${generatedText.length}, has image: ${!!generatedImage}`);

    if (!generatedText && !generatedImage) {
      taskStore.updateTask(taskId, {
        status: 'failed',
        error: 'No content returned from API'
      });
      return;
    }

    taskStore.updateTask(taskId, {
      status: 'completed',
      result: {
        text: generatedText,
        image: generatedImage,
        groundingMetadata
      }
    });

  } catch (error) {
    console.error('Error processing task:', error);
    taskStore.updateTask(taskId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

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
    const { 
      prompt, 
      model = 'gemini-3-pro-image-preview',
      aspectRatio = '1:1',
      imageSize = '1K',
      useGoogleSearch = false,
      referenceImages = []
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      );
    }

    const taskId = taskStore.createTask({
      prompt,
      aspectRatio,
      imageSize,
      useGoogleSearch
    });

    // 启动异步任务，不等待完成
    processTask(taskId, prompt, aspectRatio, imageSize, useGoogleSearch, referenceImages, apiKey, apiUrl, model)
      .catch((err) => {
        console.error('Background task error:', err);
        taskStore.updateTask(taskId, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Background task failed'
        });
      });

    return NextResponse.json({
      success: true,
      taskId
    });

  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
