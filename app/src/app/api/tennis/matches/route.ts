import { NextResponse } from 'next/server'
import { liveScheduleService } from '@/lib/tennis/data/live-schedule-service'
import type { TennisTour } from '@/lib/tennis/types'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const tour = searchParams.get('tour') as TennisTour | undefined

    const matches = liveScheduleService.searchMatches(query, tour)

    return NextResponse.json({
      success: true,
      count: matches.length,
      matches,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error buscando partidos en vivo',
      },
      { status: 500 }
    )
  }
}
