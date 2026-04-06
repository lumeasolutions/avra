'use client';

import React from 'react';

interface ProgressBarProps {
  steps: string[];
  currentStep: number;
  isLoading: boolean;
}

export const ProgressBar = React.memo(function ProgressBar({
  steps,
  currentStep,
  isLoading,
}: ProgressBarProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="space-y-2">
      <div className="relative h-2 bg-[#304035]/8 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#a67749] to-[#304035] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {isLoading && (
        <p className="text-xs text-[#304035]/60">
          {steps[currentStep] || 'Finalisation...'}
        </p>
      )}
    </div>
  );
});
