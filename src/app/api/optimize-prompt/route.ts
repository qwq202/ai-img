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
    const { prompt, model } = body as { prompt?: string; model?: string };

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    if (!model || typeof model !== 'string') {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      );
    }

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const endpoint = `${baseUrl}/v1beta/models/${model}:generateContent`;

    const systemPrompt = `你是专业的图像生成提示词优化助手。用户会给出简短描述，你需要依据官方提示指南将其改写为更清晰、更具可执行细节的提示词。

优化规则（遵循官方提示指南）：
1. 保持用户原始意图不变，避免新增不相关主体
2. 结构要清晰：主题（主体）+ 背景/环境 + 风格
3. 使用描述性语言补足细节：光线、色彩、构图、氛围、材质、视角
4. 若用户想要“照片风格”，用“一张…的照片”并可补充镜头距离/机位/光线等摄影修饰
5. 若用户提到风格/艺术流派/艺术家，明确“...风格的...”或“...风格”
6. 若涉及人物面部细节，可加入“肖像/portrait”等提示以强调面部细节
7. 若用户要求图片中包含文字：将文字限制为不超过 25 个字符，尽量用 1-3 个短语；可指定大致位置、字体风格与大小，但不要承诺精确字体复刻
8. 保持简洁，不要过长；直接输出优化后的提示词，不要解释或添加前缀
9. 必须使用简体中文输出

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
