/**
 * Profile Fetch Optimizer
 * 
 * This module optimizes profile fetching to avoid PostgreSQL stack depth limit exceeded errors
 * by implementing batching, retry logic, and fallback mechanisms.
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface Profile {
  id: string
  full_name: string
  email: string
}

interface ProfileFetchOptions {
  batchSize?: number
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

export class ProfileFetchOptimizer {
  private static readonly DEFAULT_OPTIONS: Required<ProfileFetchOptions> = {
    batchSize: 25, // Smaller batches to avoid stack depth issues
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    timeout: 10000 // 10 seconds
  }

  /**
   * Fetch profiles with optimization to avoid stack depth issues
   */
  static async fetchProfiles(
    supabase: SupabaseClient,
    userIds: string[],
    options: ProfileFetchOptions = {}
  ): Promise<{ profiles: Profile[]; errors: any[] }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options }
    const profiles: Profile[] = []
    const errors: any[] = []

    if (userIds.length === 0) {
      return { profiles, errors }
    }

    // Remove duplicates and filter out invalid IDs
    const uniqueUserIds = Array.from(new Set(userIds)).filter(id => 
      id && typeof id === 'string' && id.length > 0
    )

    if (uniqueUserIds.length === 0) {
      return { profiles, errors }
    }

    console.log(`🔍 Fetching profiles for ${uniqueUserIds.length} users in batches of ${opts.batchSize}`)

    // Split into batches
    const batches = this.createBatches(uniqueUserIds, opts.batchSize)

    // Process batches sequentially to avoid overwhelming the database
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`📦 Processing profile batch ${i + 1}/${batches.length} (${batch.length} users)`)

      try {
        const batchResult = await this.fetchBatchWithRetry(
          supabase,
          batch,
          opts
        )

        profiles.push(...batchResult.profiles)
        errors.push(...batchResult.errors)

        // Add small delay between batches to reduce database load
        if (i < batches.length - 1) {
          await this.delay(100)
        }
      } catch (error) {
        console.error(`❌ Failed to process profile batch ${i + 1}:`, error)
        errors.push({
          batch: i + 1,
          userIds: batch,
          error: error
        })
      }
    }

    console.log(`✅ Profile fetch completed: ${profiles.length} profiles, ${errors.length} errors`)
    return { profiles, errors }
  }

  /**
   * Fetch a single batch with retry logic
   */
  private static async fetchBatchWithRetry(
    supabase: SupabaseClient,
    userIds: string[],
    options: Required<ProfileFetchOptions>
  ): Promise<{ profiles: Profile[]; errors: any[] }> {
    const profiles: Profile[] = []
    const errors: any[] = []

    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${options.maxRetries} for batch of ${userIds.length} users`)

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)

        if (error) {
          throw error
        }

        if (data && data.length > 0) {
          profiles.push(...data)
          console.log(`✅ Successfully fetched ${data.length} profiles`)
          return { profiles, errors }
        } else {
          console.log(`⚠️ No profiles found for batch`)
          return { profiles, errors }
        }
      } catch (error: any) {
        console.warn(`⚠️ Attempt ${attempt} failed:`, error.message)

        // Check if it's a stack depth error
        if (error.code === '54001' || error.message.includes('stack depth')) {
          console.log('🔄 Stack depth error detected, trying smaller batch...')
          
          // Try with even smaller batches
          if (userIds.length > 5) {
            const smallerBatches = this.createBatches(userIds, Math.max(1, Math.floor(userIds.length / 2)))
            for (const smallerBatch of smallerBatches) {
              const result = await this.fetchBatchWithRetry(supabase, smallerBatch, options)
              profiles.push(...result.profiles)
              errors.push(...result.errors)
            }
            return { profiles, errors }
          }
        }

        // If this is the last attempt, try individual lookups as fallback
        if (attempt === options.maxRetries) {
          console.log('🔄 All batch attempts failed, trying individual lookups...')
          return await this.fetchIndividualProfiles(supabase, userIds)
        }

        // Wait before retry
        await this.delay(options.retryDelay * attempt)
      }
    }

    return { profiles, errors }
  }

  /**
   * Fallback: Fetch profiles individually
   */
  private static async fetchIndividualProfiles(
    supabase: SupabaseClient,
    userIds: string[]
  ): Promise<{ profiles: Profile[]; errors: any[] }> {
    const profiles: Profile[] = []
    const errors: any[] = []

    console.log(`🔄 Fetching ${userIds.length} profiles individually as fallback...`)

    for (const userId of userIds) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', userId)
          .single()

        if (error) {
          console.warn(`⚠️ Failed to fetch profile for user ${userId}:`, error.message)
          errors.push({ userId, error })
        } else if (data) {
          profiles.push(data)
        }

        // Small delay between individual requests
        await this.delay(50)
      } catch (error) {
        console.warn(`⚠️ Exception fetching profile for user ${userId}:`, error)
        errors.push({ userId, error })
      }
    }

    console.log(`✅ Individual fetch completed: ${profiles.length} profiles, ${errors.length} errors`)
    return { profiles, errors }
  }

  /**
   * Create batches from an array
   */
  private static createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Delay utility
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get profile statistics
   */
  static getStats(profiles: Profile[], errors: any[]): {
    totalRequested: number
    totalFetched: number
    successRate: number
    errorCount: number
  } {
    const totalRequested = profiles.length + errors.length
    const totalFetched = profiles.length
    const successRate = totalRequested > 0 ? (totalFetched / totalRequested) * 100 : 0

    return {
      totalRequested,
      totalFetched,
      successRate: Math.round(successRate * 100) / 100,
      errorCount: errors.length
    }
  }
}

export default ProfileFetchOptimizer
