'use client'

import { useState, useRef, useEffect } from 'react'
import { useAIChatStore } from '@/store/ai-chat'
import { useFinancialStore } from '@/store/financial'
import {
  Sparkles,
  Send,
  Bot,
  User,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'

const SUGGESTIONS = [
  '¿Cuánto gané este mes?',
  '¿Cuánto recibí de Shuffler?',
  '¿Cuánto recibí de Pizza Hut?',
  '¿Cuánto gasté este mes?',
  '¿Cuál es mi mayor categoría de gasto?',
  '¿Cuál es mi flujo libre y tasa de ahorro?',
  '¿Cómo van mis presupuestos?',
  '¿Cuánto debo actualmente?',
  '¿Cómo están mis metas financieras?',
  '¿Cuál es mi patrimonio neto?',
  '¿Qué cuentas tengo registradas?',
]

export function NexusAIPage() {
  const { messages, isLoading, error, sendMessage, clearHistory } = useAIChatStore()
  const { user } = useFinancialStore()
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText
    if (!text.trim() || isLoading) return

    if (!user) {
      alert('Debes iniciar sesión para interactuar con NEXUS AI.')
      return
    }

    setInputText('')
    await sendMessage(text, user.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto space-y-4">
      {/* Copilot Header */}
      <div className="glass-panel p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4 border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">NEXUS AI Copilot</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <ShieldCheck className="w-3 h-3 text-indigo-400" /> Grounded in Financial Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Respuestas financieras deterministas · Google Gemini + 8 AI Tools de Solo Lectura
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            title="Reiniciar conversación"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors text-xs flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 glass-panel p-4 sm:p-6 rounded-3xl overflow-y-auto space-y-4 border-white/[0.06]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user'

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/[0.05] border border-indigo-500/30 text-indigo-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2 ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-white/[0.03] border border-white/[0.08] text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Provenance and Data Type Header for Assistant */}
                {!isUser && (
                  <div className="space-y-1 pb-1.5 border-b border-white/[0.06]">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-semibold tracking-wider">FUENTE:</span>
                        <span className="text-indigo-300 font-mono">
                          {msg.toolsExecuted && msg.toolsExecuted.length > 0 ? 'Financial Engine & DAL' : 'NEXUS Copilot'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-semibold tracking-wider">TIPO:</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-medium text-[9px] border border-emerald-500/30">
                          {msg.content.toLowerCase().includes('simul') || msg.content.toLowerCase().includes('hipot') ? 'Simulación / Hipotético' : 'Dato Real Verificado'}
                        </span>
                      </div>
                    </div>

                    {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[9px] text-slate-400">Tools:</span>
                        {msg.toolsExecuted.map((tool) => (
                          <span
                            key={tool}
                            className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30"
                          >
                            <Zap className="w-2 h-2 text-indigo-400" /> {tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content}</div>

                <div className="text-[9px] text-slate-400 text-right opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-3 mr-auto max-w-lg items-center">
            <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-indigo-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              Consultando Financial Engine y ejecutando herramientas autorizadas...
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="overflow-x-auto pb-1 flex items-center gap-2 no-scrollbar">
        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 flex-shrink-0">
          <HelpCircle className="w-3 h-3 text-indigo-400" /> Sugerencias:
        </span>
        {SUGGESTIONS.map((sug) => (
          <button
            key={sug}
            onClick={() => handleSend(sug)}
            disabled={isLoading}
            className="text-[11px] px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-all whitespace-nowrap flex items-center gap-1 flex-shrink-0 disabled:opacity-50"
          >
            <span>{sug}</span>
            <ArrowRight className="w-2.5 h-2.5 opacity-60" />
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="glass-panel p-2.5 rounded-2xl border-white/[0.08] flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Haz una pregunta sobre tus finanzas (ej. ¿Cuánto gané este mes de Shuffler?)..."
          className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
          className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </div>
    </div>
  )
}
