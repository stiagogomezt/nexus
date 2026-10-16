'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DataLoader } from '@/components/providers/DataLoader'
import type { NavTab } from '@/components/layout/Sidebar'

// Pages
import { DashboardPage } from '@/components/pages/DashboardPage'
import { IncomesPage } from '@/components/pages/IncomesPage'
import { ExpensesPage } from '@/components/pages/ExpensesPage'
import { GoalsPage } from '@/components/pages/GoalsPage'
import { DebtsPage } from '@/components/pages/DebtsPage'
import { NetWorthPage } from '@/components/pages/NetWorthPage'
import { BettingPage } from '@/components/pages/BettingPage'
import { InvestmentsPage } from '@/components/pages/InvestmentsPage'
import { CryptoPage } from '@/components/pages/CryptoPage'
import { WalletsPage } from '@/components/pages/WalletsPage'
import { BudgetsPage } from '@/components/pages/BudgetsPage'
import { BankingPage } from '@/components/pages/BankingPage'
import { LabPage } from '@/components/pages/LabPage'
import { TennisLabPage } from '@/components/pages/TennisLabPage'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { NexusAIPage } from '@/components/pages/NexusAIPage'
import { DigitalTwinPage } from '@/components/pages/DigitalTwinPage'
import { AlertsPage } from '@/components/pages/AlertsPage'
import { NexusAICopilotDrawer } from '@/components/ai/NexusAICopilotDrawer'

export default function AppPage() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleNavigate = (tab: NavTab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
    // Auto-collapse sidebar upon navigation to maximize content workspace
    setSidebarCollapsed(true)
  }

  return (
    <DataLoader>
      <div className="min-h-screen flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-72'
          }`}
        >
          <Header
            activeTab={activeTab}
            onMenuOpen={() => setSidebarOpen(true)}
            isSidebarCollapsed={sidebarCollapsed}
            onToggleSidebarCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />

          <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-16">
            {activeTab === 'dashboard'    && <DashboardPage onNavigate={setActiveTab} />}
            {activeTab === 'ingresos'     && <IncomesPage />}
            {activeTab === 'gastos'       && <ExpensesPage />}
            {activeTab === 'presupuesto'  && <BudgetsPage />}
            {activeTab === 'bancos'       && <BankingPage />}
            {activeTab === 'metas'        && <GoalsPage />}
            {activeTab === 'deudas'       && <DebtsPage />}
            {activeTab === 'patrimonio'   && <NetWorthPage />}
            {activeTab === 'inversiones'  && <InvestmentsPage />}
            {activeTab === 'crypto'       && <CryptoPage />}
            {activeTab === 'wallets'      && <WalletsPage />}
            {activeTab === 'apuestas'     && <BettingPage />}
            {activeTab === 'tennis'       && <TennisLabPage />}
            {activeTab === 'digital-twin' && <DigitalTwinPage />}
            {activeTab === 'alertas'      && <AlertsPage />}
            {activeTab === 'ai'           && <NexusAIPage />}
            {activeTab === 'laboratorio'  && <LabPage />}
            {activeTab === 'configuracion'&& <SettingsPage />}
          </main>

        </div>
      </div>

      {/* Floating Copilot Drawer accessible globally */}
      <NexusAICopilotDrawer />
    </DataLoader>
  )
}
