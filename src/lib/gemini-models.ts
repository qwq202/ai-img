export interface ModelCapabilities {
  supportsGenerate: boolean;
  supportsEdit: boolean;
  supportsAspectRatio: boolean;
  supportsImageSize: boolean;
  forcedImageSize?: '1K' | '2K' | '4K';
  supportsSearchGrounding: boolean;
  maxReferenceImages: number;
}

export interface ImageModelOption {
  id: string;
  displayName: string;
  capabilities: ModelCapabilities;
}

interface GeminiModelRaw {
  name?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

export interface GeminiModelsResponse {
  models: string[];
  imageModels: ImageModelOption[];
  promptModels: string[];
  fetchedAt: string;
}

const MODELS_CACHE_TTL_MS = 30 * 1000;
const modelsCache = new Map<string, { value: GeminiModelsResponse; expiresAt: number }>();
const inflightModelsFetch = new Map<string, Promise<GeminiModelsResponse>>();

const DEFAULT_IMAGE_CAPABILITIES: ModelCapabilities = {
  supportsGenerate: true,
  supportsEdit: true,
  supportsAspectRatio: false,
  supportsImageSize: false,
  supportsSearchGrounding: false,
  maxReferenceImages: 3,
};

const IMAGE_KEYWORDS = ['image', 'image generation', 'nano banana', 'nano-banana'];

function isGeminiFamilyModel(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.includes('gemini') || normalized.includes('nano-banana') || normalized.includes('nanobanana');
}

function normalizeModelName(name?: string): string {
  const modelName = name || '';
  return modelName.startsWith('models/') ? modelName.slice(7) : modelName;
}

function supportsGenerateContent(model: GeminiModelRaw): boolean {
  const methods = model.supportedGenerationMethods;
  if (!methods || methods.length === 0) {
    // Some OpenAI-compatible Gemini gateways do not expose this field.
    // In that case we keep the model and rely on name/capability inference.
    return true;
  }
  return methods.includes('generateContent');
}

function isImageModel(model: GeminiModelRaw, normalizedName: string): boolean {
  const haystack = `${normalizedName} ${model.displayName || ''} ${model.description || ''}`.toLowerCase();
  return IMAGE_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function parseForcedImageSize(modelId: string): '1K' | '2K' | '4K' | undefined {
  const normalized = modelId.toLowerCase();
  if (normalized.includes('-4k')) return '4K';
  if (normalized.includes('-hd')) return '2K';
  if (normalized.includes('-2k')) return '2K';
  if (normalized.includes('-1k')) return '1K';
  return undefined;
}

function buildCapabilities(modelId: string): ModelCapabilities {
  const forcedImageSize = parseForcedImageSize(modelId);
  const normalized = modelId.toLowerCase();
  const isEditOnlyModel =
    normalized.endsWith('/edit') ||
    normalized.includes('-edit') ||
    normalized.includes('_edit');
  const isProImageFamily =
    normalized.includes('gemini-3-pro-image') ||
    normalized.includes('nano-banana-pro') ||
    normalized.includes('nano-banana-2');

  if (isEditOnlyModel) {
    return {
      supportsGenerate: false,
      supportsEdit: true,
      supportsAspectRatio: false,
      supportsImageSize: !!forcedImageSize,
      forcedImageSize,
      supportsSearchGrounding: false,
      maxReferenceImages: 3,
    };
  }

  if (isProImageFamily) {
    return {
      supportsGenerate: true,
      supportsEdit: true,
      supportsAspectRatio: true,
      supportsImageSize: true,
      forcedImageSize,
      supportsSearchGrounding: true,
      maxReferenceImages: 14,
    };
  }

  if (modelId === 'gemini-2.5-flash-image') {
    return {
      supportsGenerate: true,
      supportsEdit: true,
      supportsAspectRatio: true,
      supportsImageSize: false,
      forcedImageSize,
      supportsSearchGrounding: false,
      maxReferenceImages: 3,
    };
  }

  return { ...DEFAULT_IMAGE_CAPABILITIES, forcedImageSize };
}

export async function fetchGeminiModels(apiKey: string, apiUrl: string): Promise<GeminiModelsResponse> {
  const cacheKey = `${apiUrl.trim()}::${apiKey.trim()}`;
  const now = Date.now();
  const cached = modelsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const inFlight = inflightModelsFetch.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const fetchTask = (async (): Promise<GeminiModelsResponse> => {
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const endpoint = `${baseUrl}/v1beta/models`;
    const response = await fetch(endpoint, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      const error = new Error('Failed to fetch models');
      (error as Error & { details?: unknown; status?: number }).details = details;
      (error as Error & { details?: unknown; status?: number }).status = response.status;
      throw error;
    }

    const data = await response.json();
    const rawModels = Array.isArray(data.models) ? (data.models as GeminiModelRaw[]) : [];

    const normalizedGeminiModels = rawModels
      .map((raw) => {
        const normalizedName = normalizeModelName(raw.name);
        return { raw, normalizedName };
      })
      .filter(({ normalizedName, raw }) => isGeminiFamilyModel(normalizedName) && supportsGenerateContent(raw));

    const models = Array.from(new Set(normalizedGeminiModels.map(({ normalizedName }) => normalizedName))).sort();

    const imageModels = normalizedGeminiModels
      .filter(({ raw, normalizedName }) => isImageModel(raw, normalizedName))
      .map(({ raw, normalizedName }) => ({
        id: normalizedName,
        displayName: raw.displayName || normalizedName,
        capabilities: buildCapabilities(normalizedName),
      }));

    const uniqueImageModels = Array.from(
      new Map(imageModels.map((model) => [model.id, model])).values()
    ).sort((a, b) => a.id.localeCompare(b.id));

    const imageModelIdSet = new Set(uniqueImageModels.map((imageModel) => imageModel.id));
    const promptModels = models.filter((model) => !imageModelIdSet.has(model));

    const result = {
      models,
      imageModels: uniqueImageModels,
      promptModels,
      fetchedAt: new Date().toISOString(),
    };

    modelsCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + MODELS_CACHE_TTL_MS,
    });

    return result;
  })();

  inflightModelsFetch.set(cacheKey, fetchTask);
  try {
    return await fetchTask;
  } finally {
    inflightModelsFetch.delete(cacheKey);
  }
}
