'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Sparkles, Download, ImageIcon, Upload, X, ZoomIn, Wand2, RotateCcw, Settings, Copy } from 'lucide-react'
import Image from 'next/image'

interface ReferenceImage {
  id: string
  file: File
  preview: string
  base64?: string
  mimeType: string
}

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedText, setGeneratedText] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [imageSize, setImageSize] = useState('1K')
  const [useGoogleSearch, setUseGoogleSearch] = useState(false)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [mode, setMode] = useState<'generate' | 'edit'>('generate')
  const [editImages, setEditImages] = useState<ReferenceImage[]>([])
  const [generateModel, setGenerateModel] = useState('gemini-3-pro-image-preview')
  const [editModel, setEditModel] = useState('gemini-2.5-flash-image')
  const [optimizeModel, setOptimizeModel] = useState('gemini-2.5-flash-lite')
  const [availableModels, setAvailableModels] = useState<string[]>([
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
    'gemini-2.5-flash-lite'
  ])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('https://generativelanguage.googleapis.com')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const storedKey = localStorage.getItem('gemini_api_key') || ''
    const storedUrl = localStorage.getItem('gemini_api_url') || ''
    const storedOptimizeModel = localStorage.getItem('gemini_optimize_model') || ''
    if (storedKey) setApiKey(storedKey)
    if (storedUrl) setApiUrl(storedUrl)
    if (storedOptimizeModel) setOptimizeModel(storedOptimizeModel)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    if (apiKey.trim() && apiUrl.trim()) {
      loadModels()
    }
  }, [mounted, apiKey, apiUrl])

  const buildApiHeaders = (includeContentType = false) => {
    if (!apiKey.trim() || !apiUrl.trim()) return null
    const headers: Record<string, string> = {
      'x-gemini-api-key': apiKey.trim(),
      'x-gemini-api-url': apiUrl.trim(),
    }
    if (includeContentType) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  const loadModels = async () => {
    const headers = buildApiHeaders()
    if (!headers) return
    setModelsLoading(true)
    try {
      const response = await fetch('/api/models', { headers })
      const data = await response.json()
      if (response.ok && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models)
        if (!data.models.includes(generateModel)) {
          setGenerateModel(data.models[0])
        }
        if (!data.models.includes(editModel)) {
          setEditModel(data.models[0])
        }
      }
    } catch {
      // keep fallback list
    } finally {
      setModelsLoading(false)
    }
  }

  const handleSaveSettings = () => {
    const trimmedKey = apiKey.trim()
    const trimmedUrl = apiUrl.trim()
    if (!trimmedKey || !trimmedUrl) {
      setError('请填写 Gemini API Key 和 API URL')
      return
    }
    localStorage.setItem('gemini_api_key', trimmedKey)
    localStorage.setItem('gemini_api_url', trimmedUrl)
    localStorage.setItem('gemini_optimize_model', optimizeModel)
    setSettingsOpen(false)
    setError('')
    loadModels()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: ReferenceImage[] = []
    
    Array.from(files).forEach((file) => {
      if (referenceImages.length + newImages.length >= 14) {
        setError('最多只能上传 14 张参考图片')
        return
      }

      if (!file.type.startsWith('image/')) {
        setError('请上传图片文件')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const preview = event.target?.result as string
        const base64Data = preview.split(',')[1]
        
        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview,
          base64: base64Data,
          mimeType: file.type
        })

        if (newImages.length === Array.from(files).length) {
          setReferenceImages([...referenceImages, ...newImages])
          setError('')
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const addImagesToReference = (files: File[]) => {
    const maxImages = 14
    const remaining = maxImages - referenceImages.length
    if (remaining <= 0) {
      setError('最多只能上传 14 张参考图片')
      return
    }

    const acceptedFiles = files
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remaining)

    if (acceptedFiles.length === 0) {
      setError('请上传图片文件')
      return
    }

    const newImages: ReferenceImage[] = []
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const preview = event.target?.result as string
        const base64Data = preview.split(',')[1]
        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview,
          base64: base64Data,
          mimeType: file.type
        })

        if (newImages.length === acceptedFiles.length) {
          setReferenceImages((prev) => [...prev, ...newImages])
          setError('')
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (id: string) => {
    setReferenceImages(referenceImages.filter(img => img.id !== id))
  }

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    addImagesToEdit(Array.from(files))
  }

  const addImagesToEdit = (files: File[]) => {
    const maxImages = editModel === 'gemini-2.5-flash-image' ? 3 : 14
    const remaining = maxImages - editImages.length
    if (remaining <= 0) {
      setError(`最多只能上传 ${maxImages} 张参考图片`)
      return
    }

    const acceptedFiles = files
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, remaining)

    if (acceptedFiles.length === 0) {
      setError('请上传图片文件')
      return
    }

    const newImages: ReferenceImage[] = []
    acceptedFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const preview = event.target?.result as string
        const base64Data = preview.split(',')[1]
        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview,
          base64: base64Data,
          mimeType: file.type
        })

        if (newImages.length === acceptedFiles.length) {
          setEditImages((prev) => [...prev, ...newImages])
          setError('')
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeEditImage = (id: string) => {
    setEditImages(editImages.filter(img => img.id !== id))
  }

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
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
      if (mode === 'generate') {
        addImagesToReference(files)
      } else {
        addImagesToEdit(files)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [mode, referenceImages.length, editImages.length, editModel])

  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) {
      setError('请先输入提示词')
      return
    }

    setOptimizing(true)
    setError('')

    try {
      const headers = buildApiHeaders(true)
      if (!headers) {
        setError('请先在设置中填写 Gemini API Key 和 API URL')
        return
      }

      const response = await fetch('/api/optimize-prompt', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, model: optimizeModel }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '优化失败')
      }

      if (data.optimizedPrompt) {
        setPrompt(data.optimizedPrompt)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '优化提示词时出错')
    } finally {
      setOptimizing(false)
    }
  }

  const pollTaskStatus = async (taskId: string) => {
    const maxAttempts = 120
    const pollInterval = 2000
    let attempts = 0

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        setError('任务超时，请重试')
        setLoading(false)
        return
      }

      attempts++

      try {
        const response = await fetch(`/api/task/${taskId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '查询任务失败')
        }

        const { task } = data

        if (task.status === 'completed') {
          if (task.result?.image) {
            setGeneratedImage(task.result.image)
          }
          if (task.result?.text) {
            setGeneratedText(task.result.text)
          }
          setLoading(false)
          return
        }

        if (task.status === 'failed') {
          throw new Error(task.error || '生成失败')
        }

        if (task.status === 'processing' || task.status === 'pending') {
          setTimeout(() => poll(), pollInterval)
          return
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : '查询任务状态时出错')
        setLoading(false)
      }
    }

    poll()
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入提示词')
      return
    }

    setLoading(true)
    setError('')
    setGeneratedImage(null)
    setGeneratedText('')

    try {
      const headers = buildApiHeaders(true)
      if (!headers) {
        setError('请先在设置中填写 Gemini API Key 和 API URL')
        setLoading(false)
        return
      }

      const requestBody = {
        prompt,
        model: generateModel,
        aspectRatio,
        imageSize,
        useGoogleSearch,
        referenceImages: referenceImages.map(img => ({
          mimeType: img.mimeType,
          data: img.base64
        }))
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '创建任务失败')
      }

      if (data.taskId) {
        pollTaskStatus(data.taskId)
      } else {
        throw new Error('未返回任务 ID')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成图片时出错')
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!prompt.trim()) {
      setError('请输入修改要求')
      return
    }
    if (editImages.length === 0) {
      setError('请先上传要修改的图片')
      return
    }

    setLoading(true)
    setError('')
    setGeneratedImage(null)
    setGeneratedText('')

    try {
      const headers = buildApiHeaders(true)
      if (!headers) {
        setError('请先在设置中填写 Gemini API Key 和 API URL')
        setLoading(false)
        return
      }

      const requestBody: {
        prompt: string;
        images: Array<{ mimeType: string; data: string }>;
        model: string;
        aspectRatio?: string;
        imageSize?: string;
      } = {
        prompt,
        images: editImages.map((img) => ({
          mimeType: img.mimeType,
          data: img.base64 || ''
        })),
        model: editModel
      }

      if (editModel === 'gemini-3-pro-image-preview') {
        requestBody.aspectRatio = aspectRatio
        requestBody.imageSize = imageSize
      }

      const response = await fetch('/api/edit', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '修改失败')
      }

      if (data.image) {
        setGeneratedImage(data.image)
      }
      if (data.text) {
        setGeneratedText(data.text)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改图片时出错')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPrompt('')
    setGeneratedImage(null)
    setGeneratedText('')
    setError('')
    setAspectRatio('1:1')
    setImageSize('1K')
    setUseGoogleSearch(false)
    setReferenceImages([])
    setShowPreview(false)
    setEditImages([])
  }

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a')
      link.href = generatedImage
      link.download = `gemini-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleCopyImage = async () => {
    if (!generatedImage) return
    try {
      const response = await fetch(generatedImage)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ])
    } catch {
      setError('复制图片失败，请使用下载按钮')
    }
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto w-full px-4 py-6 md:py-10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="relative text-center mb-6 md:mb-8">
            <div className="absolute right-0 top-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-9 px-3 shadow-sm"
              >
                <Settings className="mr-1.5 h-4 w-4" />
                设置
              </Button>
            </div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <Sparkles className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white text-balance">
                AI 图像生成器
              </h1>
            </div>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-pretty">
              使用先进的 AI 技术，将您的创意文字描述转化为精美的图像
            </p>
          </div>

          {settingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <Card className="w-full max-w-lg shadow-2xl border-2">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">设置</CardTitle>
                  <CardDescription className="text-pretty">API Key 和 URL 仅保存在当前浏览器</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="optimize-model">提示词优化模型</Label>
                    {mounted ? (
                      <Select value={optimizeModel} onValueChange={setOptimizeModel}>
                        <SelectTrigger id="optimize-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                        <span className="line-clamp-1">{optimizeModel}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">Gemini API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="请输入 API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-url">Gemini API URL</Label>
                    <Input
                      id="api-url"
                      type="text"
                      placeholder="https://generativelanguage.googleapis.com"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button className="flex-1 h-10" onClick={handleSaveSettings}>
                      保存设置
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-10"
                      onClick={() => setSettingsOpen(false)}
                    >
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid w-full min-w-0 gap-6 lg:grid-cols-2">
            <Card className="min-w-0 shadow-md border-2">
              <CardHeader className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  {mode === 'generate' ? '图像生成配置' : '图像修改配置'}
                </CardTitle>
                <CardDescription className="text-sm text-pretty">
                  {mode === 'generate' ? '配置提示词和生成参数' : '上传图片并描述修改要求'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                  <Label className="text-sm font-medium">工作模式</Label>
                  <div className="flex gap-1.5 p-1 bg-white dark:bg-gray-800 rounded-md border">
                    <Button
                      type="button"
                      variant={mode === 'generate' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMode('generate')}
                      className="h-8 px-4"
                    >
                      生成
                    </Button>
                    <Button
                      type="button"
                      variant={mode === 'edit' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMode('edit')}
                      className="h-8 px-4"
                    >
                      修改
                    </Button>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prompt" className="text-sm font-medium">
                      {mode === 'generate' ? '提示词描述 *' : '修改要求 *'}
                    </Label>
                    {mode === 'generate' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOptimizePrompt}
                        disabled={optimizing || !prompt.trim()}
                        className="h-8 text-xs shadow-sm"
                      >
                        {optimizing ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            优化中
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                            优化提示词
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="prompt"
                    placeholder={
                      mode === 'generate'
                        ? '例如：一只可爱的橘猫坐在窗台上，背景是夕阳西下的城市天际线，写实风格，高清...'
                        : '例如：给这只猫加一顶小小的针织法师帽，风格写实，光线柔和...'
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[100px] resize-none text-sm"
                  />
                </div>

                {mode === 'generate' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="generate-model">生成模型</Label>
                      {mounted ? (
                        <Select value={generateModel} onValueChange={setGenerateModel}>
                          <SelectTrigger id="generate-model">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                          <span className="line-clamp-1">{generateModel}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2.5">
                        <Label htmlFor="aspect-ratio" className="text-sm font-medium">宽高比</Label>
                        {mounted ? (
                          <Select value={aspectRatio} onValueChange={setAspectRatio}>
                            <SelectTrigger id="aspect-ratio">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1:1">1:1 (正方形)</SelectItem>
                              <SelectItem value="2:3">2:3 (竖屏)</SelectItem>
                              <SelectItem value="3:2">3:2 (横屏)</SelectItem>
                              <SelectItem value="3:4">3:4 (竖屏)</SelectItem>
                              <SelectItem value="4:3">4:3 (横屏)</SelectItem>
                              <SelectItem value="4:5">4:5 (竖屏)</SelectItem>
                              <SelectItem value="5:4">5:4 (横屏)</SelectItem>
                              <SelectItem value="9:16">9:16 (手机竖屏)</SelectItem>
                              <SelectItem value="16:9">16:9 (宽屏)</SelectItem>
                              <SelectItem value="21:9">21:9 (超宽屏)</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                            <span className="line-clamp-1">{aspectRatio}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <Label htmlFor="image-size" className="text-sm font-medium">分辨率</Label>
                        {mounted ? (
                          <Select value={imageSize} onValueChange={setImageSize}>
                            <SelectTrigger id="image-size">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1K">1K</SelectItem>
                              <SelectItem value="2K">2K</SelectItem>
                              <SelectItem value="4K">4K</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                            <span className="line-clamp-1">{imageSize}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border-2 border-gray-200 p-3.5 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                      <div className="space-y-0.5">
                        <Label htmlFor="google-search" className="cursor-pointer text-sm font-medium">使用 Google 搜索</Label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-pretty">基于实时信息生成图片</p>
                      </div>
                      <Switch
                        id="google-search"
                        checked={useGoogleSearch}
                        onCheckedChange={setUseGoogleSearch}
                      />
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-sm font-medium">参考图片 (最多 14 张，支持 Ctrl/Cmd+V 粘贴)</Label>
                      <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-colors bg-gray-50 dark:bg-gray-900">
                        <input
                          type="file"
                          id="reference-images"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="reference-images"
                          className="flex flex-col items-center justify-center cursor-pointer py-2"
                        >
                          <Upload className="mb-2.5 h-8 w-8 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            点击上传参考图片
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 tabular-nums">
                            已上传 {referenceImages.length}/14 张
                          </p>
                        </label>
                      </div>

                      {referenceImages.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                          {referenceImages.map((img, index) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={img.preview}
                                alt={`Reference ${index + 1}`}
                                className="w-full h-24 object-cover rounded-md border-2 border-gray-200 dark:border-gray-700 shadow-sm"
                              />
                              <div className="absolute top-1.5 left-1.5 bg-black/80 text-white text-xs font-bold size-6 rounded-full flex items-center justify-center tabular-nums">
                                {index + 1}
                              </div>
                              <button
                                onClick={() => removeImage(img.id)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                aria-label="删除图片"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {mode === 'edit' && (
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-model">编辑模型</Label>
                      {mounted ? (
                        <Select
                          value={editModel}
                          onValueChange={(value) => {
                            const nextModel = value
                            setEditModel(nextModel)
                            const maxImages = nextModel === 'gemini-2.5-flash-image' ? 3 : 14
                            if (editImages.length > maxImages) {
                              setEditImages(editImages.slice(0, maxImages))
                              setError(`已根据模型限制保留前 ${maxImages} 张`)
                            }
                          }}
                        >
                          <SelectTrigger id="edit-model">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableModels.map((model) => (
                              <SelectItem key={model} value={model}>
                                {model}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                          <span className="line-clamp-1">{editModel}</span>
                        </div>
                      )}
                    </div>

                    {editModel === 'gemini-3-pro-image-preview' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="edit-aspect-ratio">宽高比</Label>
                          {mounted ? (
                            <Select value={aspectRatio} onValueChange={setAspectRatio}>
                              <SelectTrigger id="edit-aspect-ratio">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1:1">1:1 (正方形)</SelectItem>
                                <SelectItem value="2:3">2:3 (竖屏)</SelectItem>
                                <SelectItem value="3:2">3:2 (横屏)</SelectItem>
                                <SelectItem value="3:4">3:4 (竖屏)</SelectItem>
                                <SelectItem value="4:3">4:3 (横屏)</SelectItem>
                                <SelectItem value="4:5">4:5 (竖屏)</SelectItem>
                                <SelectItem value="5:4">5:4 (横屏)</SelectItem>
                                <SelectItem value="9:16">9:16 (手机竖屏)</SelectItem>
                                <SelectItem value="16:9">16:9 (宽屏)</SelectItem>
                                <SelectItem value="21:9">21:9 (超宽屏)</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                              <span className="line-clamp-1">{aspectRatio}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-image-size">分辨率</Label>
                          {mounted ? (
                            <Select value={imageSize} onValueChange={setImageSize}>
                              <SelectTrigger id="edit-image-size">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1K">1K</SelectItem>
                                <SelectItem value="2K">2K</SelectItem>
                                <SelectItem value="4K">4K</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm">
                              <span className="line-clamp-1">{imageSize}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Label className="text-sm font-medium">要修改的图片 (最多 {editModel === 'gemini-2.5-flash-image' ? 3 : 14} 张，支持 Ctrl/Cmd+V 粘贴)</Label>
                    <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 transition-colors bg-gray-50 dark:bg-gray-900">
                      <input
                        type="file"
                        id="edit-image"
                        multiple
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-image"
                        className="flex flex-col items-center justify-center cursor-pointer py-2"
                      >
                        <Upload className="mb-2.5 h-8 w-8 text-gray-400" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          点击上传要修改的图片
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 tabular-nums">
                          已上传 {editImages.length}/{editModel === 'gemini-2.5-flash-image' ? 3 : 14} 张
                        </p>
                      </label>
                    </div>

                    {editImages.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                        {editImages.map((img, index) => (
                          <div key={img.id} className="relative group">
                            <img
                              src={img.preview}
                              alt={`Edit ${index + 1}`}
                              className="w-full h-24 object-cover rounded-md border-2 border-gray-200 dark:border-gray-700 shadow-sm"
                            />
                            <div className="absolute top-1.5 left-1.5 bg-black/80 text-white text-xs font-bold size-6 rounded-full flex items-center justify-center tabular-nums">
                              {index + 1}
                            </div>
                            <button
                              onClick={() => removeEditImage(img.id)}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                              aria-label="删除图片"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 text-pretty">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={mode === 'generate' ? handleGenerate : handleEdit}
                    disabled={loading || !prompt.trim()}
                    className="flex-1 h-12 text-base font-medium shadow-md"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {mode === 'generate' ? '正在生成中...' : '正在修改中...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        {mode === 'generate' ? '生成图像' : '修改图像'}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="lg"
                    className="h-12 px-4 shadow-sm"
                    disabled={loading}
                    aria-label="重置"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 shadow-md border-2">
              <CardHeader className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  {mode === 'generate' ? '生成结果' : '修改结果'}
                </CardTitle>
                <CardDescription className="text-sm text-pretty">
                  {mode === 'generate' ? '您生成的图像将在这里显示' : '您修改后的图像将在这里显示'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI 正在创作中...</p>
                      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div className="h-full bg-blue-600 dark:bg-blue-400 animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  ) : generatedImage ? (
                    <>
                      <Image
                        src={generatedImage}
                        alt="Generated"
                        fill
                        className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setShowPreview(true)}
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <Button
                          onClick={() => setShowPreview(true)}
                          size="sm"
                          variant="secondary"
                          className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90"
                        >
                          <ZoomIn className="mr-1.5 h-4 w-4" />
                          预览
                        </Button>
                        <Button
                          onClick={handleCopyImage}
                          size="sm"
                          variant="secondary"
                          className="shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90"
                        >
                          <Copy className="mr-1.5 h-4 w-4" />
                          复制
                        </Button>
                        <Button
                          onClick={handleDownload}
                          size="sm"
                          className="shadow-xl"
                        >
                          <Download className="mr-1.5 h-4 w-4" />
                          下载
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-20 h-20 mb-4 opacity-10" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {mode === 'generate' ? '输入提示词并点击生成' : '上传图片并输入修改要求'}
                      </p>
                      <p className="text-xs mt-2 text-gray-500 dark:text-gray-500">您的图像将显示在这里</p>
                    </div>
                  )}
                </div>

                {generatedImage && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border-2 border-green-200 dark:border-green-800 shadow-sm">
                    <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                      ✓ {mode === 'generate' ? '图像生成成功！' : '图像修改成功！'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {generatedText && (
            <div className="mt-6">
              <Card className="shadow-md border-2">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    AI 描述
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-pretty">
                    {generatedText}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
      {/* 图片预览弹窗 */}
      {showPreview && generatedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-white/10"
              aria-label="关闭预览"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={generatedImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyImage()
                }}
                className="shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-900"
                variant="secondary"
                size="lg"
              >
                <Copy className="mr-2 h-4 w-4" />
                复制图片
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload()
                }}
                className="shadow-2xl"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                下载图片
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
