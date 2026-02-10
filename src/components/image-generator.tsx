'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sparkles,
  Settings,
  ImageIcon,
  Wand2,
  Loader2,
  Upload,
  X,
  Download,
  Copy,
  History,
  Trash2,
  Undo2,
  RotateCcw,
  Home,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Maximize2,
  Menu,
  CheckCircle2
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { idbGet, idbSet } from '@/lib/indexeddb'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface ReferenceImage {
  id: string
  file: File
  preview: string
  base64?: string
  mimeType: string
}

interface ModelCapabilities {
  supportsGenerate: boolean
  supportsEdit: boolean
  supportsAspectRatio: boolean
  supportsImageSize: boolean
  forcedImageSize?: '1K' | '2K' | '4K'
  supportsSearchGrounding: boolean
  maxReferenceImages: number
}

interface ImageModelOption {
  id: string
  displayName: string
  capabilities: ModelCapabilities
}

interface ModelsCachePayload {
  imageModels: ImageModelOption[]
  promptModels: string[]
}

interface DebugLogEntry {
  ts: string
  event: string
  data?: unknown
}

interface HistoryItem {
  id: string
  image: string
  text?: string
  prompt: string
  mode: 'generate' | 'edit'
  model: string
  createdAt: number
}

interface ApiErrorLike {
  code?: string
  error?: string
  message?: string
  details?: {
    error?: {
      message?: string
      code?: string | number
    }
  }
}

type WorkspacePage = 'studio' | 'history' | 'trash'
type WorkMode = 'generate' | 'edit'

interface ImageGeneratorProps {
  initialPage?: WorkspacePage
}

const DEFAULT_IMAGE_CAPABILITIES: ModelCapabilities = {
  supportsGenerate: true,
  supportsEdit: true,
  supportsAspectRatio: false,
  supportsImageSize: false,
  supportsSearchGrounding: false,
  maxReferenceImages: 3,
}

const ASPECT_RATIOS = ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
const HISTORY_KEY = 'gemini_image_history_v1'
const TRASH_KEY = 'gemini_image_trash_v1'
const HISTORY_LIMIT_KEY = 'gemini_image_history_limit'
const AUTO_SAVE_HISTORY_KEY = 'gemini_auto_save_history'
const GENERATE_COUNT_KEY = 'gemini_generate_count'
const GENERATE_MODEL_KEY = 'gemini_generate_model'
const EDIT_MODEL_KEY = 'gemini_edit_model'
const ASPECT_RATIO_KEY = 'gemini_aspect_ratio'
const GOOGLE_SEARCH_KEY = 'gemini_use_google_search'

