'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Trophy, Calendar, MapPin, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import type { LiveTennisMatch } from '@/lib/tennis/data/live-schedule-service'

interface AsyncMatchSearchProps {
  onSelectMatch: (match: LiveTennisMatch) => void
  selectedMatchId?: string
}

export function AsyncMatchSearch({ onSelectMatch, selectedMatchId }: AsyncMatchSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LiveTennisMatch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch matches with debounce
  useEffect(() => {
    let isCancelled = false
    const timer = setTimeout(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/tennis/matches?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (!isCancelled) {
          if (data.success && Array.isArray(data.matches)) {
            setResults(data.matches)
          } else {
            setError(data.error || 'Error al buscar partidos')
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Error de conexión con el motor de calendarios')
        }
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }, 200)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [query])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar por jugador (Sinner, Alcaraz), torneo (Shanghai, Beijing) o superficie..."
          className="w-full pl-10 pr-4 py-2.5 bg-white text-slate-900 placeholder-slate-400 text-xs rounded-xl border border-slate-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setIsOpen(true)
            }}
            className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100">
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Partidos En Vivo y Programados ({results.length})</span>
            <span className="text-indigo-600">ATP & WTA Oficial</span>
          </div>

          {error && (
            <div className="p-4 text-xs text-rose-600 bg-rose-50/50 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {results.length === 0 && !isLoading && !error && (
            <div className="p-6 text-center text-xs text-slate-400">
              No se encontraron partidos para "{query}". Prueba con otro tenista o torneo.
            </div>
          )}

          {results.map((m) => {
            const isSelected = m.match_id === selectedMatchId
            const startTime = new Date(m.scheduled_start_time)
            const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const dateStr = startTime.toLocaleDateString([], { month: 'short', day: 'numeric' })

            return (
              <button
                key={m.match_id}
                onClick={() => {
                  onSelectMatch(m)
                  setIsOpen(false)
                }}
                className={`w-full text-left p-3.5 transition-all flex items-center justify-between gap-3 hover:bg-indigo-50/60 cursor-pointer ${
                  isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : ''
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                        m.tour === 'ATP'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-purple-50 text-purple-800 border-purple-200'
                      }`}
                    >
                      {m.tour}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {m.tournament_name} • {m.round}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {m.surface}
                    </span>
                    {m.status === 'WITHDRAWN' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        🛑 BAJA OFICIAL (LESIONADO)
                      </span>
                    )}
                  </div>

                  {/* Players Matchup */}
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <span>
                      {m.player_a.name} <span className="text-[10px] text-slate-400 font-normal">({m.player_a.country} #{m.player_a.rank})</span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">vs</span>
                    <span>
                      {m.player_b.name} <span className="text-[10px] text-slate-400 font-normal">({m.player_b.country} #{m.player_b.rank})</span>
                    </span>
                  </div>
                </div>

                {/* Scheduled Time & Odds preview */}
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="text-xs font-mono font-bold text-indigo-600 flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{dateStr} {timeStr}</span>
                  </div>
                  {m.live_market_odds && (
                    <div className="text-[10px] font-mono text-slate-500">
                      Cuotas: {m.live_market_odds.odds_a.toFixed(2)} | {m.live_market_odds.odds_b.toFixed(2)}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
