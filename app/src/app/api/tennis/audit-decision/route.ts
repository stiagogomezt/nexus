import { NextResponse } from 'next/server'
import { tennisAIDecisionAuditor, DecisionAuditInput } from '@/lib/tennis/ai/tennis-decision-auditor'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body || !body.match_id) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos: match_id' },
        { status: 400 }
      )
    }

    const input: DecisionAuditInput = {
      match_id: body.match_id,
      tournament: body.tournament || 'ATP Tour',
      surface: body.surface || 'Hard',
      round: body.round || 'R16',
      player_a: body.player_a || { name: 'Player A', rank: 1, country: 'ESP' },
      player_b: body.player_b || { name: 'Player B', rank: 2, country: 'SRB' },
      calibrated_p_a: Number(body.calibrated_p_a ?? 0.5),
      calibrated_p_b: Number(body.calibrated_p_b ?? 0.5),
      odds_a: Number(body.odds_a ?? 1.90),
      odds_b: Number(body.odds_b ?? 1.90),
      implied_p_a: Number(body.implied_p_a ?? (1 / (body.odds_a || 1.90))),
      implied_p_b: Number(body.implied_p_b ?? (1 / (body.odds_b || 1.90))),
      edge_a: Number(body.edge_a ?? 0),
      edge_b: Number(body.edge_b ?? 0),
      ev_a: Number(body.ev_a ?? 0),
      ev_b: Number(body.ev_b ?? 0),
      credible_interval_95_a: body.credible_interval_95_a,
      data_quality_tier: body.data_quality_tier || 'GOLD_VERIFIED',
      top_shap_factors: body.top_shap_factors || [],
      news_context: body.news_context || '',
    }

    const auditReport = await tennisAIDecisionAuditor.auditDecision(input)

    return NextResponse.json({
      success: true,
      report: auditReport,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error en POST /api/tennis/audit-decision:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error auditando la decisión con IA',
      },
      { status: 500 }
    )
  }
}
