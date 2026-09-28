import { createClient } from '@/lib/supabase/client'
import { createTableStorage } from './storage-fallback'
import type {
  FinancialEvent,
  FinancialAlert,
  IntelligenceInsight,
  AlertPreferences,
  AlertStatus,
  EventCategory,
  AlertSeverity,
} from '@/types/intelligence'
import { DEFAULT_ALERT_PREFERENCES, DEFAULT_INTELLIGENCE_THRESHOLDS } from '@/types/intelligence'
export { DEFAULT_ALERT_PREFERENCES, DEFAULT_INTELLIGENCE_THRESHOLDS }

const eventsStorage = createTableStorage<FinancialEvent>('financial_events', {})
const alertsStorage = createTableStorage<FinancialAlert>('financial_alerts', {})
const insightsStorage = createTableStorage<IntelligenceInsight>('financial_insights', {})
const preferencesStorage = createTableStorage<AlertPreferences & { id: string }>('alert_preferences', {})

// ─────────────────────────────────────────────
// 1. FINANCIAL EVENTS
// ─────────────────────────────────────────────

export async function getFinancialEvents(
  userId: string,
  filters?: { category?: EventCategory; severity?: AlertSeverity; limit?: number }
): Promise<FinancialEvent[]> {
  const supabase = createClient()
  if (supabase) {
    let query = supabase
      .from('financial_events')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error fetching financial events from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      category: row.category,
      severity: row.severity,
      title: row.title,
      description: row.description,
      metric: row.metric,
      current_value: Number(row.current_value),
      previous_value: Number(row.previous_value),
      delta: row.delta_payload,
      source: row.source,
      timestamp: row.timestamp,
      metadata: row.metadata,
    }))
  }

  let list = eventsStorage.getAll(userId)
  if (filters?.category) {
    list = list.filter((e) => e.category === filters.category)
  }
  if (filters?.severity) {
    list = list.filter((e) => e.severity === filters.severity)
  }
  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  if (filters?.limit) {
    list = list.slice(0, filters.limit)
  }
  return list
}

export async function saveFinancialEvent(
  userId: string,
  event: Omit<FinancialEvent, 'id' | 'user_id' | 'timestamp'> & { timestamp?: string; id?: string }
): Promise<FinancialEvent> {
  const newEvent: FinancialEvent = {
    id: event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    user_id: userId,
    type: event.type,
    category: event.category,
    severity: event.severity,
    title: event.title,
    description: event.description,
    metric: event.metric,
    current_value: event.current_value,
    previous_value: event.previous_value,
    delta: event.delta,
    source: event.source,
    timestamp: event.timestamp || new Date().toISOString(),
    metadata: event.metadata || {},
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('financial_events')
      .insert({
        id: newEvent.id,
        user_id: userId,
        type: newEvent.type,
        category: newEvent.category,
        severity: newEvent.severity,
        title: newEvent.title,
        description: newEvent.description,
        metric: newEvent.metric,
        current_value: newEvent.current_value,
        previous_value: newEvent.previous_value,
        delta_payload: newEvent.delta || {},
        source: newEvent.source,
        timestamp: newEvent.timestamp,
        metadata: newEvent.metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving financial event to Supabase:', error)
      throw new Error(error.message)
    }

    return {
      id: data.id,
      user_id: data.user_id,
      type: data.type,
      category: data.category,
      severity: data.severity,
      title: data.title,
      description: data.description,
      metric: data.metric,
      current_value: Number(data.current_value),
      previous_value: Number(data.previous_value),
      delta: data.delta_payload,
      source: data.source,
      timestamp: data.timestamp,
      metadata: data.metadata,
    }
  }

  eventsStorage.insert(userId, newEvent)
  return newEvent
}

// ─────────────────────────────────────────────
// 2. FINANCIAL ALERTS
// ─────────────────────────────────────────────

export async function getFinancialAlerts(
  userId: string,
  statusFilter?: AlertStatus | 'ALL'
): Promise<FinancialAlert[]> {
  const supabase = createClient()
  if (supabase) {
    let query = supabase
      .from('financial_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error fetching financial alerts from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      event_id: row.event_id,
      type: row.type,
      date: row.date,
      severity: row.severity,
      title: row.title,
      description: row.description,
      metric: row.metric,
      current_value: Number(row.current_value),
      previous_value: Number(row.previous_value),
      delta: Number(row.delta),
      source: row.source,
      status: row.status,
      created_at: row.created_at,
    }))
  }

  let list = alertsStorage.getAll(userId)
  if (statusFilter && statusFilter !== 'ALL') {
    list = list.filter((a) => a.status === statusFilter)
  }
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return list
}

