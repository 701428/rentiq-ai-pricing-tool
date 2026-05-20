import { create } from 'zustand'
import type { PricingResult, FeedbackEntry } from '../types'

interface PricingStore {
  // State
  pricingResult: PricingResult | null
  feedbackHistory: FeedbackEntry[]
  isLoading: boolean
  isFeedbackLoading: boolean
  lastAcknowledgment: string | null
  error: string | null
  page: 'home' | 'results'

  // Actions
  setPricingResult: (result: PricingResult) => void
  updatePricingResult: (result: PricingResult) => void
  addFeedbackEntry: (entry: FeedbackEntry) => void
  setLastAcknowledgment: (msg: string) => void
  setLoading: (val: boolean) => void
  setFeedbackLoading: (val: boolean) => void
  setError: (msg: string | null) => void
  setPage: (p: 'home' | 'results') => void
  reset: () => void
}

export const usePricingStore = create<PricingStore>((set) => ({
  pricingResult: null,
  feedbackHistory: [],
  isLoading: false,
  isFeedbackLoading: false,
  lastAcknowledgment: null,
  error: null,
  page: 'home',

  setPricingResult: (result) => set({ pricingResult: result, page: 'results' }),
  updatePricingResult: (result) => set({ pricingResult: result }),
  addFeedbackEntry: (entry) =>
    set((s) => ({ feedbackHistory: [...s.feedbackHistory, entry] })),
  setLastAcknowledgment: (msg) => set({ lastAcknowledgment: msg }),
  setLoading: (val) => set({ isLoading: val }),
  setFeedbackLoading: (val) => set({ isFeedbackLoading: val }),
  setError: (msg) => set({ error: msg }),
  setPage: (p) => set({ page: p }),
  reset: () =>
    set({
      pricingResult: null,
      feedbackHistory: [],
      isLoading: false,
      isFeedbackLoading: false,
      lastAcknowledgment: null,
      error: null,
      page: 'home',
    }),
}))
