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
  // 05/05/2026 - expose l'erreur a l'utilisateur (auparavant log console only)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateImage = useCallback(async (params: any) => {
    setIsLoading(true);
    setCurrentStep(0);
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/ia/${activeModule}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Erreur serveur' }));
        if (response.status === 429) {
          throw new Error('Vous avez atteint la limite de 10 générations par heure. Réessayez dans quelques minutes.');
        }
        throw new Error(err.error ?? `Erreur ${response.status}`);
      }
      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
      } else {
        throw new Error('Aucune image générée dans la réponse');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur génération:', msg);
      setErrorMessage(msg);
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
    errorMessage,
    setErrorMessage,
  };
}
