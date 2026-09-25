import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'indigo' | 'amber';
  };
  gradientClass?: string;
  iconBgClass?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  gradientClass = 'from-slate-900/90 to-slate-900/50',
  iconBgClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  onClick
}) => {
  const getBadgeStyle = (variant: string) => {
    switch (variant) {
      case 'positive':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'negative':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'indigo':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'amber':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`
        glass-card p-5 rounded-2xl relative overflow-hidden group
        ${onClick ? 'cursor-pointer hover:scale-[1.01]' : ''}
        bg-gradient-to-br ${gradientClass}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight numeric-tabular">
            {value}
          </h3>
        </div>

        <div className={`p-3 rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${iconBgClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || badge) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.05]">
          {badge && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getBadgeStyle(badge.variant)}`}>
              {badge.text}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-400 truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
