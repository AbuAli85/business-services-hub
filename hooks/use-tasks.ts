/**
 * React Query hooks for task data management
 * Provides caching, automatic refetching, and optimistic updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, handleApiError } from '@/lib/api-client'
import { toast } from 'sonner'
import { milestoneKeys } from './use-milestones'

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Creates a new task with automatic milestone refetch
 */
export function useCreateTask(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      // Invalidate milestones to show new task
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
      toast.success('Task created successfully')
    },
    onError: (error) => {
      handleApiError(error, {
        fallbackMessage: 'Failed to create task',
      })
    },
  })
}

/**
 * Updates a task with optimistic updates
 */
export function useUpdateTask(bookingId: string, milestoneId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      tasksApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: milestoneKeys.list(bookingId) })

      // Snapshot previous value
      const previousMilestones = queryClient.getQueryData(milestoneKeys.list(bookingId))

      // Optimistically update task
      queryClient.setQueryData(milestoneKeys.list(bookingId), (old: any) => {
        if (!old?.milestones) return old
        return {
          ...old,
          milestones: old.milestones.map((m: any) => {
            if (!m.tasks) return m
            return {
              ...m,
              tasks: m.tasks.map((t: any) =>
                t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t
              ),
            }
          }),
        }
      })

      return { previousMilestones }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousMilestones) {
        queryClient.setQueryData(
          milestoneKeys.list(bookingId),
          context.previousMilestones
        )
      }
      handleApiError(error, {
        fallbackMessage: 'Failed to update task',
      })
    },
    onSuccess: () => {
      toast.success('Task updated successfully')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
    },
  })
}

/**
 * Deletes a task with optimistic updates
 */
export function useDeleteTask(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tasksApi.delete,
    onMutate: async (taskId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: milestoneKeys.list(bookingId) })

      // Snapshot previous value
      const previousMilestones = queryClient.getQueryData(milestoneKeys.list(bookingId))

      // Optimistically remove task
      queryClient.setQueryData(milestoneKeys.list(bookingId), (old: any) => {
        if (!old?.milestones) return old
        return {
          ...old,
          milestones: old.milestones.map((m: any) => {
            if (!m.tasks) return m
            return {
              ...m,
              tasks: m.tasks.filter((t: any) => t.id !== taskId),
            }
          }),
        }
      })

      return { previousMilestones }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousMilestones) {
        queryClient.setQueryData(
          milestoneKeys.list(bookingId),
          context.previousMilestones
        )
      }
      handleApiError(error, {
        fallbackMessage: 'Failed to delete task',
      })
    },
    onSuccess: () => {
      toast.success('Task deleted successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
    },
  })
}

/**
 * Updates task status with optimistic updates
 */
export function useUpdateTaskStatus(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: milestoneKeys.list(bookingId) })
      const previousMilestones = queryClient.getQueryData(milestoneKeys.list(bookingId))

      queryClient.setQueryData(milestoneKeys.list(bookingId), (old: any) => {
        if (!old?.milestones) return old
        return {
          ...old,
          milestones: old.milestones.map((m: any) => {
            if (!m.tasks) return m
            return {
              ...m,
              tasks: m.tasks.map((t: any) =>
                t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t
              ),
            }
          }),
        }
      })

      return { previousMilestones }
    },
    onError: (error, variables, context) => {
      if (context?.previousMilestones) {
        queryClient.setQueryData(
          milestoneKeys.list(bookingId),
          context.previousMilestones
        )
      }
      handleApiError(error, {
        fallbackMessage: 'Failed to update task status',
      })
    },
    onSuccess: () => {
      toast.success('Task status updated')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
    },
  })
}

