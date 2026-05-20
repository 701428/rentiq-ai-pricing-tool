import { Header } from './components/layout/Header'
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'
import { usePricingStore } from './store/pricingStore'

function App() {
  const { page } = usePricingStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {page === 'home' ? <HomePage /> : <ResultsPage />}
    </div>
  )
}

export default App
