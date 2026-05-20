import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, MessageSquare, RotateCcw, Lightbulb } from 'lucide-react'
import { submitFeedback } from '../../api/client'
import { usePricingStore } from '../../store/pricingStore'

const SUGGESTED_PROMPTS = [
  'Remove properties with high flood risk',
  'Exclude the noisy comparables',
  'This area has better schools than the comparables',
  'The neighbourhood is up-and-coming, adjust upward',
  'Remove properties that have been on market too long',
  'Prioritise the closest properties',
]

export function FeedbackPanel() {
  const { pricingResult, feedbackHistory, updatePricingResult, addFeedbackEntry, setLastAcknowledgment, isFeedbackLoading, setFeedbackLoading } = usePricingStore()
  const [input, setInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedbackHistory])

  const handleSubmit = async (text: string) => {
    if (!text.trim() || !pricingResult) return
    setInput('')
    setFeedbackLoading(true)
    try {
      const result = await submitFeedback(pricingResult.session_id, text)
      updatePricingResult(result.updated_pricing)
      setLastAcknowledgment(result.acknowledgment)
      addFeedbackEntry({
        timestamp: new Date().toISOString(),
        user_text: text,
        acknowledgment: result.acknowledgment,
        adjustments: result.adjustments_applied,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setFeedbackLoading(false)
    }
  }

  return (
    <div className="card flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-gray-100">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-gray-900">Pricing Feedback</h2>
        <span className="ml-auto text-xs text-gray-400">Tell the AI what to adjust</span>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-64">
        {feedbackHistory.length === 0 ? (
          <div className="text-center py-4">
            <Lightbulb className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Give feedback to refine the price</p>
          </div>
        ) : (
          feedbackHistory.map((entry, i) => (
            <div key={i} className="space-y-1.5">
              {/* User message */}
              <div className="flex justify-end">
                <div className="max-w-xs bg-blue-600 text-white text-sm rounded-2xl rounded-tr-sm px-3 py-2">
                  {entry.user_text}
                </div>
              </div>
              {/* AI acknowledgment */}
              <div className="flex justify-start">
                <div className="max-w-xs bg-gray-100 text-gray-700 text-sm rounded-2xl rounded-tl-sm px-3 py-2">
                  {entry.acknowledgment}
                  {entry.adjustments.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {entry.adjustments.map((a, j) => (
                        <div key={j} className="text-xs text-gray-400">
                          {a.action === 'remove_comparable' && `↩ Removed ${a.comparable_ids.length} comparable(s)`}
                          {a.action === 'adjust_weight' && `⚖ Adjusted weight for ${a.comparable_ids.length} comparable(s)`}
                          {a.action === 'note_factor' && `📝 Noted: ${a.reasoning}`}
                          {a.action === 'update_learned_weight' && `🎓 Updated ${a.factor} importance`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested prompts */}
      <div className="px-4 py-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 mb-2">Quick suggestions:</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.slice(0, 4).map((p) => (
            <button
              key={p}
              onClick={() => handleSubmit(p)}
              disabled={isFeedbackLoading}
              className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-gray-600 rounded-full transition-colors disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit(input)}
            placeholder="e.g. Remove noisy properties..."
            className="input-field flex-1"
            disabled={isFeedbackLoading}
          />
          <button
            onClick={() => handleSubmit(input)}
            disabled={isFeedbackLoading || !input.trim()}
            className="btn-primary px-3 py-2 flex items-center gap-1"
          >
            {isFeedbackLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
