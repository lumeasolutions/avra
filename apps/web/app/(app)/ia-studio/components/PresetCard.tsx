'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Preset {
  name: string;
  facade: string;
  poignee: string;
  plan: string;
  desc: string;
  mood: string;
  finish: string;
  handleMaterial: string;
  countertopMaterial: string;
}

interface PresetCardProps {
  preset: Preset;
  onSelect: (preset: Preset) => void;
  isSelected?: boolean;
}

export const PresetCard = React.memo(function PresetCard({
  preset,
  onSelect,
  isSelected,
}: PresetCardProps) {
  return (
    <button
      onClick={() => onSelect(preset)}
      className={cn(
        'group relative p-4 rounded-xl border-2 transition-all',
        'hover:shadow-lg active:scale-95',
        isSelected
          ? 'border-[#304035] bg-[#304035]/5'
          : 'border-[#304035]/12 hover:border-[#304035]/30'
      )}
    >
      {/* Couleurs */}
      <div className="flex gap-2 mb-3">
        <div
          className="h-12 w-12 rounded-lg border border-[#304035]/20 shadow-sm"
          style={{ backgroundColor: preset.facade }}
          title="Façade"
        />
        <div
          className="h-12 w-12 rounded-lg border border-[#304035]/20 shadow-sm"
          style={{ backgroundColor: preset.poignee }}
          title="Poignée"
        />
        <div
          className="h-12 w-12 rounded-lg border border-[#304035]/20 shadow-sm"
          style={{ backgroundColor: preset.plan }}
          title="Plan de travail"
        />
      </div>

      {/* Texte */}
      <h3 className="font-semibold text-sm text-[#304035] mb-1">{preset.name}</h3>
      <p className="text-xs text-[#304035]/60 mb-2">{preset.desc}</p>
      <p className="text-[10px] text-[#304035]/50 italic">{preset.mood}</p>
    </button>
  );
});
