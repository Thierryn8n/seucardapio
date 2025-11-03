'use client';

import React from 'react';
import { useSettings } from '@/hooks/useSettings';

export default function Background() {
  const { settings } = useSettings();

  if (!settings) return null;

  const primaryColor = settings.primary_color || '#3B82F6';
  const secondaryColor = settings.secondary_color || '#F97316';
  const accentColor = settings.accent_color || '#EC4899';

  return (
    <>
      <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-blue-50 via-orange-50 to-pink-50">
        {/* Orbe 1: Superior direito - Cor primária */}
        <div
          className="absolute -top-32 -right-32 h-80 w-80 rounded-full blur-3xl animate-pulse"
          style={{
            background: `radial-gradient(circle, ${primaryColor}80 0%, ${primaryColor}50 50%, transparent 70%)`,
            animation: 'pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />

        {/* Orbe 2: Inferior esquerdo - Cor secundária */}
        <div
          className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full blur-3xl animate-pulse"
          style={{
            background: `radial-gradient(circle, ${secondaryColor}80 0%, ${secondaryColor}50 50%, transparent 70%)`,
            animation: 'pulse 7s cubic-bezier(0.4, 0, 0.6, 1) infinite reverse',
            animationDelay: '1.5s',
          }}
        />

        {/* Orbe 3: Centro-direita flutuante - Cor de destaque */}
        <div
          className="absolute top-1/3 right-1/5 h-48 w-48 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${accentColor}70 0%, ${accentColor}40 50%, transparent 70%)`,
            animation: 'float 14s ease-in-out infinite',
          }}
        />

        {/* Orbe 4: Pequeno canto superior esquerdo - Gradiente misto */}
        <div
          className="absolute top-20 left-20 h-16 w-16 rounded-full blur-3xl animate-pulse"
          style={{
            background: `radial-gradient(circle, ${primaryColor}60 0%, ${accentColor}40 50%, transparent 70%)`,
            animation: 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '3s',
          }}
        />

        {/* Orbe 5: Centro-esquerdo - Tamanho médio */}
        <div
          className="absolute top-1/2 left-1/4 h-24 w-24 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${secondaryColor}60 0%, ${primaryColor}40 50%, transparent 70%)`,
            animation: 'float 10s ease-in-out infinite reverse',
            animationDelay: '2s',
          }}
        />

        {/* Orbe 6: Inferior direito - Pequeno */}
        <div
          className="absolute bottom-32 right-32 h-12 w-12 rounded-full blur-3xl animate-pulse"
          style={{
            background: `radial-gradient(circle, ${accentColor}70 0%, ${secondaryColor}40 50%, transparent 70%)`,
            animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            animationDelay: '0.5s',
          }}
        />
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-50px) translateX(30px) scale(1.15);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}