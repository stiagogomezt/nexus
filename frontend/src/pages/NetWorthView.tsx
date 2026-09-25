import React, { useState } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { formatCurrency } from '../lib/formatters';
import { Asset, Debt } from '../types';
import { Landmark, Plus, Trash2, ShieldCheck, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

export const NetWorthView: React.FC = () => {
  const { assets, debts, addAsset, deleteAsset, currency } = useFinancial();
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<'cash' | 'bank_accounts' | 'savings' | 'investments' | 'cdt' | 'real_estate' | 'vehicles' | 'other'>('bank_accounts');
  const [assetValue, setAssetValue] = useState('');

  const totalAssets = assets.reduce((acc: number, curr: Asset) => acc + curr.current_value, 0);
  const totalLiabilities = debts.reduce((acc: number, curr: Debt) => acc + curr.current_balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(assetValue);
    if (!assetName || isNaN(val) || val < 0) return;
    addAsset({
      name: assetName,
      category: assetCategory,
      current_value: val
    });
    setAssetName('');
    setAssetValue('');
    setIsAddAssetOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Cálculo de Patrimonio Neto</h2>
          <p className="text-xs text-slate-400">Balance patrimonial: Activos Totales poseídos menos Pasivos Totales adeudados</p>
        </div>

        <button
          onClick={() => setIsAddAssetOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Agregar Activo</span>
        </button>
      </div>

      {/* 2. Hero Net Worth Banner */}
      <div className="glass-panel p-6 lg:p-8 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Landmark className="w-4 h-4" />
              Patrimonio Neto Consolidado
            </span>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight numeric-tabular">
              {formatCurrency(netWorth, currency)}
            </h1>
            <p className="text-xs text-slate-300">
              {netWorth >= 0 
                ? 'Posición financiera neta superavitaria y sólida.'
                : 'Posición financiera neta en desapalancamiento.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Activos Totales
              </span>
              <p className="text-xl font-extrabold text-white mt-1 numeric-tabular">
                {formatCurrency(totalAssets, currency)}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Pasivos Totales
              </span>
              <p className="text-xl font-extrabold text-white mt-1 numeric-tabular">
                {formatCurrency(totalLiabilities, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Breakdown: Activos vs Pasivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl space-y-4 border border-white/[0.08]">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                Activos (Lo que Tienes)
              </h3>
              <p className="text-xs text-slate-400">Cuentas, ahorros, inversiones y bienes</p>
            </div>
            <span className="text-xs font-bold text-emerald-400">
              {formatCurrency(totalAssets, currency)}
            </span>
          </div>

          <div className="space-y-3">
            {assets.map((asset: Asset) => (
              <div key={asset.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                <div>
                  <h4 className="text-xs font-bold text-white">{asset.name}</h4>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {asset.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-emerald-400 numeric-tabular">
                    {formatCurrency(asset.current_value, currency)}
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar activo "${asset.name}"?`)) {
                        deleteAsset(asset.id);
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar activo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl space-y-4 border border-white/[0.08]">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                Pasivos (Lo que Debes)
              </h3>
              <p className="text-xs text-slate-400">Tarjetas, préstamos y compromisos vigentes</p>
            </div>
            <span className="text-xs font-bold text-rose-400">
              {formatCurrency(totalLiabilities, currency)}
            </span>
          </div>

          <div className="space-y-3">
            {debts.map((debt: Debt) => (
              <div key={debt.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between group hover:border-rose-500/30 transition-all">
                <div>
                  <h4 className="text-xs font-bold text-white">{debt.name}</h4>
                  <span className="text-[10px] text-slate-400">
                    {debt.entity} • {debt.interest_rate_ea}% E.A.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-rose-400 numeric-tabular">
                    {formatCurrency(debt.current_balance, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Asset Modal */}
      {isAddAssetOpen && (
        <Modal
          isOpen={isAddAssetOpen}
          onClose={() => setIsAddAssetOpen(false)}
          title="Agregar Activo"
          subtitle="Registra un nuevo activo o cuenta que incremente tu patrimonio"
        >
          <form onSubmit={handleAssetSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nombre del Activo *
              </label>
              <input
                type="text"
                placeholder="Ej. Cuenta de Ahorros Nu, CDT Bancolombia, Carro..."
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Categoría
              </label>
              <select
                value={assetCategory}
                onChange={(e) => setAssetCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="bank_accounts">Cuenta Bancaria</option>
                <option value="savings">Ahorros / Fondo Líquido</option>
                <option value="investments">Inversiones (Acciones / ETFs)</option>
                <option value="cdt">CDT / Renta Fija</option>
                <option value="cash">Efectivo / Billeteras Digitales</option>
                <option value="vehicles">Vehículo / Moto</option>
                <option value="real_estate">Propiedad Raíz</option>
                <option value="other">Otro Activo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Valor Actual Estimado ({currency}) *
              </label>
              <input
                type="number"
                placeholder="Ej. 5000000"
                value={assetValue}
                onChange={(e) => setAssetValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-sm text-white font-bold focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                Guardar Activo
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
