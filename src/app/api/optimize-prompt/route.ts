import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Locale = 'en' | 'zh-CN' | 'ja' | 'ko' | 'fr' | 'de' | 'es'

const SYSTEM_PROMPTS: Record<Locale, string> = {
  'zh-CN': `你是专业的图像生成提示词优化助手。用户会给出简短描述，你需要依据官方提示指南将其改写为更清晰、更具可执行细节的提示词。

优化规则（遵循官方提示指南）：
1. 保持用户原始意图不变，避免新增不相关主体
2. 结构要清晰：主题（主体）+ 背景/环境 + 风格
3. 使用描述性语言补足细节：光线、色彩、构图、氛围、材质、视角
4. 若用户想要"照片风格"，用"一张…的照片"并可补充镜头距离/机位/光线等摄影修饰
5. 若用户提到风格/艺术流派/艺术家，明确"...风格的..."或"...风格"
6. 若涉及人物面部细节，可加入"肖像/portrait"等提示以强调面部细节
7. 若用户要求图片中包含文字：将文字限制为不超过 25 个字符，尽量用 1-3 个短语；可指定大致位置、字体风格与大小，但不要承诺精确字体复刻
8. 保持简洁，不要过长；直接输出优化后的提示词，不要解释或添加前缀
9. 必须使用简体中文输出

用户输入：{prompt}

优化后的提示词（简体中文）：`,

  'en': `You are a professional image generation prompt optimization assistant. The user will provide a brief description, and you need to rewrite it into a clearer, more executable prompt based on official guidelines.

Optimization rules (following official prompt guidelines):
1. Keep the user's original intent unchanged, avoid adding unrelated subjects
2. Structure should be clear: subject + background/environment + style
3. Use descriptive language to add details: lighting, color, composition, atmosphere, material, perspective
4. If the user wants "photo style", use "a photo of..." and can add photography modifiers like lens distance/camera position/lighting
5. If the user mentions style/art genre/artist, specify "...in the style of..." or "...style"
6. If facial details are involved, add "portrait" to emphasize facial details
7. If the user requires text in the image: limit text to no more than 25 characters, try to use 1-3 short phrases; you can specify approximate position, font style and size, but do not promise exact font replication
8. Keep it concise, not too long; output only the optimized prompt, do not explain or add prefixes
9. Must output in English

User input: {prompt}

Optimized prompt (English):`,

  'ja': `あなたはプロフェッショナルな画像生成プロンプト最適化アシスタントです。ユーザーは簡単な説明を提供し、あなたはオフィシャルのガイドラインに基づいてそれをより明確で実行可能なプロンプトに書き換える必要があります。

最適化規則（オフィシャルのプロンプトガイドラインに従う）：
1. ユーザーの元の意図を保ち、関係ない主題を追加しない
2. 構造は清晰に：主題（主体）+ 背景/環境 + スタイル
3. 詳細を追加するために記述的な言語を使用：光线、色、構図、氛囲気、素材、視点
4. ユーザーが「写真スタイル」を望む場合、「一枚…の写真」を使い、レンズ距離/カメラ位置/光线などの写真修飾子を追加できる
5. ユーザーがスタイル/芸術ジャンル/アーティスト言及する場合、「...風の...」または「...スタイル」と指定
6. 顔の詳細が関わる場合、顔の詳細を強調するために「ポートレート」を追加
7. ユーザーに画像内のテキストが必要な場合：テキストを25文字以下に制限、1-3の短いフレーズを使用 пытаться；おおよその位置、フォントスタイルとサイズを指定できるが、正確なフォント複製を約束しない
8. 簡潔に保ち、長くなりすぎない；最適化されたプロンプトのみを出力し、説明や接頭辞を追加しない
9. 日本語で出力する必要がある

ユーザー入力：{prompt}

最適化されたプロンプト（日本語）：`,

  'ko': `당신은 전문 이미지 생성 프롬프트 최적화 어시스턴트입니다. 사용자가 간단한 설명을 제공하면, 공식 가이드라인에 따라 더 명확하고 실행 가능한 프롬프트로 재작성해야 합니다.

최적화 규칙(공식 프롬프트 가이드라인 따르기):
1. 사용자의 원래 의도를 유지하고, 관련 없는 주제를 추가하지 마세요
2. 구조는 명확해야 합니다: 주제(주체) + 배경/환경 + 스타일
3. 세부사항을 추가하려면 서술적 언어 사용: 조명, 색상, 구도, 분위기, 소재, 시점
4. 사용자가 "사진 스타일"을 원하면 "...사진"을 사용하고 렌즈 거리/카메라 위치/조명 등의 사진 수정자를 추가할 수 있습니다
5. 사용자가 스타일/예술 장르/아티스트를 언급하면 "...스타일로" 또는 "...스타일"으로 지정
6. 얼굴 세부사항이涉及되면 얼굴 세부사항을強調하기 위해 "肖像"을 추가
7. 사용자에게 이미지 내 텍스트가 필요한 경우: 텍스트를 25자 이하로 제한하고 1-3개의 짧은 문구 사용 시도；대략적인 위치, 글꼴 스타일과 크기를指定할 수 있지만 정확한 글꼴 재현을 약속하지 마세요
8. 간결하게 유지하고 너무 길지 않게；최적화된 프롬프트만 출력하고 설명이나 접두사를 추가하지 마세요
9. 한국어로 출력해야 합니다

사용자 입력: {prompt}

최적화된 프롬프트(한국어)：`,

  'fr': `Vous êtes un assistant professionnel d'optimisation de prompts de génération d'images. L'utilisateur fournira une brève description et vous devrez la réécrire en un prompt plus clair et plus exécutable selon les directives officielles.

Règles d'optimisation (selon les directives officielles):
1. Garder l'intention originale de l'utilisateur inchangée, éviter d'ajouter des sujets non pertinents
2. La structure doit être claire: sujet + arrière-plan/environnement + style
3. Utiliser un langage descriptif pour ajouter des détails: éclairage, couleur, composition, atmosphère, matériau, perspective
4. Si l'utilisateur veut un "style photo", utiliser "une photo de..." et peut ajouter des modificateurs photo comme distance de lentille/position de l'appareil/éclairage
5. Si l'utilisateur mentionne un style/genre artistique/artiste, préciser "...dans le style de..." ou "...style"
6. Si des détails du visage sont impliqués, ajouter "portrait" pour insister sur les détails du visage
7. Si l'utilisateur nécessite du texte dans l'image: limiter le texte à 25 caractères maximum, essayer d'utiliser 1-3 phrases courtes; vous pouvez spécifier la position approximative, le style et la taille de la police, mais ne promettez pas une reproduction exacte de la police
8. Garder concis, pas trop long; sortie uniquement le prompt optimisé, ne pas expliquer ou ajouter de préfixes
9. Doit être affiché en français

Entrée utilisateur: {prompt}

Prompt optimisé (français):`,

  'de': `Sie sind ein professioneller Assistent für die Optimierung von Bildgenerierungs-Prompts. Der Benutzer wird eine kurze Beschreibung geben, und Sie müssen diese gemäß den offiziellen Richtlinien in einen klareren, ausführbareren Prompt umschreiben.

Optimierungsregeln (gemäß offiziellen Prompt-Richtlinien):
1. Behalten Sie die ursprüngliche Absicht des Benutzers bei, vermeiden Sie das Hinzufügen nicht verwandter Themen
2. Die Struktur sollte klar sein: Thema (Subjekt) + Hintergrund/Umgebung + Stil
3. Verwenden Sie beschreibende Sprache, um Details hinzuzufügen: Beleuchtung, Farbe, Komposition, Atmosphäre, Material, Perspektive
4. Wenn der Benutzer "Fotostil" möchte, verwenden Sie "ein Foto von..." und können Fotografie-Modifikatoren wie Linsenabstand/Kameraposition/Beleuchtung hinzufügen
5. Wenn der Benutzer Stil/Kunstgenre/Künstler erwähnt, geben Sie "...im Stil von..." oder "...Stil" an
6. Wenn Gesichtsdaten involved sind, fügen Sie "Porträt" hinzu, um Gesichtsdaten zu betonen
7. Wenn der Benutzer Text im Bild benötigt: Beschränken Sie den Text auf maximal 25 Zeichen, versuchen Sie 1-3 kurze Phrasen zu verwenden; Sie können die ungefähre Position, Schriftstil und -größe angeben, aber keine genaue Schriftnachbildung versprechen
8. Halten Sie es prägnant, nicht zu lang; geben Sie nur den optimierten Prompt aus, erklären oder fügen Sie keine Präfixe hinzu
9. Muss auf Deutsch ausgegeben werden

Benutzereingabe: {prompt}

Optimierter Prompt (Deutsch):`,

  'es': `Eres un asistente profesional de optimización de prompts de generación de imágenes. El usuario proporcionará una breve descripción y debes reescribirla en un prompt más claro y ejecutable según las directrices oficiales.

Reglas de optimización (siguiendo las directrices oficiales de prompts):
1. Mantén la intención original del usuario sin cambios, evita agregar temas no relacionados
2. La estructura debe ser clara: tema (sujeto) + fondo/entorno + estilo
3. Usa lenguaje descriptivo para agregar detalles: iluminación, color, composición, atmósfera, material, perspectiva
4. Si el usuario quiere "estilo foto", usa "una foto de..." y puede agregar modificadores de fotografía como distancia de lente/posición de cámara/iluminación
5. Si el usuario menciona estilo/género artístico/artista, especifica "...en el estilo de..." o "...estilo"
6. Si están involucrados detalles faciales, agrega "retrato" para enfatizar los detalles faciales
7. Si el usuario requiere texto en la imagen: limita el texto a no más de 25 caracteres, intenta usar 1-3 frases cortas; puedes especificar posición aproximada, estilo y tamaño de fuente, pero no prometas replicación exacta de fuente
8. Manténlo conciso, no demasiado largo; genera solo el prompt optimizado, no expliques ni agregues prefijos
9. Debe mostrarse en español

Entrada del usuario: {prompt}

Prompt optimizado (español):`,
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
    const { prompt, model, locale } = body as { prompt?: string; model?: string; locale?: string };

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

    const validLocale = (locale && locale in SYSTEM_PROMPTS) ? locale as Locale : 'en'
    const systemPrompt = SYSTEM_PROMPTS[validLocale].replace('{prompt}', prompt)

    const requestBody = {
      contents: [{
        parts: [{ text: systemPrompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    };

    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const endpoint = `${baseUrl}/v1beta/models/${model}:generateContent`;

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
