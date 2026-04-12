'use client';

import { useState, useCallback } from 'react';
import { useConfigStore } from '@/store';

export function useParametres() {
  const societe = useConfigStore(s => s.societe);
  const updateSociete = useConfigStore(s => s.updateSociete);
  const [activeSection, setActiveSection] = useState('general');
  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState(societe || {});

  const handleChange = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateSociete(formData);
      setIsDirty(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  }, [formData, updateSociete]);

  return {
    activeSection,
    setActiveSection,
    isDirty,
    formData,
    handleChange,
    handleSave,
    societe,
  };
}