export async function saveFinancialAlert(
  userId: string,
  alert: Omit<FinancialAlert, 'id' | 'user_id' | 'created_at'> & { created_at?: string; id?: string }
): Promise<FinancialAlert> {
  const newAlert: FinancialAlert = {
    id: alert.id || `alt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    user_id: userId,
    event_id: alert.event_id,
    type: alert.type,
    date: alert.date || new Date().toISOString().split('T')[0],
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    metric: alert.metric,
    current_value: alert.current_value,
    previous_value: alert.previous_value,
    delta: alert.delta,
    source: alert.source,
    status: alert.status || 'UNREAD',
    created_at: alert.created_at || new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('financial_alerts')
      .insert({
        id: newAlert.id,
        user_id: userId,
        event_id: newAlert.event_id,
        type: newAlert.type,
        date: newAlert.date,
        severity: newAlert.severity,
        title: newAlert.title,
        description: newAlert.description,
        metric: newAlert.metric,
        current_value: newAlert.current_value,
        previous_value: newAlert.previous_value,
        delta: newAlert.delta,
        source: newAlert.source,
        status: newAlert.status,
        created_at: newAlert.created_at,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving financial alert to Supabase:', error)
      throw new Error(error.message)
    }

    return {
      id: data.id,
      user_id: data.user_id,
      event_id: data.event_id,
      type: data.type,
      date: data.date,
      severity: data.severity,
      title: data.title,
      description: data.description,
      metric: data.metric,
      current_value: Number(data.current_value),
      previous_value: Number(data.previous_value),
      delta: Number(data.delta),
      source: data.source,
      status: data.status,
      created_at: data.created_at,
    }
  }

  alertsStorage.insert(userId, newAlert)
  return newAlert
}

export async function updateAlertStatus(
  userId: string,
  alertId: string,
  status: AlertStatus
): Promise<FinancialAlert | null> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('financial_alerts')
      .update({ status })
      .eq('id', alertId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating financial alert in Supabase:', error)
      throw new Error(error.message)
    }

    if (!data) return null
    return {
      id: data.id,
      user_id: data.user_id,
      event_id: data.event_id,
      type: data.type,
      date: data.date,
      severity: data.severity,
      title: data.title,
      description: data.description,
      metric: data.metric,
      current_value: Number(data.current_value),
      previous_value: Number(data.previous_value),
      delta: Number(data.delta),
      source: data.source,
      status: data.status,
      created_at: data.created_at,
    }
  }

  return alertsStorage.update(userId, alertId, { status })
}

export async function dismissAlert(
  userId: string,
  alertId: string
): Promise<FinancialAlert | null> {
  return updateAlertStatus(userId, alertId, 'DISMISSED')
}

// ─────────────────────────────────────────────
// 3. FINANCIAL INSIGHTS
// ─────────────────────────────────────────────

export async function getIntelligenceInsights(userId: string): Promise<IntelligenceInsight[]> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('financial_insights')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Error fetching financial insights from Supabase:', error)
      throw new Error(error.message)
    }

    return (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      area: row.area,
      fact: row.fact,
      change: row.change,
      interpretation: row.interpretation,
      confidence: row.confidence,
      impact: row.impact,
      timestamp: row.timestamp,
    }))
  }

  const list = insightsStorage.getAll(userId)
  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return list
}

export async function saveIntelligenceInsight(
  userId: string,
  insight: Omit<IntelligenceInsight, 'id' | 'user_id' | 'timestamp'> & { timestamp?: string; id?: string }
): Promise<IntelligenceInsight> {
  const newInsight: IntelligenceInsight = {
    id: insight.id || `ins_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    user_id: userId,
    area: insight.area,
    fact: insight.fact,
    change: insight.change,
    interpretation: insight.interpretation,
    confidence: insight.confidence || 'high',
    impact: insight.impact || 'neutral',
    timestamp: insight.timestamp || new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('financial_insights')
      .insert({
        id: newInsight.id,
        user_id: userId,
        area: newInsight.area,
        fact: newInsight.fact,
        change: newInsight.change,
        interpretation: newInsight.interpretation,
        confidence: newInsight.confidence,
        impact: newInsight.impact,
        timestamp: newInsight.timestamp,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving financial insight to Supabase:', error)
      throw new Error(error.message)
    }

    return {
      id: data.id,
      user_id: data.user_id,
      area: data.area,
      fact: data.fact,
      change: data.change,
      interpretation: data.interpretation,
      confidence: data.confidence,
      impact: data.impact,
      timestamp: data.timestamp,
    }
  }

  insightsStorage.insert(userId, newInsight)
  return newInsight
}

// ─────────────────────────────────────────────
// 4. ALERT PREFERENCES
// ─────────────────────────────────────────────

export async function getAlertPreferences(userId: string): Promise<AlertPreferences> {
  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('alert_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching alert preferences from Supabase:', error)
      throw new Error(error.message)
    }

    if (data) {
      return {
        user_id: data.user_id,
        budget_alerts_enabled: Boolean(data.budget_alerts_enabled),
        debt_alerts_enabled: Boolean(data.debt_alerts_enabled),
        liquidity_alerts_enabled: Boolean(data.liquidity_alerts_enabled),
        crypto_alerts_enabled: Boolean(data.crypto_alerts_enabled),
        goals_alerts_enabled: Boolean(data.goals_alerts_enabled),
        betting_alerts_enabled: Boolean(data.betting_alerts_enabled),
        income_alerts_enabled: Boolean(data.income_alerts_enabled),
        thresholds: {
          ...DEFAULT_ALERT_PREFERENCES.thresholds,
          ...(data.thresholds || {}),
        },
        updated_at: data.updated_at,
      }
    }
  }

  const existing = preferencesStorage.getAll(userId).find((p) => p.user_id === userId)
  if (existing) return existing

  const initial: AlertPreferences & { id: string } = {
    ...DEFAULT_ALERT_PREFERENCES,
    id: userId,
    user_id: userId,
  }
  preferencesStorage.insert(userId, initial)
  return initial
}

