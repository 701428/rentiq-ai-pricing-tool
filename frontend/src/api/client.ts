import axios from 'axios'
import type { PropertyInput, PricingResult, FeedbackResult, FeedbackEntry } from '../types'

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

export const analyzeProperty = async (input: PropertyInput): Promise<PricingResult> => {
  const { data } = await api.post('/pricing/analyze', input)
  return data
}

export const removeComparable = async (sessionId: string, comparableId: string): Promise<PricingResult> => {
  const { data } = await api.post('/comparables/remove', {
    session_id: sessionId,
    comparable_id: comparableId,
  })
  return data
}

export const restoreComparable = async (sessionId: string, comparableId: string): Promise<PricingResult> => {
  const { data } = await api.post('/comparables/restore', {
    session_id: sessionId,
    comparable_id: comparableId,
  })
  return data
}

export const adjustWeight = async (sessionId: string, comparableId: string, weight: number): Promise<PricingResult> => {
  const { data } = await api.post('/comparables/adjust-weight', {
    session_id: sessionId,
    comparable_id: comparableId,
    weight,
  })
  return data
}

export const submitFeedback = async (sessionId: string, feedbackText: string): Promise<FeedbackResult> => {
  const { data } = await api.post('/feedback/submit', {
    session_id: sessionId,
    feedback_text: feedbackText,
  })
  return data
}

export const getFeedbackHistory = async (sessionId: string): Promise<FeedbackEntry[]> => {
  const { data } = await api.get(`/feedback/history/${sessionId}`)
  return data
}
