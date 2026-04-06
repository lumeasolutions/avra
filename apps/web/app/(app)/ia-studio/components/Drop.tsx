'use client';

import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropProps {
  onFileSelected: (file: File) => void;
  acceptedTypes?: string[];
  label?: string;
}

export const Drop = React.memo(function Drop({
  onFileSelected,
  acceptedTypes = ['image/*'],
  label = 'Déposez votre fichier ici',
}: DropProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all',
        isDragging
          ? 'border-[#304035] bg-[#304035]/5'
          : 'border-[#304035]/20 hover:border-[#304035]/40 hover:bg-[#304035]/2'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-2">
        <Upload className="h-6 w-6 text-[#304035]/60" />
        <p className="text-sm font-medium text-[#304035]">{label}</p>
        <p className="text-xs text-[#304035]/50">ou cliquez pour sélectionner</p>
      </div>
    </div>
  );
});