export default function ImageGenerator({ initialPage = 'studio' }: ImageGeneratorProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [prefsHydrated, setPrefsHydrated] = useState(false)
  const [mode, setMode] = useState<WorkMode>('generate')

  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('等待任务...')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedText, setGeneratedText] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const [aspectRatio, setAspectRatio] = useState('auto')
  const [imageSize, setImageSize] = useState('1K')
  const [useGoogleSearch, setUseGoogleSearch] = useState(false)
  const [autoSaveToHistory, setAutoSaveToHistory] = useState(true)
  const [generateCount, setGenerateCount] = useState(1)

  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [editImages, setEditImages] = useState<ReferenceImage[]>([])
  const [isReferenceDragActive, setIsReferenceDragActive] = useState(false)
  const [isEditDragActive, setIsEditDragActive] = useState(false)
  const [batchResults, setBatchResults] = useState<string[]>([])

  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('https://generativelanguage.googleapis.com')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [modelsLoading, setModelsLoading] = useState(false)
  const [connectionTesting, setConnectionTesting] = useState(false)

  const [generateModel, setGenerateModel] = useState('')
  const [editModel, setEditModel] = useState('')
  const [optimizeModel, setOptimizeModel] = useState('')
  const [imageModels, setImageModels] = useState<ImageModelOption[]>([])
  const [promptModels, setPromptModels] = useState<string[]>([])

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [trashItems, setTrashItems] = useState<HistoryItem[]>([])
  const [historyLimit, setHistoryLimit] = useState(30)

  const [debugEnabled, setDebugEnabled] = useState(false)
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [imageLoading, setImageLoading] = useState(true)

  useEffect(() => {
    if (generatedImage) {
      setImageLoading(true)
    }
  }, [generatedImage])

  // Ctrl/Cmd + Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (mode === 'generate' && prompt.trim() && generateModel && !loading) {
          handleGenerate()
        } else if (mode === 'edit' && prompt.trim() && editModel && editImages.length > 0 && !loading) {
          handleEdit()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, prompt, generateModel, editModel, editImages, loading])


  const taskStatusSnapshotRef = useRef('')

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [notice])

  const workspacePage: WorkspacePage = useMemo(() => {
    if (pathname === '/history') return 'history'
    if (pathname === '/trash') return 'trash'
    return initialPage
  }, [initialPage, pathname])

  const generateModels = useMemo(
    () => imageModels.filter((model) => model.capabilities.supportsGenerate),
    [imageModels]
  )
  const editModels = useMemo(
    () => imageModels.filter((model) => model.capabilities.supportsEdit),
    [imageModels]
  )

  const selectedGenerateCapabilities = useMemo(
    () => imageModels.find((model) => model.id === generateModel)?.capabilities || DEFAULT_IMAGE_CAPABILITIES,
    [imageModels, generateModel]
  )
  const selectedEditCapabilities = useMemo(
    () => imageModels.find((model) => model.id === editModel)?.capabilities || DEFAULT_IMAGE_CAPABILITIES,
    [imageModels, editModel]
  )
  const activeCapabilities = mode === 'generate' ? selectedGenerateCapabilities : selectedEditCapabilities

  const generateMaxReferenceImages = selectedGenerateCapabilities.maxReferenceImages
  const editMaxReferenceImages = selectedEditCapabilities.maxReferenceImages

  const addDebugLog = (event: string, data?: unknown) => {
    if (!debugEnabled) return
    setDebugLogs((prev) => [...prev.slice(-299), { ts: new Date().toISOString(), event, data }])
  }

  const friendlyMessageFromUnknown = (error: unknown, fallback = '请求失败，请稍后重试') => {
    const raw = error instanceof Error ? error.message : ''
    const normalized = raw.toLowerCase()

    if (normalized.includes('auth_unavailable') || normalized.includes('no auth available')) {
      return '上游鉴权服务暂不可用，请稍后重试'
    }
    if (normalized.includes('system memory overloaded')) {
      return '服务端暂时不可用，请稍后重试'
    }
    if (normalized.includes('timeout') || normalized.includes('timed out') || normalized.includes('aborterror')) {
      return '请求超时，请稍后重试'
    }
    if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
      return '网络连接异常，请检查网络后重试'
    }
    if (normalized.includes('provided image is not valid')) {
      return '上传图片无效，请更换图片后重试'
    }
    return raw || fallback
  }

  const friendlyMessageFromResponse = (
    status: number,
    payload: ApiErrorLike | undefined,
    fallback = '请求失败，请稍后重试'
  ) => {
    const code = payload?.code || payload?.details?.error?.code
    const upstreamMessage = payload?.details?.error?.message || payload?.message || payload?.error || ''
    const normalizedUpstream = String(upstreamMessage).toLowerCase()

    if (normalizedUpstream.includes('auth_unavailable') || normalizedUpstream.includes('no auth available')) {
      return '上游鉴权服务暂不可用，请稍后重试'
    }
    if (status === 503) return '服务端暂时不可用，请稍后重试'
    if (status === 504) return '服务端响应超时，请稍后重试'
    if (status === 502) return '服务连接异常，请稍后重试'
    if (status === 500) return '服务端发生错误，请稍后重试'
    if (status === 429) return '请求过于频繁，请稍后再试'
    if (status === 401 || status === 403) return '鉴权失败，请检查 API Key 是否正确'
    if (status === 404) return '请求的模型或接口不存在，请刷新模型列表后重试'

    if (code === 'MODEL_NOT_AVAILABLE') return '当前模型不可用，请刷新模型列表后重试'
    if (code === 'MODEL_CAPABILITY_MISMATCH') return '当前模型不支持所选参数或输入图片'
    if (code === 'API_CONFIG_MISSING') return 'API 配置缺失，请在设置中检查 Key 和 URL'
    if (code === 'INVALID_INPUT') return '请求参数无效，请检查提示词和图片'

    if (normalizedUpstream.includes('system memory overloaded')) {
      return '服务端暂时不可用，请稍后重试'
    }
    if (normalizedUpstream.includes('provided image is not valid')) {
      return '上传图片无效，请更换图片后重试'
    }

    return upstreamMessage || fallback
  }

  const getModelsCacheKey = (rawUrl: string) => `gemini_models_cache_${encodeURIComponent(rawUrl.trim().toLowerCase())}`

  const modelCapabilityTags = (cap: ModelCapabilities) => {
    const tags = [`Max ${cap.maxReferenceImages}`]
    if (!cap.supportsGenerate && cap.supportsEdit) tags.push('Edit Only')
    if (cap.forcedImageSize) tags.push(cap.forcedImageSize)
    if (cap.supportsAspectRatio) tags.push('AR')
    if (cap.supportsImageSize) tags.push('Res')
    if (cap.supportsSearchGrounding) tags.push('Search')
    return tags
  }

  const mapTaskPhaseToMessage = (phase?: string) => {
    if (phase === 'queued') return '排队中...'
    if (phase === 'preparing') return '准备中...'
    if (phase === 'calling_model') return '处理中...'
    if (phase === 'parsing_response') return '解析中...'
    return mode === 'generate' ? '生成中...' : '修改中...'
  }

  const persistHistory = (next: HistoryItem[]) => {
    setHistoryItems(next.slice(0, historyLimit))
  }

  const saveGeneratedImageToHistory = (params: {
    image: string
    text?: string
    prompt: string
    mode: WorkMode
    model: string
  }) => {
    const entry: HistoryItem = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      image: params.image,
      text: params.text,
      prompt: params.prompt,
      mode: params.mode,
      model: params.model,
      createdAt: Date.now(),
    }

    setHistoryItems((prev) => [entry, ...prev].slice(0, historyLimit))
    addDebugLog('history_saved', { mode: params.mode, model: params.model })
  }

  const moveHistoryItemToTrash = (id: string) => {
    const target = historyItems.find((item) => item.id === id)
    if (!target) return
    setHistoryItems((prev) => prev.filter((item) => item.id !== id))
    setTrashItems((prev) => [target, ...prev].slice(0, 300))
    setNotice('已移入回收站')
  }

  const restoreTrashItem = (id: string) => {
    const target = trashItems.find((item) => item.id === id)
    if (!target) return
    setTrashItems((prev) => prev.filter((item) => item.id !== id))
    persistHistory([target, ...historyItems])
    setNotice('已恢复')
  }

  const deleteTrashItemPermanently = (id: string) => {
    setTrashItems((prev) => prev.filter((item) => item.id !== id))
    setNotice('已永久删除')
  }

  const clearTrash = () => {
    setTrashItems([])
    setNotice('回收站已清空')
  }

  const buildApiHeaders = (includeContentType = false) => {
    if (!apiKey.trim() || !apiUrl.trim()) return null
    const headers: Record<string, string> = {
      'x-gemini-api-key': apiKey.trim(),
      'x-gemini-api-url': apiUrl.trim(),
    }
    if (includeContentType) headers['Content-Type'] = 'application/json'
    return headers
  }

  const restoreModelsFromCache = (rawUrl: string) => {
    if (!rawUrl.trim()) return
    try {
      const raw = localStorage.getItem(getModelsCacheKey(rawUrl))
      if (!raw) return
      const parsed = JSON.parse(raw) as ModelsCachePayload
      if (!Array.isArray(parsed?.imageModels) || !Array.isArray(parsed?.promptModels)) return

      setImageModels(
        parsed.imageModels
          .map((model) => ({
            id: model.id || '',
            displayName: model.displayName || model.id || '',
            capabilities: {
              ...DEFAULT_IMAGE_CAPABILITIES,
              ...(model.capabilities || {}),
            },
          }))
          .filter((model) => !!model.id)
      )
      setPromptModels(parsed.promptModels.filter((item) => typeof item === 'string' && !!item))
    } catch {
      // ignore broken cache
    }
  }

  const loadModels = async ({ silent = false }: { silent?: boolean } = {}) => {
    const headers = buildApiHeaders()
    if (!headers) return

    if (!silent) setModelsLoading(true)
    addDebugLog('models_fetch_start', { silent })

    try {
      const response = await fetch('/api/models', { headers })
      const data = (await response.json()) as ApiErrorLike

      if (!response.ok) {
        addDebugLog('models_fetch_failed', { status: response.status, error: data?.error })
        throw new Error(friendlyMessageFromResponse(response.status, data, '模型加载失败，请稍后重试'))
      }

      const nextImageModels = Array.isArray(data.imageModels)
        ? data.imageModels
            .map((model: Partial<ImageModelOption> & { id?: string }) => ({
              id: model.id || '',
              displayName: model.displayName || model.id || '',
              capabilities: {
                ...DEFAULT_IMAGE_CAPABILITIES,
                ...(model.capabilities || {}),
              },
            }))
            .filter((model: ImageModelOption) => !!model.id)
        : []

      const nextPromptModels = Array.isArray(data.promptModels)
        ? data.promptModels.filter((item: unknown) => typeof item === 'string' && !!item)
        : []

      setImageModels(nextImageModels)
      setPromptModels(nextPromptModels)

      if (apiUrl.trim()) {
        const payload: ModelsCachePayload = {
          imageModels: nextImageModels,
          promptModels: nextPromptModels,
        }
        localStorage.setItem(getModelsCacheKey(apiUrl), JSON.stringify(payload))
      }

      addDebugLog('models_fetch_success', {
        imageModelCount: nextImageModels.length,
        promptModelCount: nextPromptModels.length,
        silent,
      })
    } catch (err) {
      if (!silent) {
        setImageModels([])
        setPromptModels([])
        setError(friendlyMessageFromUnknown(err, '模型加载失败，请稍后重试'))
      }
    } finally {
      if (!silent) setModelsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    const trimmedKey = apiKey.trim()
    const trimmedUrl = apiUrl.trim()

    if (!trimmedKey || !trimmedUrl) {
      setError('请填写 Key 和 URL')
      return
    }

    try {
      new URL(trimmedUrl)
    } catch {
      setError('URL 无效')
      return
    }

    setConnectionTesting(true)
    setNotice('测试连接中...')
    setError('')
    addDebugLog('connection_test_start')

    try {
      const response = await fetch('/api/models', {
        headers: {
          'x-gemini-api-key': trimmedKey,
          'x-gemini-api-url': trimmedUrl,
        },
      })
      const data = (await response.json().catch(() => ({}))) as ApiErrorLike

      if (!response.ok) {
        const message = friendlyMessageFromResponse(response.status, data, '连接失败，请稍后重试')
        setError(`连接失败：${message}`)
        addDebugLog('connection_test_failed', { status: response.status, message })
        return
      }

      const imageCount = Array.isArray(data.imageModels) ? data.imageModels.length : 0
      const promptCount = Array.isArray(data.promptModels) ? data.promptModels.length : 0
      setNotice(`连接成功：图像模型 ${imageCount} 个，提示词模型 ${promptCount} 个`)
      setError('')
      addDebugLog('connection_test_success', { imageCount, promptCount })
      await loadModels({ silent: true })
    } catch (err) {
      setError(`连接失败：${friendlyMessageFromUnknown(err, '请检查网络或 API 配置')}`)
      addDebugLog('connection_test_failed', { reason: 'network_or_unknown' })
    } finally {
      setConnectionTesting(false)
    }
  }

  const handleSaveSettings = () => {
    const trimmedKey = apiKey.trim()
    const trimmedUrl = apiUrl.trim()

    if (!trimmedKey || !trimmedUrl) {
      setError('请填写 API Key 和 API URL')
      return
    }

    try {
      new URL(trimmedUrl)
    } catch {
      setError('API URL 无效')
      return
    }

    localStorage.setItem('gemini_api_key', trimmedKey)
    localStorage.setItem('gemini_api_url', trimmedUrl)
    localStorage.setItem('gemini_optimize_model', optimizeModel)
    localStorage.setItem(HISTORY_LIMIT_KEY, String(historyLimit))

    setError('')
    setNotice('设置已保存')
    setSettingsOpen(false)
    loadModels({ silent: true })
  }

  const handleCopyImage = async () => {
    if (!generatedImage) return
    try {
      const response = await fetch(generatedImage)
      const blob = await response.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setNotice('已复制')
    } catch {
      setError('复制失败')
    }
  }

  const handleDownload = () => {
    if (!generatedImage) return
    const link = document.createElement('a')
    link.href = generatedImage
    link.download = `gemini-img-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toRefImage = async (file: File): Promise<ReferenceImage> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const preview = String(e.target?.result || '')
        resolve(preview.split(',')[1] || '')
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    return {
      id: Math.random().toString(36).slice(2, 11),
      file,
      preview: URL.createObjectURL(file),
      base64,
      mimeType: file.type,
    }
  }

  const addImages = async (files: File[], target: WorkMode) => {
    const isGenerate = target === 'generate'
    const max = isGenerate ? generateMaxReferenceImages : editMaxReferenceImages
    const current = isGenerate ? referenceImages.length : editImages.length
    const remaining = max - current

    if (remaining <= 0) {
      setError(`上限 ${max} 张`)
      return
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/')).slice(0, remaining)
    if (imageFiles.length === 0) {
      setError('请选择图片')
      return
    }

    const parsed = await Promise.all(imageFiles.map((file) => toRefImage(file)))

    if (isGenerate) {
      setReferenceImages((prev) => [...prev, ...parsed])
    } else {
      setEditImages((prev) => [...prev, ...parsed])
    }

    setNotice(`已添加 ${parsed.length} 张`)
    setError('')
  }

  const removeImage = (target: WorkMode, id: string) => {
    if (target === 'generate') {
      setReferenceImages((prev) => prev.filter((item) => item.id !== id))
      return
    }
    setEditImages((prev) => prev.filter((item) => item.id !== id))
  }

  const pollTaskStatus = async (taskId: string) => {
    const maxAttempts = 120
    const pollInterval = 2000
    let attempts = 0

    return new Promise<{ image?: string; text?: string }>((resolve, reject) => {
      const poll = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          reject(new Error('任务超时，请稍后重试'))
          return
        }
        attempts++

        try {
          const response = await fetch(`/api/task/${taskId}`)
          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || '查询失败')
          }

          const { task } = data
          setLoadingMessage(mapTaskPhaseToMessage(task?.phase))

          const snapshot = `${task?.status || ''}:${task?.phase || ''}`
          if (snapshot !== taskStatusSnapshotRef.current) {
            taskStatusSnapshotRef.current = snapshot
            addDebugLog('task_status_update', { taskId, status: task?.status, phase: task?.phase })
          }

          if (task.status === 'completed') {
            resolve({
              image: task.result?.image,
              text: task.result?.text,
            })
            return
          }

          if (task.status === 'failed') {
            throw new Error(friendlyMessageFromUnknown(task.error, '任务处理失败，请稍后重试'))
          }

          if (task.status === 'pending' || task.status === 'processing') {
            setTimeout(() => {
              void poll()
            }, pollInterval)
          }
        } catch (err) {
          addDebugLog('task_status_failed', { taskId, reason: err instanceof Error ? err.message : 'unknown' })
          reject(err instanceof Error ? err : new Error('查询任务状态失败，请稍后重试'))
        }
      }

      void poll()
    })
  }

  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) {
      setError('请输入提示词')
      return
    }
    if (!optimizeModel) {
      setError('无可用优化模型')
      return
    }

    setOptimizing(true)
    setError('')

    try {
      addDebugLog('optimize_start', { model: optimizeModel, promptLength: prompt.length })

      const headers = buildApiHeaders(true)
      if (!headers) {
        setError('请配置 API')
        return
      }

      const response = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, model: optimizeModel }),
      })

      const data = (await response.json()) as ApiErrorLike & { optimizedPrompt?: string }
      if (!response.ok) {
        addDebugLog('optimize_failed', { status: response.status, code: data?.code, error: data?.error })
        throw new Error(friendlyMessageFromResponse(response.status, data, '提示词优化失败，请稍后重试'))
      }

      if (data.optimizedPrompt) {
        setPrompt(data.optimizedPrompt)
        addDebugLog('optimize_success', { outputLength: data.optimizedPrompt.length })
      }
    } catch (err) {
      addDebugLog('optimize_failed', { reason: err instanceof Error ? err.message : 'unknown' })
      setError(friendlyMessageFromUnknown(err, '提示词优化失败，请稍后重试'))
    } finally {
      setOptimizing(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入提示词')
      return
    }
    if (!generateModel) {
      setError('无可用模型')
      return
    }

    setLoading(true)
    setLoadingMessage('排队中...')
    setGeneratedImage(null)
    setGeneratedText('')
    setBatchResults([])
    setError('')
    setNotice('')

    try {
      const headers = buildApiHeaders(true)
      if (!headers) {
        setError('请配置 API')
        setLoading(false)
        return
      }

      const requestBody: {
        prompt: string
        model: string
        referenceImages: Array<{ mimeType: string; data?: string }>
        aspectRatio?: string
        imageSize?: string
        useGoogleSearch?: boolean
      } = {
        prompt,
        model: generateModel,
        referenceImages: referenceImages.map((img) => ({ mimeType: img.mimeType, data: img.base64 })),
      }

      if (selectedGenerateCapabilities.supportsAspectRatio && aspectRatio !== 'auto') {
        requestBody.aspectRatio = aspectRatio
      }
      if (selectedGenerateCapabilities.supportsImageSize || selectedGenerateCapabilities.forcedImageSize) {
        requestBody.imageSize = selectedGenerateCapabilities.forcedImageSize || imageSize
      }
      if (selectedGenerateCapabilities.supportsSearchGrounding) requestBody.useGoogleSearch = useGoogleSearch

      const runCount = Math.max(1, Math.min(8, Math.floor(generateCount)))
      const taskIds: string[] = []

      for (let i = 0; i < runCount; i++) {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        })

        const data = (await response.json()) as ApiErrorLike & { taskId?: string }
        addDebugLog('generate_submit', { model: generateModel, status: response.status, code: data?.code, index: i + 1 })

        if (!response.ok) {
          throw new Error(friendlyMessageFromResponse(response.status, data, '创建任务失败，请稍后重试'))
        }
        if (!data.taskId) {
          throw new Error('无任务ID')
        }
        taskIds.push(data.taskId)
      }

      let completedCount = 0
      const results = await Promise.all(
        taskIds.map(async (taskId) => {
          const result = await pollTaskStatus(taskId)
          completedCount += 1
          setLoadingMessage(`生成中 (${completedCount}/${taskIds.length})...`)
          return result
        })
      )

      const images = results
        .map((item) => item.image)
        .filter((item): item is string => typeof item === 'string' && item.length > 0)

      if (images.length === 0) {
        throw new Error('未返回可用图片')
      }

      setGeneratedImage(images[0])
      setBatchResults(images)
      setGeneratedText(results.find((item) => item.text)?.text || '')

      if (autoSaveToHistory) {
        images.forEach((image, index) => {
          saveGeneratedImageToHistory({
            image,
            text: results[index]?.text,
            prompt,
            mode: 'generate',
            model: generateModel,
          })
        })
      }

      setNotice(
        autoSaveToHistory
          ? `已生成 ${images.length} 张图片，并保存到历史`
          : `已生成 ${images.length} 张图片（未自动保存）`
      )
    } catch (err) {
      addDebugLog('generate_failed', { reason: err instanceof Error ? err.message : 'unknown' })
      setError(friendlyMessageFromUnknown(err, '生成失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!prompt.trim()) {
      setError('请输入要求')
      return
    }
    if (!editModel) {
      setError('无可用模型')
      return
    }
    if (editImages.length === 0) {
      setError('请上传图片')
      return
    }

    setLoading(true)
    setLoadingMessage('排队中...')
    setGeneratedImage(null)
    setGeneratedText('')
    setBatchResults([])
    setError('')
    setNotice('')

    try {
      const headers = buildApiHeaders(true)
      if (!headers) {
        setError('请配置 API')
        setLoading(false)
        return
      }

      const requestBody: {
        prompt: string
        images: Array<{ mimeType: string; data: string }>
        model: string
        aspectRatio?: string
        imageSize?: string
      } = {
        prompt,
        images: editImages.map((img) => ({ mimeType: img.mimeType, data: img.base64 || '' })),
        model: editModel,
      }

      if (selectedEditCapabilities.supportsAspectRatio && aspectRatio !== 'auto') {
        requestBody.aspectRatio = aspectRatio
      }
      if (selectedEditCapabilities.supportsImageSize || selectedEditCapabilities.forcedImageSize) {
        requestBody.imageSize = selectedEditCapabilities.forcedImageSize || imageSize
      }

      const response = await fetch('/api/edit', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      const data = (await response.json()) as ApiErrorLike & { image?: string; text?: string }
      addDebugLog('edit_submit', { model: editModel, status: response.status, code: data?.code })

      if (!response.ok) {
        throw new Error(friendlyMessageFromResponse(response.status, data, '图片修改失败，请稍后重试'))
      }

      if (data.image) {
        setGeneratedImage(data.image)
        saveGeneratedImageToHistory({
          image: data.image,
          text: data.text,
          prompt,
          mode: 'edit',
          model: editModel,
        })
      }
      if (data.text) setGeneratedText(data.text)

      addDebugLog('edit_success', {
        hasImage: !!data.image,
        textLength: typeof data.text === 'string' ? data.text.length : 0,
      })
    } catch (err) {
      addDebugLog('edit_failed', { reason: err instanceof Error ? err.message : 'unknown' })
      setError(friendlyMessageFromUnknown(err, '图片修改失败，请稍后重试'))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPrompt('')
    setGeneratedImage(null)
    setGeneratedText('')
    setError('')
    setNotice('')
    setLoadingMessage('等待任务...')
    setAspectRatio('auto')
    setImageSize('1K')
    setUseGoogleSearch(false)
    setReferenceImages([])
    setEditImages([])
    setBatchResults([])
  }

  const handleClearCreativeParams = () => {
    setGenerateModel('')
    setEditModel('')
    setAspectRatio('auto')
    setUseGoogleSearch(false)
    setAutoSaveToHistory(true)
    setGenerateCount(1)

    localStorage.removeItem(GENERATE_MODEL_KEY)
    localStorage.removeItem(EDIT_MODEL_KEY)
    localStorage.removeItem(ASPECT_RATIO_KEY)
    localStorage.removeItem(GOOGLE_SEARCH_KEY)
    localStorage.removeItem(AUTO_SAVE_HISTORY_KEY)
    localStorage.removeItem(GENERATE_COUNT_KEY)

    setError('')
    setNotice('创作参数已清空并恢复默认值')
  }

  const handleCopyDebugReport = async () => {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        apiUrl,
        workspacePage,
        mode,
        selectedModels: { generateModel, editModel, optimizeModel },
        modelCounts: { imageModels: imageModels.length, promptModels: promptModels.length },
        runtime: {
          loading,
          loadingMessage,
          error,
          notice,
          referenceImages: referenceImages.length,
          editImages: editImages.length,
          historyItems: historyItems.length,
          trashItems: trashItems.length,
          historyLimit,
        },
        logs: debugLogs,
      }
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      setNotice('调试信息已复制')
      addDebugLog('debug_report_copied', { logCount: debugLogs.length })
    } catch {
      setError('复制失败')
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    router.prefetch('/')
    router.prefetch('/history')
    router.prefetch('/trash')
  }, [mounted, router])

  useEffect(() => {
    if (!mounted) return

    const storedKey = localStorage.getItem('gemini_api_key') || ''
    const storedUrl = localStorage.getItem('gemini_api_url') || ''
    const storedOptimizeModel = localStorage.getItem('gemini_optimize_model') || ''
    const storedDebugEnabled = localStorage.getItem('gemini_debug_enabled') || ''
    const storedHistoryLimit = localStorage.getItem(HISTORY_LIMIT_KEY) || ''
    const storedAutoSave = localStorage.getItem(AUTO_SAVE_HISTORY_KEY) || ''
    const storedGenerateCount = localStorage.getItem(GENERATE_COUNT_KEY) || ''
    const storedGenerateModel = localStorage.getItem(GENERATE_MODEL_KEY) || ''
    const storedEditModel = localStorage.getItem(EDIT_MODEL_KEY) || ''
    const storedAspectRatio = localStorage.getItem(ASPECT_RATIO_KEY) || ''
    const storedGoogleSearch = localStorage.getItem(GOOGLE_SEARCH_KEY) || ''

    if (storedKey) setApiKey(storedKey)
    if (storedUrl) setApiUrl(storedUrl)
    if (storedOptimizeModel) setOptimizeModel(storedOptimizeModel)
    if (storedDebugEnabled) setDebugEnabled(storedDebugEnabled === '1')
    if (storedAutoSave) setAutoSaveToHistory(storedAutoSave === '1')
    if (storedGenerateModel) setGenerateModel(storedGenerateModel)
    if (storedEditModel) setEditModel(storedEditModel)
    if (storedAspectRatio) setAspectRatio(storedAspectRatio)
    if (storedGoogleSearch) setUseGoogleSearch(storedGoogleSearch === '1')

    if (storedHistoryLimit) {
      const parsed = Number(storedHistoryLimit)
      if (Number.isFinite(parsed)) {
        setHistoryLimit(Math.min(200, Math.max(1, Math.floor(parsed))))
      }
    }
    if (storedGenerateCount) {
      const parsedCount = Number(storedGenerateCount)
      if (Number.isFinite(parsedCount)) {
        setGenerateCount(Math.max(1, Math.min(8, Math.floor(parsedCount))))
      }
    }

    let canceled = false
    const hydrateMediaStorage = async () => {
      try {
        const [idbHistory, idbTrash] = await Promise.all([
          idbGet<HistoryItem[]>(HISTORY_KEY),
          idbGet<HistoryItem[]>(TRASH_KEY),
        ])

        if (!canceled && Array.isArray(idbHistory)) {
          setHistoryItems(idbHistory.filter((item) => !!item?.id && !!item?.image))
        }
        if (!canceled && Array.isArray(idbTrash)) {
          setTrashItems(idbTrash.filter((item) => !!item?.id && !!item?.image))
        }

        if (!Array.isArray(idbHistory)) {
          const storedHistory = localStorage.getItem(HISTORY_KEY) || ''
          if (storedHistory) {
            try {
              const parsed = JSON.parse(storedHistory) as HistoryItem[]
              if (!canceled && Array.isArray(parsed)) {
                const valid = parsed.filter((item) => !!item?.id && !!item?.image)
                setHistoryItems(valid)
                await idbSet(HISTORY_KEY, valid)
              }
            } catch {
              // ignore
            }
          }
        }

        if (!Array.isArray(idbTrash)) {
          const storedTrash = localStorage.getItem(TRASH_KEY) || ''
          if (storedTrash) {
            try {
              const parsed = JSON.parse(storedTrash) as HistoryItem[]
              if (!canceled && Array.isArray(parsed)) {
                const valid = parsed.filter((item) => !!item?.id && !!item?.image)
                setTrashItems(valid)
                await idbSet(TRASH_KEY, valid)
              }
            } catch {
              // ignore
            }
          }
        }
      } finally {
        if (!canceled) setPrefsHydrated(true)
      }
    }

    void hydrateMediaStorage()
    return () => {
      canceled = true
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    if (!apiKey.trim() || !apiUrl.trim()) return

    restoreModelsFromCache(apiUrl)
    loadModels({ silent: true })
  }, [mounted, apiKey, apiUrl])

  useEffect(() => {
    if (generateModels.length === 0) {
      return
    }
    if (!generateModels.some((item) => item.id === generateModel)) {
      setGenerateModel(generateModels[0].id)
      if (generateModel) setNotice('模型已自动切换')
    }
  }, [generateModels, generateModel])

  useEffect(() => {
    if (editModels.length === 0) {
      return
    }
    if (!editModels.some((item) => item.id === editModel)) {
      setEditModel(editModels[0].id)
      if (editModel) setNotice('模型已自动切换')
    }
  }, [editModels, editModel])

  useEffect(() => {
    if (promptModels.length === 0) {
      return
    }
    if (!promptModels.includes(optimizeModel)) {
      setOptimizeModel(promptModels[0])
      if (optimizeModel) setNotice('模型已自动切换')
    }
  }, [promptModels, optimizeModel])

  useEffect(() => {
    if (!selectedGenerateCapabilities.supportsSearchGrounding && useGoogleSearch) {
      setUseGoogleSearch(false)
      setNotice('当前模型不支持搜索')
    }
  }, [selectedGenerateCapabilities.supportsSearchGrounding, useGoogleSearch])

  useEffect(() => {
    if (selectedGenerateCapabilities.forcedImageSize && imageSize !== selectedGenerateCapabilities.forcedImageSize) {
      setImageSize(selectedGenerateCapabilities.forcedImageSize)
    }
  }, [selectedGenerateCapabilities.forcedImageSize, imageSize])

  useEffect(() => {
    if (selectedEditCapabilities.forcedImageSize && imageSize !== selectedEditCapabilities.forcedImageSize) {
      setImageSize(selectedEditCapabilities.forcedImageSize)
    }
  }, [selectedEditCapabilities.forcedImageSize, imageSize])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    localStorage.setItem('gemini_debug_enabled', debugEnabled ? '1' : '0')
  }, [mounted, prefsHydrated, debugEnabled])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    localStorage.setItem(AUTO_SAVE_HISTORY_KEY, autoSaveToHistory ? '1' : '0')
  }, [mounted, prefsHydrated, autoSaveToHistory])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    localStorage.setItem(GENERATE_COUNT_KEY, String(generateCount))
  }, [mounted, prefsHydrated, generateCount])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    localStorage.setItem(GENERATE_MODEL_KEY, generateModel)
  }, [mounted, prefsHydrated, generateModel])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    localStorage.setItem(EDIT_MODEL_KEY, editModel)
  }, [mounted, prefsHydrated, editModel])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    localStorage.setItem(ASPECT_RATIO_KEY, aspectRatio)
  }, [mounted, prefsHydrated, aspectRatio])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    localStorage.setItem(GOOGLE_SEARCH_KEY, useGoogleSearch ? '1' : '0')
  }, [mounted, prefsHydrated, useGoogleSearch])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    localStorage.setItem(HISTORY_LIMIT_KEY, String(historyLimit))
  }, [mounted, prefsHydrated, historyLimit])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    const persistHistory = async () => {
      try {
        await idbSet(HISTORY_KEY, historyItems.slice(0, historyLimit))
      } catch {
        setError('浏览器存储不可用，无法保存历史记录')
      }
    }
    void persistHistory()
  }, [mounted, prefsHydrated, historyItems, historyLimit])

  useEffect(() => {
    if (!mounted || !prefsHydrated) return
    const persistTrash = async () => {
      try {
        await idbSet(TRASH_KEY, trashItems)
      } catch {
        setError('浏览器存储不可用，无法保存回收站')
      }
    }
    void persistTrash()
  }, [mounted, prefsHydrated, trashItems])

  useEffect(() => {
    setHistoryItems((prev) => prev.slice(0, historyLimit))
  }, [historyLimit])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (workspacePage !== 'studio') return
      const items = event.clipboardData?.items
      if (!items) return

      const files: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
      }

      if (files.length === 0) return
      event.preventDefault()
      addImages(files, mode)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [workspacePage, mode, generateMaxReferenceImages, editMaxReferenceImages, referenceImages.length, editImages.length])

  // --- UI Components ---

  const sidebarLinks = [
    { key: 'studio', label: '创作', href: '/', icon: <Sparkles className='h-4 w-4' /> },
    { key: 'history', label: '历史', href: '/history', icon: <History className='h-4 w-4' />, count: historyItems.length },
    { key: 'trash', label: '回收', href: '/trash', icon: <Trash2 className='h-4 w-4' />, count: trashItems.length },
  ]

  return (
    <div className='flex min-h-dvh bg-white text-slate-900 font-sans flex-col lg:flex-row'>
      {/* Mobile Header */}
      <header className='lg:hidden flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-30'>
        <div className='flex items-center gap-2'>
           <span className='text-lg font-bold tracking-tight'>Gemini Studio</span>
        </div>
        <Button variant='ghost' size='icon' onClick={() => setMobileMenuOpen(true)}>
          <Menu className='h-5 w-5' />
        </Button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        'border-r border-slate-100 bg-white flex flex-col p-4',
        'lg:w-64 lg:fixed lg:h-full lg:translate-x-0 transition-transform duration-300 ease-in-out z-40',
        'fixed inset-y-0 left-0 w-64 lg:shadow-none',
        mobileMenuOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className='flex items-center justify-between mb-8 px-2'>
          <div>
            <h1 className='text-xl font-bold tracking-tight text-slate-900'>Gemini Studio</h1>
            <p className='text-xs text-slate-400 mt-1 font-medium tracking-wide uppercase'>Aesthetic & Pragmatic</p>
          </div>
          <Button variant='ghost' size='icon' className='lg:hidden -mr-2' onClick={() => setMobileMenuOpen(false)}>
            <X className='h-5 w-5' />
          </Button>
        </div>

        <nav className='flex-1 space-y-1'>
          {sidebarLinks.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm rounded-sm transition-all duration-200 group border-l-2 border-transparent hover:border-slate-200 hover:bg-slate-50',
                workspacePage === item.key
                  ? 'bg-slate-50 text-slate-900 font-medium border-l-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:pl-4'
              )}
            >
              <div className='flex items-center gap-3'>
                {item.icon}
                {item.label}
              </div>
              {item.count ? <span className='text-xs text-slate-400'>{item.count}</span> : null}
            </Link>
          ))}
        </nav>

        <div className='space-y-2 mt-auto pt-4 border-t border-slate-100'>
           <Button
            variant='outline'
            size='sm'
            className='w-full justify-start text-slate-600 border-slate-200'
            onClick={() => {
              setSettingsOpen(true)
              setMobileMenuOpen(false)
            }}
          >
            <Settings className='mr-2 h-4 w-4' />
            设置
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='w-full justify-start text-slate-400 hover:text-slate-600'
            onClick={() => {
              loadModels()
              setMobileMenuOpen(false)
            }}
            disabled={modelsLoading}
          >
            <RefreshCw className={cn('mr-2 h-3 w-3', modelsLoading && 'animate-spin')} />
            刷新模型
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className='lg:hidden fixed inset-0 bg-black/20 z-30 backdrop-blur-sm' onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className='flex-1 lg:ml-64 p-4 lg:p-6 overflow-auto w-full'>
        {/* Toast Notification */}
        {(error || notice) && (
          <div className={cn(
            'fixed bottom-6 right-6 z-[120] px-4 py-3 rounded-md shadow-lg flex items-center gap-3 transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in bg-white border border-slate-200 text-slate-800'
          )}>
            {error ? <AlertCircle className='h-5 w-5 text-red-500' /> : <CheckCircle2 className='h-5 w-5 text-green-500' />}
            <span className='text-sm font-medium'>{error || notice}</span>
            <button onClick={() => { setError(''); setNotice('') }} className='ml-2 opacity-70 hover:opacity-100'>
              <X className='h-4 w-4' />
            </button>
          </div>
        )}

        {workspacePage === 'studio' && (
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1600px] mx-auto'>
            {/* Left Panel: Controls */}
            <div className='lg:col-span-4 space-y-6'>
              
              {/* Mode Switch */}
              <div className='flex bg-slate-100/50 rounded-md p-1'>
                <button
                  onClick={() => setMode('generate')}
                  className={cn(
                    'flex-1 py-1.5 text-sm font-medium transition-all rounded-sm duration-300 ease-out',
                    mode === 'generate' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  生成
                </button>
                <button
                  onClick={() => setMode('edit')}
                  className={cn(
                    'flex-1 py-1.5 text-sm font-medium transition-all rounded-sm duration-300 ease-out',
                    mode === 'edit' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  编辑
                </button>
              </div>

              {/* Input Area */}
              <div className='space-y-3'>
                <div className='flex justify-between items-center'>
                  <Label className='text-xs font-semibold uppercase text-slate-400 tracking-wider'>
                    {mode === 'generate' ? '提示词' : '编辑指令'}
                  </Label>
                  <button 
                    onClick={handleOptimizePrompt}
                    disabled={optimizing || !prompt.trim()}
                    className='text-xs text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors disabled:opacity-50'
                    title='使用 AI 优化提示词'
                  >
                    <span className='text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 mr-1 hidden lg:inline-block'>⌘+Enter</span>
                    <Wand2 className='h-3 w-3' />
                    优化
                  </button>
                </div>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={mode === 'generate' ? '在此描述画面...' : '在此描述修改...'}
                  className='min-h-[140px] resize-none border-slate-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 bg-white rounded-sm text-sm transition-all duration-300'
                />
              </div>

              {/* Reference Images */}
              <div className='space-y-3'>
                 <Label className='text-xs font-semibold uppercase text-slate-400 tracking-wider'>
                    {mode === 'generate' ? '参考图' : '编辑素材'}
                  </Label>
                <div className='grid grid-cols-4 gap-2'>
                  {(mode === 'generate' ? referenceImages : editImages).map((img) => (
                    <div key={img.id} className='relative aspect-square bg-white rounded-sm overflow-hidden group border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5'>
                      <Image src={img.preview} alt='ref' fill className='object-cover' />
                      <button
                        onClick={() => removeImage(mode, img.id)}
                        className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white'
                      >
                        <X className='h-4 w-4' />
                      </button>
                    </div>
                  ))}
                  <div
                    className={cn(
                      'aspect-square border border-dashed border-slate-300 rounded-sm flex items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all duration-300 group',
                      (mode === 'generate' ? isReferenceDragActive : isEditDragActive) && 'border-slate-900 bg-slate-50'
                    )}
                    onDragOver={(e) => { e.preventDefault(); mode === 'generate' ? setIsReferenceDragActive(true) : setIsEditDragActive(true) }}
                    onDragLeave={() => { mode === 'generate' ? setIsReferenceDragActive(false) : setIsEditDragActive(false) }}
                    onDrop={(e) => {
                      e.preventDefault()
                      mode === 'generate' ? setIsReferenceDragActive(false) : setIsEditDragActive(false)
                      addImages(Array.from(e.dataTransfer.files || []), mode)
                    }}
                  >
                    <input
                      type='file'
                      multiple
                      accept='image/*'
                      className='hidden'
                      id='upload-trigger'
                      onChange={(e) => e.target.files && addImages(Array.from(e.target.files), mode)}
                    />
                    <label htmlFor='upload-trigger' className='flex flex-col items-center justify-center w-full h-full cursor-pointer text-slate-400 hover:text-slate-600'>
                      <Upload className='h-5 w-5 text-slate-400 group-hover:scale-110 transition-transform duration-300' />
                    </label>
                  </div>
                </div>
              </div>

              {/* Controls Grid */}
              <div className='grid grid-cols-3 gap-4'>
                <div className='space-y-1.5'>
                  <Label className='text-xs text-slate-500'>模型</Label>
                  <Select 
                    value={mode === 'generate' ? generateModel : editModel} 
                    onValueChange={mode === 'generate' ? setGenerateModel : setEditModel}
                  >
                    <SelectTrigger className='h-9 text-xs'><SelectValue placeholder='请选择' /></SelectTrigger>
                    <SelectContent>
                      {(mode === 'generate' ? generateModels : editModels).map((m) => (
                        <SelectItem key={m.id} value={m.id} className='text-xs'>{m.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className='space-y-1.5'>
                  <Label className='text-xs text-slate-500'>比例</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className='h-9 text-xs'><SelectValue placeholder='自动' /></SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map((r) => <SelectItem key={r} value={r} className='text-xs'>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs text-slate-500'>分辨率</Label>
                  <Select
                    value={imageSize}
                    onValueChange={setImageSize}
                    disabled={!activeCapabilities.supportsImageSize || !!activeCapabilities.forcedImageSize}
                  >
                    <SelectTrigger className='h-9 text-xs'><SelectValue placeholder='1K' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='1K' className='text-xs'>1K</SelectItem>
                      <SelectItem value='2K' className='text-xs'>2K</SelectItem>
                      <SelectItem value='4K' className='text-xs'>4K</SelectItem>
                    </SelectContent>
                  </Select>
                  {activeCapabilities.forcedImageSize ? (
                    <p className='text-[11px] text-slate-500'>固定为 {activeCapabilities.forcedImageSize}</p>
                  ) : null}
                </div>
              </div>

              {mode === 'generate' && (
                <div className={cn(
                  'flex items-center justify-between rounded-sm border border-slate-200 bg-white p-3 shadow-sm transition-all',
                  selectedGenerateCapabilities.supportsSearchGrounding ? 'hover:shadow-md hover:border-slate-300' : 'opacity-60 cursor-not-allowed bg-slate-50'
                )}>
                  <div className='space-y-0.5'>
                    <Label htmlFor='google-search' className={cn('text-sm font-medium text-slate-900', selectedGenerateCapabilities.supportsSearchGrounding ? 'cursor-pointer' : 'cursor-not-allowed')}>使用 Google 搜索</Label>
                    <p className='text-xs text-slate-500'>
                      {selectedGenerateCapabilities.supportsSearchGrounding ? '基于实时信息生成图片' : '当前模型不支持此功能'}
                    </p>
                  </div>
                  <Switch 
                    id='google-search' 
                    checked={useGoogleSearch} 
                    onCheckedChange={setUseGoogleSearch} 
                    disabled={!selectedGenerateCapabilities.supportsSearchGrounding}
                  />
                </div>
              )}

              <div className='space-y-3 mt-4 rounded-sm border border-slate-200 bg-white p-3 shadow-sm'>
                {mode === 'generate' && (
                  <div className='grid grid-cols-[1fr_120px] gap-3 items-center'>
                    <div>
                      <Label htmlFor='generate-count' className='text-sm font-medium text-slate-900'>生成次数</Label>
                      <p className='text-xs text-slate-500'>同一提示词并行生成多张图片（1-8）</p>
                    </div>
                    <Input
                      id='generate-count'
                      type='number'
                      min={1}
                      max={8}
                      value={generateCount}
                      onChange={(e) => {
                        const next = Number(e.target.value)
                        if (!Number.isFinite(next)) return
                        setGenerateCount(Math.max(1, Math.min(8, Math.floor(next))))
                      }}
                    />
                  </div>
                )}

                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='w-full'
                  onClick={handleClearCreativeParams}
                >
                  清空创作参数
                </Button>
              </div>

              <Button
                size='lg'
                className='w-full bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.99] rounded-sm h-12 text-sm font-medium tracking-wide mt-4 transition-all duration-200 shadow-lg shadow-slate-900/10'
                onClick={mode === 'generate' ? handleGenerate : handleEdit}
                disabled={loading}
              >
                {loading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Sparkles className='mr-2 h-4 w-4' />}
                {loading ? '处理中' : '立即生成'}
              </Button>

            </div>

            {/* Right Panel: Result */}
            <div className='lg:col-span-8 flex flex-col h-full min-h-[400px] lg:h-[calc(100dvh-6rem)] lg:max-h-[calc(100dvh-6rem)] overflow-hidden bg-slate-50/50 rounded-sm border border-slate-100 p-6 relative bg-dot-pattern'>
              <div className='flex-1 min-h-0 flex items-center justify-center relative overflow-hidden'>
                {loading ? (
                  <div className='text-center'>
                    <Loader2 className='h-8 w-8 animate-spin mx-auto text-slate-300' />
                    <p className='mt-4 text-sm text-slate-400 font-mono animate-pulse'>{loadingMessage}</p>
                  </div>
                ) : generatedImage ? (
                    <div className='relative w-full h-full min-h-0 flex items-center justify-center overflow-hidden'>
                      {imageLoading && (
                        <div className='absolute inset-0 flex items-center justify-center bg-slate-50 z-10'>
                          <Loader2 className='h-8 w-8 animate-spin text-slate-300' />
                        </div>
                      )}
                      <img 
                        src={generatedImage} 
                        alt='Result' 
                        onLoad={() => setImageLoading(false)}
                        onClick={() => setPreviewImage(generatedImage)}
                        className={cn(
                          'max-w-full max-h-full object-contain shadow-sm bg-white transition-opacity duration-500 cursor-zoom-in',
                          imageLoading ? 'opacity-0' : 'opacity-100'
                        )}
                      />
                    <div className='absolute bottom-4 flex gap-2 opacity-0 hover:opacity-100 transition-opacity bg-white/90 p-1.5 rounded-sm border border-slate-200 backdrop-blur-sm'>
                      <Button variant='ghost' size='icon' className='h-8 w-8' onClick={() => setPreviewImage(generatedImage)}>
                        <Maximize2 className='h-4 w-4' />
                      </Button>
                      <Button variant='ghost' size='icon' className='h-8 w-8' onClick={handleCopyImage}>
                        <Copy className='h-4 w-4' />
                      </Button>
                      <Button variant='ghost' size='icon' className='h-8 w-8' onClick={handleDownload}>
                        <Download className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className='text-center text-slate-300 flex flex-col items-center justify-center'>
                    <ImageIcon className='h-24 w-24 mb-4 opacity-10' />
                    <p className='text-base font-medium opacity-50'>暂无内容</p>
                  </div>
                )}
              </div>

              {generatedText && (
                <div className='mt-4 p-4 bg-white border border-slate-200 rounded-sm text-sm text-slate-600 leading-relaxed'>
                  {generatedText}
                </div>
              )}

              {mode === 'generate' && batchResults.length > 1 && (
                <div className='mt-4'>
                  <p className='mb-2 text-xs font-medium text-slate-500'>本次生成结果（{batchResults.length}）</p>
                  <div className='grid grid-cols-4 gap-2'>
                    {batchResults.map((image, index) => (
                      <button
                        key={`${image.slice(0, 32)}_${index}`}
                        type='button'
                        className={cn(
                          'relative aspect-square overflow-hidden rounded-sm border bg-white',
                          generatedImage === image ? 'border-slate-900' : 'border-slate-200 hover:border-slate-400'
                        )}
                        onClick={() => setGeneratedImage(image)}
                      >
                        <Image src={image} alt={`batch-${index + 1}`} fill className='object-cover' />
                        <span className='absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white'>#{index + 1}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {workspacePage === 'history' && (
           <div className='max-w-[1600px] mx-auto'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-bold'>历史记录</h2>
              <span className='text-sm text-slate-400'>{historyItems.length} items</span>
            </div>
            
            <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
              {historyItems.map((item) => (
                <div key={item.id} className='group relative border border-slate-200 bg-white rounded-sm overflow-hidden hover:border-slate-400 transition-colors'>
                  <div className='aspect-square relative bg-slate-50'>
                    <Image src={item.image} alt='history' fill className='object-cover' />
                    <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100'>
                      <Button size='icon' variant='secondary' className='h-8 w-8 rounded-sm bg-white text-black' onClick={() => {
                        setGeneratedImage(item.image)
                        setGeneratedText(item.text || '')
                        setMode(item.mode)
                      }}>
                        <Undo2 className='h-4 w-4' />
                      </Button>
                      <Button size='icon' variant='secondary' className='h-8 w-8 rounded-sm bg-white text-red-600' onClick={() => moveHistoryItemToTrash(item.id)}>
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                  <div className='p-2'>
                    <div className='flex items-center justify-between'>
                      <p className='text-[10px] text-slate-400 uppercase font-medium truncate'>{item.model}</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(item.prompt)
                          setNotice('提示词已复制')
                        }}
                        className='text-[10px] text-slate-400 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity'
                        title='复制提示词'
                      >
                        <Copy className='h-3 w-3' />
                      </button>
                    </div>
                    <p className='text-xs text-slate-600 truncate mt-0.5'>{item.prompt}</p>
                  </div>
                </div>
              ))}
              {historyItems.length === 0 && (
                <div className='col-span-full flex flex-col items-center justify-center py-20 text-slate-400'>
                  <div className='h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4'>
                    <History className='h-8 w-8 opacity-20' />
                  </div>
                  <p className='text-sm font-medium'>暂无历史记录</p>
                  <p className='text-xs mt-1 opacity-60'>生成的图片会自动保存在这里</p>
                </div>
              )}
            </div>
          </div>
        )}

        {workspacePage === 'trash' && (
           <div className='max-w-[1600px] mx-auto'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-bold'>回收站</h2>
              <Button variant='outline' size='sm' onClick={clearTrash} disabled={trashItems.length === 0}>清空</Button>
            </div>
            
            <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
              {trashItems.map((item) => (
                <div key={item.id} className='relative border border-slate-200 bg-white rounded-sm overflow-hidden opacity-75 hover:opacity-100 transition-opacity'>
                  <div className='aspect-square relative bg-slate-50'>
                    <Image src={item.image} alt='trash' fill className='object-cover grayscale' />
                    <div className='absolute inset-0 flex items-center justify-center gap-2 bg-black/10'>
                      <Button size='icon' variant='secondary' className='h-8 w-8 rounded-sm bg-white' onClick={() => restoreTrashItem(item.id)}>
                        <RotateCcw className='h-4 w-4' />
                      </Button>
                      <Button size='icon' variant='secondary' className='h-8 w-8 rounded-sm bg-white text-red-600' onClick={() => deleteTrashItemPermanently(item.id)}>
                        <X className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
               {trashItems.length === 0 && (
                <div className='col-span-full flex flex-col items-center justify-center py-20 text-slate-400'>
                  <div className='h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4'>
                    <Trash2 className='h-8 w-8 opacity-20' />
                  </div>
                  <p className='text-sm font-medium'>回收站为空</p>
                  <p className='text-xs mt-1 opacity-60'>删除的图片会暂时存放在这里</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm' onClick={() => setSettingsOpen(false)}>
          <Card className='w-full max-w-md bg-white border-none shadow-xl rounded-sm' onClick={e => e.stopPropagation()}>
            <div className='p-6 space-y-6'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-bold'>设置</h3>
                <button onClick={() => setSettingsOpen(false)} className='text-slate-400 hover:text-slate-900'><X className='h-5 w-5' /></button>
              </div>
              
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label>API Key</Label>
                  <Input type='password' value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder='Gemini API Key' />
                </div>
                <div className='space-y-2'>
                  <Label>API URL</Label>
                  <Input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder='https://generativelanguage.googleapis.com' />
                </div>
                <div className='space-y-2'>
                   <Label>提示词优化模型</Label>
                   <Select value={optimizeModel} onValueChange={setOptimizeModel}>
                    <SelectTrigger><SelectValue placeholder='请选择模型' /></SelectTrigger>
                    <SelectContent>
                      {promptModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                   </Select>
                </div>
                <div className='flex items-center justify-between pt-2'>
                  <Label>调试模式</Label>
                  <Switch checked={debugEnabled} onCheckedChange={setDebugEnabled} />
                </div>
                <div className='flex items-center justify-between pt-2'>
                  <div>
                    <Label>自动保存到历史</Label>
                    <p className='text-xs text-slate-500 mt-1'>生成完成后自动写入历史记录</p>
                  </div>
                  <Switch checked={autoSaveToHistory} onCheckedChange={setAutoSaveToHistory} />
                </div>
              </div>

              <div className='flex gap-3 pt-2'>
                <Button variant='outline' className='flex-1' onClick={handleTestConnection} disabled={connectionTesting}>
                  {connectionTesting ? '测试中...' : '测试连接'}
                </Button>
                <Button className='flex-1 bg-slate-900 text-white hover:bg-black' onClick={handleSaveSettings}>保存</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Fullscreen Preview */}
      {previewImage && (
        <div className='fixed inset-0 z-[100] bg-white flex items-center justify-center' onClick={() => setPreviewImage(null)}>
           <button className='absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full' onClick={() => setPreviewImage(null)}>
             <X className='h-8 w-8 text-slate-900' />
           </button>
           <img src={previewImage} className='max-w-[95vw] max-h-[95vh] object-contain' />
        </div>
      )}
    </div>
  )
}
