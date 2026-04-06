'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStockStore } from '@/store';

export function useStock() {
  const stock = useStockStore(s => s.stockItems || []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const filteredProducts = useMemo(() => {
    return stock.filter(product => {
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [stock, selectedCategory, searchQuery]);

  const categories = useMemo(() => {
    return [...new Set(stock.map(p => p.category))];
  }, [stock]);

  const stats = useMemo(() => {
    const lowStock = stock.filter(p => (p.quantity || 0) < (p.minQuantity || 5)).length;
    const totalValue = stock.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0);
    return { lowStock, totalValue, totalProducts: stock.length };
  }, [stock]);

  const addProduct = useCallback(async (product: any) => {
    // Will be implemented with store action
    setShowProductModal(false);
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    // Will be implemented with store action
  }, []);

  return {
    filteredProducts,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    showProductModal,
    setShowProductModal,
    editingProduct,
    setEditingProduct,
    stats,
    addProduct,
    deleteProduct,
  };
}
