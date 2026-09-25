import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinancialProvider } from './context/FinancialContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { QuickTransactionModal } from './components/forms/QuickTransactionModal';

// Pages
import { DashboardView } from './pages/DashboardView';
import { IncomesView } from './pages/IncomesView';
import { ExpensesView } from './pages/ExpensesView';
import { GoalsView } from './pages/GoalsView';
import { DebtsView } from './pages/DebtsView';
import { NetWorthView } from './pages/NetWorthView';
import { 
  BudgetsView, 
  SavingsView, 
  InvestmentsView, 
  BettingView, 
  LabView, 
  SettingsView 
} from './pages/ModulesPreview';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'income' | 'expense' | 'goal' | 'debt'>('income');

  const handleOpenQuickAdd = (type: 'income' | 'expense' | 'goal' | 'debt' = 'income') => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsSidebarOpen(true)}
          onOpenQuickAdd={() => handleOpenQuickAdd('income')}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              onOpenQuickAdd={handleOpenQuickAdd}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'ingresos' && (
            <IncomesView onOpenQuickAdd={() => handleOpenQuickAdd('income')} />
          )}

          {activeTab === 'gastos' && (
            <ExpensesView onOpenQuickAdd={() => handleOpenQuickAdd('expense')} />
          )}

          {activeTab === 'metas' && (
            <GoalsView onOpenQuickAdd={() => handleOpenQuickAdd('goal')} />
          )}

          {activeTab === 'deudas' && (
            <DebtsView onOpenQuickAdd={() => handleOpenQuickAdd('debt')} />
          )}

          {activeTab === 'patrimonio' && (
            <NetWorthView />
          )}

          {activeTab === 'presupuesto' && (
            <BudgetsView />
          )}

          {activeTab === 'ahorro' && (
            <SavingsView />
          )}

          {activeTab === 'inversiones' && (
            <InvestmentsView />
          )}

          {activeTab === 'apuestas' && (
            <BettingView />
          )}

          {activeTab === 'laboratorio' && (
            <LabView />
          )}

          {activeTab === 'configuracion' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Global Quick Transaction Modal */}
      <QuickTransactionModal
        key={`${isQuickAddOpen}-${quickAddType}`}
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        defaultType={quickAddType}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FinancialProvider>
        <AppContent />
      </FinancialProvider>
    </AuthProvider>
  );
}
