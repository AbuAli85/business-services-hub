'use client'

export default function TestDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Test Dashboard
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Simple Test Page</h2>
          <p className="text-gray-600 mb-4">
            This is a simple test dashboard page to verify routing works.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-100 rounded border border-green-200">
              <p className="text-green-800">
                ✅ If you can see this page, routing to /dashboard/test is working!
              </p>
            </div>
            
            <div className="p-4 bg-blue-100 rounded border border-blue-200">
              <p className="text-blue-800">
                🔍 Check the console for any errors or authentication issues.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-100 rounded border border-yellow-200">
              <p className="text-yellow-800">
                📍 Current URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
