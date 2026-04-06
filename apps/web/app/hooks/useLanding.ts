'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export function useCounter(target: number, decimals = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = target / 100;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      setCount(current >= target ? target : Math.ceil(current));
      if (current >= target) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return count.toFixed(decimals);
}

export function useLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addChatMessage = useCallback((role: 'user' | 'bot', text: string) => {
    setChatMessages(prev => [...prev, { role, text }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return {
    isMenuOpen,
    setIsMenuOpen,
    chatOpen,
    setChatOpen,
    chatMessages,
    chatInput,
    setChatInput,
    addChatMessage,
    messagesEndRef,
  };
}
