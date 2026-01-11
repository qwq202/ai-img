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
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const endpoint = `${baseUrl}/v1beta/models/gemini-2.5-flash-lite:generateContent`;

    const systemPrompt = `你是一个专业的 AI 图像生成提示词优化专家。用户会给你一段简单的图像描述，你需要将其优化为更详细、更专业的提示词，以便 AI 图像生成模型能够生成更高质量的图像。

优化规则：
1. 保持用户原始意图不变
2. 添加更多细节描述（光线、色彩、构图、风格等）
3. 使用专业的艺术术语
4. 保持简洁，不要过于冗长
5. 直接输出优化后的提示词，不要有任何解释或前缀
6. 必须使用简体中文输出，无论用户输入什么语言

用户输入：${prompt}

优化后的提示词（简体中文）：`;

    const requestBody = {
      contents: [{
        parts: [{ text: systemPrompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    };

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
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to optimize prompt', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      return NextResponse.json(
        { error: 'No response from API' },
        { status: 500 }
      );
    }

    const optimizedPrompt = data.candidates[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({
      success: true,
      optimizedPrompt: optimizedPrompt.trim()
    });

  } catch (error) {
    console.error('Error in optimize-prompt API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
