'use client'

import { useState, useRef, useEffect } from 'react'
import { useAIChatStore } from '@/store/ai-chat'
import { useFinancialStore } from '@/store/financial'
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Trash2,
  AlertCircle,
  Zap,
} from 'lucide-react'

export function NexusAICopilotDrawer() {
  const { messages, isLoading, error, isDrawerOpen, toggleDrawer, sendMessage, clearHistory } =
    useAIChatStore()
  const { user } = useFinancialStore()
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isDrawerOpen, isLoading])

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
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => toggleDrawer(true)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 group border border-indigo-400/30"
      >
        <Sparkles className="w-5 h-5 animate-pulse text-indigo-200" />
        <span className="text-xs font-bold tracking-wide pr-1">NEXUS AI</span>
      </button>

      {/* Slide-over Drawer Backdrop */}
      {isDrawerOpen && (
        <div
          onClick={() => toggleDrawer(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        />
      )}

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] bg-[#0b0d17]/95 border-l border-white/[0.08] backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                NEXUS AI Copilot
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-[10px] text-slate-400">Grounded in Financial Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearHistory}
              title="Limpiar conversación"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => toggleDrawer(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user'

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'ml-auto flex-row-reverse max-w-[85%]' : 'mr-auto max-w-[95%]'}`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] ${
                    isUser ? 'bg-indigo-600 text-white' : 'bg-white/[0.05] text-indigo-400 border border-white/[0.08]'
                  }`}
                >
                  {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed space-y-1.5 ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white/[0.03] border border-white/[0.06] text-slate-200 rounded-tl-none'
                  }`}
                >
                  {!isUser && msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pb-1 border-b border-white/[0.06]">
                      {msg.toolsExecuted.map((tool) => (
                        <span
                          key={tool}
                          className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono"
                        >
                          <Zap className="w-2 h-2" /> {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            )
          })}

          {isLoading && (
            <div className="flex gap-2 items-center text-xs text-indigo-300 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <Bot className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Consultando Financial Engine...</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-black/20">
          <div className="flex items-center gap-2 glass-panel p-1.5 rounded-xl border-white/[0.08]">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Pregunta a NEXUS AI..."
              className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
