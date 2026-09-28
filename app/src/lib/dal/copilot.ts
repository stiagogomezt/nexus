// ============================================================
// NEXUS FINANCE — DAL: Proactive Copilot & Conversation Storage
// Manages AI conversation threads, message history, and user preferences
// Pure user isolation, Supabase client with local memory fallback.
// ============================================================

import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type {
  AIConversationRecord,
  AIMessageRecord,
  CopilotPreferences,
} from '@/types/copilot'
import { DEFAULT_COPILOT_PREFERENCES } from '@/types/copilot'

const conversationsStorage = createTableStorage<AIConversationRecord>('ai_conversations', {})
const messagesStorage = createTableStorage<AIMessageRecord>('ai_messages', {})
const preferencesStorage = createTableStorage<CopilotPreferences & { id: string }>('copilot_preferences', {})

// ─────────────────────────────────────────────
// 1. AI CONVERSATIONS
// ─────────────────────────────────────────────

export async function getAIConversations(userId: string): Promise<AIConversationRecord[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching AI conversations from Supabase:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  const list = conversationsStorage.getAll(userId)
  list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  return list
}

export async function createAIConversation(
  userId: string,
  title: string = 'Conversación Financiera',
  contextSnapshot: Record<string, unknown> = {}
): Promise<AIConversationRecord> {
  const newConversation: AIConversationRecord = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    title,
    context_snapshot: contextSnapshot,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert(newConversation)
      .select()
      .single()

    if (error) {
      console.error('Error creating AI conversation in Supabase:', error)
      throw new Error(error.message)
    }

    return data
  }

  conversationsStorage.insert(userId, newConversation)
  return newConversation
}

export async function deleteAIConversation(userId: string, conversationId: string): Promise<boolean> {
  const supabase = createClient()
  if (supabase) {
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting AI conversation from Supabase:', error)
      throw new Error(error.message)
    }
    return true
  }

  return conversationsStorage.delete(userId, conversationId)
}

// ─────────────────────────────────────────────
// 2. AI MESSAGES
// ─────────────────────────────────────────────

export async function getAIMessages(
  userId: string,
  conversationId: string
): Promise<AIMessageRecord[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching AI messages from Supabase:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  const list = messagesStorage
    .getAll(userId)
    .filter((m) => m.conversation_id === conversationId)
  list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  return list
}

export async function saveAIMessage(
  userId: string,
  message: Omit<AIMessageRecord, 'id' | 'user_id' | 'created_at'> & { id?: string; created_at?: string }
): Promise<AIMessageRecord> {
  const newMessage: AIMessageRecord = {
    id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    conversation_id: message.conversation_id,
    user_id: userId,
    role: message.role,
    content: message.content,
    explanation_payload: message.explanation_payload || null,
    scenario_params: message.scenario_params || null,
    tools_executed: message.tools_executed || [],
    created_at: message.created_at || new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('ai_messages')
      .insert(newMessage)
      .select()
      .single()

    if (error) {
      console.error('Error saving AI message to Supabase:', error)
      throw new Error(error.message)
    }

    return data
  }

  messagesStorage.insert(userId, newMessage)
  return newMessage
}

// ─────────────────────────────────────────────
// 3. COPILOT NOTIFICATION PREFERENCES
// ─────────────────────────────────────────────

export async function getCopilotPreferences(userId: string): Promise<CopilotPreferences> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('copilot_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching copilot preferences from Supabase:', error)
      throw new Error(error.message)
    }

    if (data) {
      return {
        user_id: data.user_id,
        daily_brief_enabled: Boolean(data.daily_brief_enabled),
        weekly_review_enabled: Boolean(data.weekly_review_enabled),
        budget_alerts_enabled: Boolean(data.budget_alerts_enabled),
        goal_alerts_enabled: Boolean(data.goal_alerts_enabled),
        debt_alerts_enabled: Boolean(data.debt_alerts_enabled),
        liquidity_alerts_enabled: Boolean(data.liquidity_alerts_enabled),
        crypto_alerts_enabled: Boolean(data.crypto_alerts_enabled),
        banking_alerts_enabled: Boolean(data.banking_alerts_enabled),
        updated_at: data.updated_at,
      }
    }
  }

  const existing = preferencesStorage.getAll(userId).find((p) => p.user_id === userId)
  if (existing) return existing

  const initial: CopilotPreferences & { id: string } = {
    ...DEFAULT_COPILOT_PREFERENCES,
    id: userId,
    user_id: userId,
  }
  preferencesStorage.insert(userId, initial)
  return initial
}

export async function updateCopilotPreferences(
  userId: string,
  updates: Partial<CopilotPreferences>
): Promise<CopilotPreferences> {
  const current = await getCopilotPreferences(userId)
  const merged: CopilotPreferences = {
    ...current,
    ...updates,
    user_id: userId,
    updated_at: new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('copilot_preferences')
      .upsert(merged)
      .select()
      .single()

    if (error) {
      console.error('Error updating copilot preferences in Supabase:', error)
      throw new Error(error.message)
    }

    return data
  }

  preferencesStorage.update(userId, userId, { ...merged, id: userId })
  return merged
}

export const upsertCopilotPreferences = updateCopilotPreferences

// Convenient aliases
export const createConversation = createAIConversation
export const getConversations = getAIConversations
export const deleteConversation = deleteAIConversation
export const getMessages = getAIMessages
export async function addMessage(
  userId: string,
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<AIMessageRecord> {
  return saveAIMessage(userId, { conversation_id: conversationId, role, content })
}
