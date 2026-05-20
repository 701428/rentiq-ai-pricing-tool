import { PropertyForm } from '../components/property-form/PropertyForm'
import { usePricingStore } from '../store/pricingStore'

export function HomePage() {
  const { error } = usePricingStore()
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
      <PropertyForm />
    </main>
  )
}
