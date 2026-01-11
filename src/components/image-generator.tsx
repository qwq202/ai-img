'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2, Sparkles, Download, ImageIcon, Upload, X, ZoomIn, Wand2, RotateCcw, Settings } from 'lucide-react'
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
    if (storedKey) setApiKey(storedKey)
    if (storedUrl) setApiUrl(storedUrl)
  }, [mounted])

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

  const handleSaveSettings = () => {
    const trimmedKey = apiKey.trim()
    const trimmedUrl = apiUrl.trim()
    if (!trimmedKey || !trimmedUrl) {
      setError('请填写 Gemini API Key 和 API URL')
      return
    }
    localStorage.setItem('gemini_api_key', trimmedKey)
    localStorage.setItem('gemini_api_url', trimmedUrl)
    setSettingsOpen(false)
    setError('')
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

  const removeImage = (id: string) => {
    setReferenceImages(referenceImages.filter(img => img.id !== id))
  }

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
        body: JSON.stringify({ prompt }),
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto w-full px-4 py-4 md:py-8">
        <div className="max-w-6xl mx-auto w-full">
          <div className="relative text-center mb-4 md:mb-6">
            <div className="absolute right-0 top-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-9 px-3"
              >
                <Settings className="mr-2 h-4 w-4" />
                设置
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-8 h-8 text-gray-900 dark:text-gray-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                AI 图像生成器
              </h1>
            </div>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              使用先进的 AI 技术，将您的创意文字描述转化为精美的图像
            </p>
          </div>

          {settingsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <Card className="w-full max-w-lg shadow-xl">
                <CardHeader>
                  <CardTitle>设置</CardTitle>
                  <CardDescription>API Key 和 URL 仅保存在当前浏览器</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleSaveSettings}>
                      保存
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSettingsOpen(false)}
                    >
                      取消
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid w-full min-w-0 gap-4 lg:grid-cols-2">
            <Card className="min-w-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  图像生成配置
                </CardTitle>
                <CardDescription>
                  配置提示词和生成参数
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prompt">提示词描述 *</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOptimizePrompt}
                      disabled={optimizing || !prompt.trim()}
                      className="text-xs h-7"
                    >
                      {optimizing ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          优化中...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-1 h-3 w-3" />
                          优化提示词
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="prompt"
                    placeholder="例如：一只可爱的橘猫坐在窗台上，背景是夕阳西下的城市天际线，写实风格，高清..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[96px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="aspect-ratio">宽高比</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="image-size">分辨率</Label>
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

                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-2.5 dark:border-gray-800">
                  <div className="space-y-0.5">
                    <Label htmlFor="google-search" className="cursor-pointer">使用 Google 搜索</Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">基于实时信息生成图片</p>
                  </div>
                  <Switch
                    id="google-search"
                    checked={useGoogleSearch}
                    onCheckedChange={setUseGoogleSearch}
                  />
                </div>

                <div className="space-y-2">
                  <Label>参考图片 (最多 14 张)</Label>
                  <div className="rounded-lg border-2 border-dashed border-gray-300 p-3 dark:border-gray-700">
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
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="mb-2 h-7 w-7 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        点击上传参考图片
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {referenceImages.length}/14 张
                      </p>
                    </label>
                  </div>

                  {referenceImages.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {referenceImages.map((img, index) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.preview}
                            alt={`Reference ${index + 1}`}
                            className="w-full h-20 object-cover rounded border border-gray-200 dark:border-gray-800"
                          />
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {index + 1}
                          </div>
                          <button
                            onClick={() => removeImage(img.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !prompt.trim()}
                    className="flex-1 h-11 text-base"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        正在生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        生成图像
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="lg"
                    className="h-11"
                    disabled={loading}
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  生成结果
                </CardTitle>
                <CardDescription>
                  您生成的图像将在这里显示
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Loader2 className="mb-3 h-10 w-10 animate-spin text-gray-900 dark:text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">AI 正在创作中...</p>
                      <div className="mt-3 h-2 w-40 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <div className="h-full bg-gray-900 dark:bg-gray-400 animate-pulse" style={{ width: '60%' }}></div>
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
                          className="shadow-lg"
                        >
                          <ZoomIn className="mr-2 h-4 w-4" />
                          预览
                        </Button>
                        <Button
                          onClick={handleDownload}
                          size="sm"
                          className="shadow-lg"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          下载
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-sm">输入提示词并点击生成</p>
                      <p className="text-xs mt-2">您的图像将显示在这里</p>
                    </div>
                  )}
                </div>

                {generatedImage && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                      ✓ 图像生成成功！
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {generatedText && (
            <div className="mt-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="w-4 h-4" />
                    AI 描述
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={generatedImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownload()
                }}
                className="shadow-lg"
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
