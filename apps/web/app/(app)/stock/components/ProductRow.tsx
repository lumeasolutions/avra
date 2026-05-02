'use client';

import React from 'react';
import { Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductRowProps {
  product: any;
  onEdit: (product: any) => void;
  onDelete: (productId: string) => void;
}

export const ProductRow = React.memo(function ProductRow({
  product,
  onEdit,
  onDelete,
}: ProductRowProps) {
  const isLowStock = (product.quantity || 0) < (product.minQuantity || 5);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-all',
        isLowStock ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#304035]/8 hover:border-[#304035]/20'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          {isLowStock && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
          <div>
            <h3 className="font-semibold text-sm text-[#304035]">{product.name}</h3>
            <p className="text-xs text-[#304035]/60">SKU: {product.sku}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 ml-4">
        <div className="text-right">
          <p className="text-sm font-medium text-[#304035]">{product.quantity} {product.unit}</p>
          <p className="text-xs text-[#304035]/60">Min: {product.minQuantity}</p>
        </div>

        <div className="text-right">
          <p className="text-sm font-medium text-[#304035]">
            {new Intl.NumberFormat('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            }).format(product.price || 0)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(product)}
            className="p-2 rounded-lg hover:bg-[#304035]/10 text-[#304035]/60 hover:text-[#304035] transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-2 rounded-lg hover:bg-red-50 text-[#304035]/60 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
