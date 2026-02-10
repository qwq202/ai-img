export interface Task {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  phase?: 'queued' | 'preparing' | 'calling_model' | 'parsing_response' | 'completed' | 'failed'
  prompt: string
  aspectRatio: string
  imageSize: string
  useGoogleSearch: boolean
  createdAt: number
  updatedAt: number
  result?: {
    text?: string
    image?: string
    groundingMetadata?: unknown
  }
  error?: string
}

const PENDING_TASK_TTL_MS = 10 * 60 * 1000
const TERMINAL_TASK_TTL_MS = 30 * 60 * 1000

class TaskStore {
  private tasks: Map<string, Task> = new Map()
  private cleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  private scheduleCleanup(taskId: string, ttlMs: number): void {
    const existingTimer = this.cleanupTimers.get(taskId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      this.tasks.delete(taskId)
      this.cleanupTimers.delete(taskId)
    }, ttlMs)

    this.cleanupTimers.set(taskId, timer)
  }

  createTask(params: {
    prompt: string
    aspectRatio: string
    imageSize: string
    useGoogleSearch: boolean
  }): string {
    const taskId = `task_${crypto.randomUUID()}`
    const task: Task = {
      id: taskId,
      status: 'pending',
      phase: 'queued',
      ...params,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.tasks.set(taskId, task)

    this.scheduleCleanup(taskId, PENDING_TASK_TTL_MS)

    return taskId
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId)
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    const task = this.tasks.get(taskId)
    if (task) {
      const nextTask = {
        ...task,
        ...updates,
        updatedAt: Date.now(),
      }
      this.tasks.set(taskId, nextTask)

      if (nextTask.status === 'completed' || nextTask.status === 'failed') {
        this.scheduleCleanup(taskId, TERMINAL_TASK_TTL_MS)
      }
    }
  }

  deleteTask(taskId: string): void {
    const existingTimer = this.cleanupTimers.get(taskId)
    if (existingTimer) {
      clearTimeout(existingTimer)
      this.cleanupTimers.delete(taskId)
    }
    this.tasks.delete(taskId)
  }
}

declare global {
  var __taskStore: TaskStore | undefined
}

const globalForTaskStore = globalThis as typeof globalThis & {
  __taskStore?: TaskStore
}

export const taskStore = globalForTaskStore.__taskStore ?? new TaskStore()

globalForTaskStore.__taskStore = taskStore
