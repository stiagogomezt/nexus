import { NextResponse } from 'next/server'
import { liveScheduleService } from '@/lib/tennis/data/live-schedule-service'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Optional secret verification if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized CRON execution' },
        { status: 401 }
      )
    }

    const result = await liveScheduleService.syncLiveTournamentSchedules()

    return NextResponse.json({
      message: 'Sincronización nocturna de calendarios ATP/WTA completada.',
      ...result,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error ejecutando CRON sync de tenis',
      },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  return POST(req)
}
