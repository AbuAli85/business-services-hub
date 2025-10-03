/**
 * Dashboard diagnostics utility
 * Helps identify common issues with dashboard loading and authentication
 */

import { getSupabaseClient } from './supabase-client'
import { profileManager } from './profile-manager'

export interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

export class DashboardDiagnostics {
  static async runAllDiagnostics(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = []
    
    // Test 1: Supabase Client
    results.push(await this.testSupabaseClient())
    
    // Test 2: Session Check
    results.push(await this.testSessionCheck())
    
    // Test 3: Profile Manager
    results.push(await this.testProfileManager())
    
    // Test 4: Local Storage
    results.push(this.testLocalStorage())
    
    // Test 5: Network Connectivity
    results.push(await this.testNetworkConnectivity())
    
    return results
  }

  private static async testSupabaseClient(): Promise<DiagnosticResult> {
    try {
      const supabase = await getSupabaseClient()
      if (!supabase) {
        return {
          test: 'Supabase Client',
          status: 'fail',
          message: 'Failed to initialize Supabase client'
        }
      }
      
      return {
        test: 'Supabase Client',
        status: 'pass',
        message: 'Supabase client initialized successfully'
      }
    } catch (error) {
      return {
        test: 'Supabase Client',
        status: 'fail',
        message: 'Error initializing Supabase client',
        details: error
      }
    }
  }

  private static async testSessionCheck(): Promise<DiagnosticResult> {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        return {
          test: 'Session Check',
          status: 'fail',
          message: 'Error checking session',
          details: error.message
        }
      }
      
      if (!session) {
        return {
          test: 'Session Check',
          status: 'warning',
          message: 'No active session found'
        }
      }
      
      return {
        test: 'Session Check',
        status: 'pass',
        message: 'Active session found',
        details: {
          userId: session.user.id,
          email: session.user.email,
          role: session.user.user_metadata?.role
        }
      }
    } catch (error) {
      return {
        test: 'Session Check',
        status: 'fail',
        message: 'Exception during session check',
        details: error
      }
    }
  }

  private static async testProfileManager(): Promise<DiagnosticResult> {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return {
          test: 'Profile Manager',
          status: 'warning',
          message: 'Cannot test profile manager without session'
        }
      }
      
      const profile = await profileManager.getUserProfile(session.user.id)
      
      if (!profile) {
        return {
          test: 'Profile Manager',
          status: 'warning',
          message: 'No profile found for user'
        }
      }
      
      return {
        test: 'Profile Manager',
        status: 'pass',
        message: 'Profile manager working correctly',
        details: {
          profileId: profile.id,
          fullName: profile.full_name,
          role: profile.role,
          profileCompleted: profile.profile_completed
        }
      }
    } catch (error) {
      return {
        test: 'Profile Manager',
        status: 'fail',
        message: 'Error testing profile manager',
        details: error
      }
    }
  }

  private static testLocalStorage(): DiagnosticResult {
    try {
      if (typeof window === 'undefined') {
        return {
          test: 'Local Storage',
          status: 'warning',
          message: 'Local storage not available (server-side)'
        }
      }
      
      const testKey = 'dashboard-diagnostics-test'
      const testValue = 'test-value'
      
      localStorage.setItem(testKey, testValue)
      const retrieved = localStorage.getItem(testKey)
      localStorage.removeItem(testKey)
      
      if (retrieved !== testValue) {
        return {
          test: 'Local Storage',
          status: 'fail',
          message: 'Local storage read/write test failed'
        }
      }
      
      return {
        test: 'Local Storage',
        status: 'pass',
        message: 'Local storage working correctly'
      }
    } catch (error) {
      return {
        test: 'Local Storage',
        status: 'fail',
        message: 'Local storage error',
        details: error
      }
    }
  }

  private static async testNetworkConnectivity(): Promise<DiagnosticResult> {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        return {
          test: 'Network Connectivity',
          status: 'warning',
          message: 'API health check failed',
          details: `Status: ${response.status}`
        }
      }
      
      return {
        test: 'Network Connectivity',
        status: 'pass',
        message: 'Network connectivity working'
      }
    } catch (error) {
      return {
        test: 'Network Connectivity',
        status: 'warning',
        message: 'Network connectivity test failed',
        details: error
      }
    }
  }

  static printResults(results: DiagnosticResult[]): void {
    console.group('🔍 Dashboard Diagnostics Results')
    
    results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️'
      console.log(`${icon} ${result.test}: ${result.message}`)
      
      if (result.details) {
        console.log('   Details:', result.details)
      }
    })
    
    const passCount = results.filter(r => r.status === 'pass').length
    const failCount = results.filter(r => r.status === 'fail').length
    const warnCount = results.filter(r => r.status === 'warning').length
    
    console.log(`\n📊 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`)
    console.groupEnd()
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).runDashboardDiagnostics = async () => {
    const results = await DashboardDiagnostics.runAllDiagnostics()
    DashboardDiagnostics.printResults(results)
    return results
  }
}
