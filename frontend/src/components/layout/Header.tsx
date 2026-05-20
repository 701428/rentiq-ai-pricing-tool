import { Building2, ChevronLeft } from 'lucide-react'
import { usePricingStore } from '../../store/pricingStore'

export function Header() {
  const { page, reset } = usePricingStore()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {page === 'results' && (
              <button
                onClick={reset}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors mr-1"
                title="Back to search"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-gray-900 text-lg">RentIQ</span>
                <span className="ml-2 text-xs text-gray-500 font-medium uppercase tracking-wide">AI Pricing</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              AI Powered
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
