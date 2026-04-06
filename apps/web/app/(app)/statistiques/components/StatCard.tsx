'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}

export const StatCard = React.memo(function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  color = '#304035',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-[#304035]/8 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xs font-semibold text-[#304035]/60 uppercase tracking-wide">{label}</h3>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <p className="text-2xl font-bold text-[#304035]">{value}</p>
          {unit && <span className="text-sm text-[#304035]/60">{unit}</span>}
        </div>
        {trend && (
          <p
            className={`text-xs font-medium ${
              trend.isPositive ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? '+' : '-'} {Math.abs(trend.value)}% vs période précédente
          </p>
        )}
      </div>
    </div>
  );
});
