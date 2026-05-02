'use client';

import { useState, useCallback } from 'react';
import { useDossierStore } from '@/store';

export type Module = 'coloriste' | 'rendu';

export function useIAStudio() {
  const dossiers = useDossierStore(s => s.dossiers);
  const dossiersSignes = useDossierStore(s => s.dossiersSignes);
  const allDossiers = [...dossiers, ...dossiersSignes];

  const [activeModule, setActiveModule] = useState<Module>('coloriste');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedDossier, setSelectedDossier] = useState('');

  const generateImage = useCallback(async (params: any) => {
    setIsLoading(true);
    setCurrentStep(0);
    try {
      const response = await fetch(`/api/ia/${activeModule}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(err.error ?? `Erreur ${response.status}`);
      }
      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Erreur génération:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeModule]);

  return {
    activeModule,
    setActiveModule,
    isLoading,
    currentStep,
    setCurrentStep,
    generatedImage,
    setGeneratedImage,
    prompt,
    setPrompt,
    selectedDossier,
    setSelectedDossier,
    allDossiers,
    generateImage,
  };
}
