import { NextRequest, NextResponse } from 'next/server';
import { taskStore } from '@/lib/task-store';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const task = taskStore.getTask(taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        phase: task.phase,
        result: task.result,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }
    });

  } catch (error) {
    console.error('Error in task status API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
