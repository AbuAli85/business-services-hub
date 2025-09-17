import { getSupabaseClient } from './supabase'

export interface OnboardingState {
  userId: string
  step: number
  totalSteps: number
  completedSteps: number[]
  formData: Record<string, any>
  lastSaved: string
  isComplete: boolean
}

export interface OnboardingStep {
  id: number
  title: string
  description: string
  required: boolean
  fields: string[]
  validation?: (data: any) => { isValid: boolean; errors: string[] }
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Basic Information',
    description: 'Tell us about yourself and your business',
    required: true,
    fields: ['companyName', 'billingPreference'],
    validation: (data) => {
      const errors: string[] = []
      if (!data.companyName?.trim()) {
        errors.push('Company name is required')
      }
      if (!data.billingPreference) {
        errors.push('Billing preference is required')
      }
      return { isValid: errors.length === 0, errors }
    }
  },
  {
    id: 2,
    title: 'Profile Details',
    description: 'Add your bio and profile information',
    required: false,
    fields: ['bio', 'profileImage'],
    validation: (data) => {
      const errors: string[] = []
      if (data.bio && data.bio.length > 500) {
        errors.push('Bio must be less than 500 characters')
      }
      return { isValid: errors.length === 0, errors }
    }
  },
  {
    id: 3,
    title: 'Professional Information',
    description: 'Add your skills and professional details',
    required: false,
    fields: ['skills', 'experience_years', 'education', 'languages'],
    validation: (data) => {
      const errors: string[] = []
      if (data.experience_years && (data.experience_years < 0 || data.experience_years > 50)) {
        errors.push('Experience years must be between 0 and 50')
      }
      return { isValid: errors.length === 0, errors }
    }
  }
]

export class OnboardingStateManager {
  private static readonly STORAGE_KEY = 'onboarding_state'
  private static readonly SAVE_INTERVAL = 30000 // 30 seconds

  static async saveState(state: Partial<OnboardingState>): Promise<void> {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get current state
      const currentState = await this.getState(user.id)
      const updatedState = {
        ...currentState,
        ...state,
        userId: user.id,
        lastSaved: new Date().toISOString()
      }

      // Save to localStorage for immediate access
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedState))
      }

      // Save to database for persistence
      const { error } = await supabase
        .from('onboarding_states')
        .upsert({
          user_id: user.id,
          state_data: updatedState,
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to save onboarding state:', error)
      }
    } catch (error) {
      console.error('Error saving onboarding state:', error)
    }
  }

  static async getState(userId: string): Promise<OnboardingState> {
    try {
      // Try localStorage first for immediate access
      if (typeof window !== 'undefined') {
        const localState = localStorage.getItem(this.STORAGE_KEY)
        if (localState) {
          const parsed = JSON.parse(localState)
          if (parsed.userId === userId) {
            return parsed
          }
        }
      }

      // Fallback to database
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('onboarding_states')
        .select('state_data')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load onboarding state:', error)
      }

      if (data?.state_data) {
        // Save to localStorage for future access
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data.state_data))
        }
        return data.state_data
      }

      // Return default state
      return this.getDefaultState(userId)
    } catch (error) {
      console.error('Error loading onboarding state:', error)
      return this.getDefaultState(userId)
    }
  }

  static getDefaultState(userId: string): OnboardingState {
    return {
      userId,
      step: 1,
      totalSteps: onboardingSteps.length,
      completedSteps: [],
      formData: {},
      lastSaved: new Date().toISOString(),
      isComplete: false
    }
  }

  static async updateStep(step: number, formData: Record<string, any>): Promise<{
    success: boolean
    errors: string[]
    canProceed: boolean
  }> {
    try {
      const stepConfig = onboardingSteps.find(s => s.id === step)
      if (!stepConfig) {
        return { success: false, errors: ['Invalid step'], canProceed: false }
      }

      // Validate step data
      const validation = stepConfig.validation?.(formData) || { isValid: true, errors: [] }
      
      if (!validation.isValid) {
        return { success: false, errors: validation.errors, canProceed: false }
      }

      // Get current state
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { success: false, errors: ['User not authenticated'], canProceed: false }
      }

      const currentState = await this.getState(user.id)
      
      // Update state
      const updatedState = {
        ...currentState,
        step: step + 1,
        completedSteps: [...currentState.completedSteps, step],
        formData: { ...currentState.formData, ...formData },
        lastSaved: new Date().toISOString()
      }

      // Save state
      await this.saveState(updatedState)

      return { success: true, errors: [], canProceed: true }
    } catch (error) {
      console.error('Error updating onboarding step:', error)
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error'], 
        canProceed: false 
      }
    }
  }

  static async completeOnboarding(): Promise<{
    success: boolean
    errors: string[]
  }> {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { success: false, errors: ['User not authenticated'] }
      }

      const currentState = await this.getState(user.id)
      
      // Mark as complete
      const completedState = {
        ...currentState,
        isComplete: true,
        lastSaved: new Date().toISOString()
      }

      await this.saveState(completedState)

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.STORAGE_KEY)
      }

      return { success: true, errors: [] }
    } catch (error) {
      console.error('Error completing onboarding:', error)
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      }
    }
  }

  static async getProgress(userId: string): Promise<{
    currentStep: number
    totalSteps: number
    completedSteps: number[]
    completionPercentage: number
    canProceed: boolean
  }> {
    const state = await this.getState(userId)
    const completionPercentage = Math.round((state.completedSteps.length / state.totalSteps) * 100)
    
    return {
      currentStep: state.step,
      totalSteps: state.totalSteps,
      completedSteps: state.completedSteps,
      completionPercentage,
      canProceed: state.completedSteps.length > 0
    }
  }

  static async resumeOnboarding(userId: string): Promise<{
    step: number
    formData: Record<string, any>
    canResume: boolean
  }> {
    const state = await this.getState(userId)
    
    return {
      step: state.step,
      formData: state.formData,
      canResume: !state.isComplete && state.completedSteps.length > 0
    }
  }

  // Auto-save functionality
  static startAutoSave(userId: string, formData: Record<string, any>): () => void {
    const interval = setInterval(async () => {
      try {
        await this.saveState({ formData })
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, this.SAVE_INTERVAL)

    return () => clearInterval(interval)
  }
}
