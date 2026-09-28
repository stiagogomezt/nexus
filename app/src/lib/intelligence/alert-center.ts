// ============================================================
// NEXUS FINANCE — Financial Intelligence: Alert Center
// Converts detected events into clean, non-alarmist alerts.
// Implements strict deduplication (same type/metric/day).
// ============================================================

import type {
  FinancialEvent,
  FinancialAlert,
  AlertStatus,
  AlertSeverity,
  FinancialEventType,
} from '@/types/intelligence'
import * as dal from '@/lib/dal/intelligence'

export class AlertCenter {
  /**
   * Generates new FinancialAlerts from events while preventing duplicates.
   * If an active or today's alert with matching type and metric already exists,
   * it is skipped to avoid alert fatigue.
   */
  static processEventsIntoAlerts(
    userId: string,
    events: FinancialEvent[],
    existingAlerts: FinancialAlert[]
  ): { newAlerts: FinancialAlert[]; deduplicatedCount: number } {
    const today = new Date().toISOString().split('T')[0]
    const newAlerts: FinancialAlert[] = []
    let deduplicatedCount = 0

    // Build deduplication index of existing alerts
    const existingIndex = new Set(
      existingAlerts.map(
        (a) => `${a.type}::${a.metric}::${a.date}::${a.status !== 'DISMISSED'}`
      )
    )

    for (const evt of events) {
      const dedupKey = `${evt.type}::${evt.metric}::${today}::true`

      // Also check if an unread alert of the same type and metric is already open
      const hasPendingSameMetric = existingAlerts.some(
        (a) => a.type === evt.type && a.metric === evt.metric && a.status === 'UNREAD'
      )

      if (existingIndex.has(dedupKey) || hasPendingSameMetric) {
        deduplicatedCount++
        continue
      }

      const alert: FinancialAlert = {
        id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        event_id: evt.id,
        type: evt.type,
        date: today,
        severity: evt.severity,
        title: evt.title,
        description: evt.description,
        metric: evt.metric,
        current_value: evt.current_value,
        previous_value: evt.previous_value,
        delta: evt.delta ? evt.delta.absoluteDelta : evt.current_value - evt.previous_value,
        source: evt.source,
        status: 'UNREAD',
        created_at: new Date().toISOString(),
      }

      newAlerts.push(alert)
      existingIndex.add(dedupKey)
    }

    return { newAlerts, deduplicatedCount }
  }

  /**
   * Persists newly identified alerts for a user via the DAL.
   */
  static async syncAlerts(
    userId: string,
    events: FinancialEvent[]
  ): Promise<FinancialAlert[]> {
    const existingAlerts = await dal.getFinancialAlerts(userId, 'ALL')
    const { newAlerts } = this.processEventsIntoAlerts(userId, events, existingAlerts)

    const saved: FinancialAlert[] = []
    for (const alert of newAlerts) {
      const persisted = await dal.saveFinancialAlert(userId, alert)
      saved.push(persisted)
    }

    return [...saved, ...existingAlerts]
  }

  /**
   * Marks an alert as READ.
   */
  static async markAsRead(userId: string, alertId: string): Promise<FinancialAlert | null> {
    return dal.updateAlertStatus(userId, alertId, 'READ')
  }

  /**
   * Dismisses an alert.
   */
  static async dismiss(userId: string, alertId: string): Promise<FinancialAlert | null> {
    return dal.dismissAlert(userId, alertId)
  }

  /**
   * Fetches active (UNREAD) alerts for a user from storage.
   */
  static async getActiveAlerts(userId: string): Promise<FinancialAlert[]> {
    return dal.getFinancialAlerts(userId, 'UNREAD')
  }

  /**
   * Filters a collection of alerts by status and severity.
   */
  static filter(
    alerts: FinancialAlert[],
    options?: { status?: AlertStatus | 'ALL'; severity?: AlertSeverity | 'ALL' }
  ): FinancialAlert[] {
    return alerts.filter((alert) => {
      if (options?.status && options.status !== 'ALL' && alert.status !== options.status) {
        return false
      }
      if (options?.severity && options.severity !== 'ALL' && alert.severity !== options.severity) {
        return false
      }
      return true
    })
  }

  /**
   * Counts active (UNREAD) alerts by severity level.
   */
  static getActiveCounts(alerts: FinancialAlert[]): {
    totalUnread: number
    critical: number
    warning: number
    info: number
  } {
    const unread = alerts.filter((a) => a.status === 'UNREAD')
    return {
      totalUnread: unread.length,
      critical: unread.filter((a) => a.severity === 'CRITICAL').length,
      warning: unread.filter((a) => a.severity === 'WARNING').length,
      info: unread.filter((a) => a.severity === 'INFO').length,
    }
  }
}