export async function updateAlertPreferences(
  userId: string,
  updates: Partial<AlertPreferences>
): Promise<AlertPreferences> {
  const current = await getAlertPreferences(userId)
  const merged: AlertPreferences = {
    ...current,
    ...updates,
    thresholds: {
      ...current.thresholds,
      ...(updates.thresholds || {}),
    },
    user_id: userId,
    updated_at: new Date().toISOString(),
  }

  const supabase = createClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('alert_preferences')
      .upsert({
        user_id: userId,
        budget_alerts_enabled: merged.budget_alerts_enabled,
        debt_alerts_enabled: merged.debt_alerts_enabled,
        liquidity_alerts_enabled: merged.liquidity_alerts_enabled,
        crypto_alerts_enabled: merged.crypto_alerts_enabled,
        goals_alerts_enabled: merged.goals_alerts_enabled,
        betting_alerts_enabled: merged.betting_alerts_enabled,
        income_alerts_enabled: merged.income_alerts_enabled,
        thresholds: merged.thresholds,
        updated_at: merged.updated_at,
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating alert preferences in Supabase:', error)
      throw new Error(error.message)
    }

    return {
      user_id: data.user_id,
      budget_alerts_enabled: Boolean(data.budget_alerts_enabled),
      debt_alerts_enabled: Boolean(data.debt_alerts_enabled),
      liquidity_alerts_enabled: Boolean(data.liquidity_alerts_enabled),
      crypto_alerts_enabled: Boolean(data.crypto_alerts_enabled),
      goals_alerts_enabled: Boolean(data.goals_alerts_enabled),
      betting_alerts_enabled: Boolean(data.betting_alerts_enabled),
      income_alerts_enabled: Boolean(data.income_alerts_enabled),
      thresholds: data.thresholds,
      updated_at: data.updated_at,
    }
  }

  preferencesStorage.update(userId, userId, { ...merged, id: userId })
  return merged
}
