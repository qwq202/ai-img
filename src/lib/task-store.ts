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

class TaskStore {
  private tasks: Map<string, Task> = new Map()

  createTask(params: {
    prompt: string
    aspectRatio: string
    imageSize: string
    useGoogleSearch: boolean
  }): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const task: Task = {
      id: taskId,
      status: 'pending',
      phase: 'queued',
      ...params,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.tasks.set(taskId, task)
    
    setTimeout(() => {
      if (this.tasks.has(taskId)) {
        const task = this.tasks.get(taskId)
        if (task && task.status === 'pending') {
          this.tasks.delete(taskId)
        }
      }
    }, 10 * 60 * 1000)
    
    return taskId
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId)
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    const task = this.tasks.get(taskId)
    if (task) {
      this.tasks.set(taskId, {
        ...task,
        ...updates,
        updatedAt: Date.now(),
      })
    }
  }

  deleteTask(taskId: string): void {
    this.tasks.delete(taskId)
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __taskStore: TaskStore | undefined
}

const globalForTaskStore = globalThis as typeof globalThis & {
  __taskStore?: TaskStore
}

export const taskStore = globalForTaskStore.__taskStore ?? new TaskStore()

globalForTaskStore.__taskStore = taskStore
