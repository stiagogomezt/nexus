import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NEXUS Finance — Sistema Operativo Financiero Personal',
  description:
    'Tu centro de control financiero. Ingresos, gastos, metas, deudas, inversiones, crypto y apuestas en un solo sistema inteligente.',
  keywords: ['finanzas personales', 'presupuesto', 'patrimonio', 'inversiones', 'crypto'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#07080f] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
