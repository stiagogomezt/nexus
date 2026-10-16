import { NextResponse } from 'next/server'
import { tennisLiveAIRadar } from '@/lib/tennis/ai/tennis-live-ai-radar'
import { liveScheduleService } from '@/lib/tennis/data/live-schedule-service'

export async function POST(req: Request) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // Empty body is acceptable
    }

    const report = await tennisLiveAIRadar.syncLiveTournamentsWithAI({
      forceFresh: body.forceFresh ?? true,
      targetedTournament: body.tournament,
    })

    const allMatches = liveScheduleService.getAllMatches()
    const withdrawals = liveScheduleService.getOfficialWithdrawals()

    return NextResponse.json({
      success: true,
      report,
      matches: allMatches,
      withdrawals,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error en POST /api/tennis/live-radar/sync:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error en sincronización con IA en vivo',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  return POST(req)
}
