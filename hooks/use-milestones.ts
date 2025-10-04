/**
 * React Query hooks for milestone data management
 * Provides caching, automatic refetching, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { milestonesApi, handleApiError } from '@/lib/api-client'
import { toast } from 'sonner'

// ============================================================================
// Query Keys
// ============================================================================

export const milestoneKeys = {
  all: ['milestones'] as const,
  lists: () => [...milestoneKeys.all, 'list'] as const,
  list: (bookingId: string) => [...milestoneKeys.lists(), bookingId] as const,
  details: () => [...milestoneKeys.all, 'detail'] as const,
  detail: (id: string) => [...milestoneKeys.details(), id] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetches all milestones for a booking with automatic caching
 */
export function useMilestones(bookingId: string) {
  return useQuery({
    queryKey: milestoneKeys.list(bookingId),
    queryFn: () => milestonesApi.getAll(bookingId),
    enabled: !!bookingId, // Only run if bookingId exists
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  })
}

/**
 * Fetches a single milestone by ID
 */
export function useMilestone(milestoneId: string) {
  return useQuery({
    queryKey: milestoneKeys.detail(milestoneId),
    queryFn: () => milestonesApi.getById(milestoneId),
    enabled: !!milestoneId,
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Creates a new milestone with optimistic updates
 */
export function useCreateMilestone(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: milestonesApi.create,
    onSuccess: () => {
      // Invalidate and refetch milestones
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
      toast.success('Milestone created successfully')
    },
    onError: (error) => {
      handleApiError(error, {
        fallbackMessage: 'Failed to create milestone',
      })
    },
  })
}

/**
 * Updates a milestone with optimistic updates
 */
export function useUpdateMilestone(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      milestonesApi.update(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: milestoneKeys.list(bookingId) })

      // Snapshot previous value
      const previousMilestones = queryClient.getQueryData(milestoneKeys.list(bookingId))

      // Optimistically update
      queryClient.setQueryData(milestoneKeys.list(bookingId), (old: any) => {
        if (!old?.milestones) return old
        return {
          ...old,
          milestones: old.milestones.map((m: any) =>
            m.id === id ? { ...m, ...data, updated_at: new Date().toISOString() } : m
          ),
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
        fallbackMessage: 'Failed to update milestone',
      })
    },
    onSuccess: () => {
      toast.success('Milestone updated successfully')
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
    },
  })
}

/**
 * Deletes a milestone with optimistic updates
 */
export function useDeleteMilestone(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: milestonesApi.delete,
    onMutate: async (milestoneId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: milestoneKeys.list(bookingId) })

      // Snapshot previous value
      const previousMilestones = queryClient.getQueryData(milestoneKeys.list(bookingId))

      // Optimistically remove
      queryClient.setQueryData(milestoneKeys.list(bookingId), (old: any) => {
        if (!old?.milestones) return old
        return {
          ...old,
          milestones: old.milestones.filter((m: any) => m.id !== milestoneId),
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
        fallbackMessage: 'Failed to delete milestone',
      })
    },
    onSuccess: () => {
      toast.success('Milestone deleted successfully')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
    },
  })
}

/**
 * Approves or rejects a milestone
 */
export function useApproveMilestone(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: milestonesApi.approve,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
      toast.success(
        `Milestone ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`
      )
    },
    onError: (error, variables) => {
      handleApiError(error, {
        fallbackMessage: `Failed to ${variables.action} milestone`,
      })
    },
  })
}

/**
 * Adds a comment to a milestone
 */
export function useAddMilestoneComment(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: milestonesApi.addComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
      toast.success('Comment added successfully')
    },
    onError: (error) => {
      handleApiError(error, {
        fallbackMessage: 'Failed to add comment',
      })
    },
  })
}

/**
 * Seeds recommended milestones
 */
export function useSeedMilestones(bookingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ plan }: { plan?: string }) => milestonesApi.seed(bookingId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.list(bookingId) })
      toast.success('Recommended milestones created successfully')
    },
    onError: (error) => {
      handleApiError(error, {
        fallbackMessage: 'Failed to create recommended milestones',
      })
    },
  })
}

