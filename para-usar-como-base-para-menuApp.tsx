'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, Image, MessageCircle, Settings, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx } from 'clsx';

interface Meal {
  type: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  title: string;
  description: string;
  image?: string;
}

interface Day {
  date: Date;
  meals: Meal[];
}

const mockData: Day[] = [
  {
    date: new Date(2025, 10, 3),
    meals: [
      {
        type: 'breakfast',
        title: 'Café da manhã',
        description: 'Pão com manteiga, café preto, croissant, laranja e nozes',
        image: 'breakfast'
      },
      {
        type: 'lunch',
        title: 'Almoço',
        description: 'Arroz, feijão, bife grelhado com legumes salteados',
        image: 'lunch'
      },
      {
        type: 'snack',
        title: 'Lanche',
        description: 'Sanduíche natural com suco de laranja natural',
        image: 'snack'
      }
    ]
  },
  {
    date: new Date(2025, 10, 4),
    meals: []
  }
];

const mealTypeConfig = {
  breakfast: {
    label: 'Café da manhã',
    bgGradient: 'from-orange-500/20 to-yellow-500/20',
    badgeColor: 'bg-orange-100 text-orange-800'
  },
  lunch: {
    label: 'Almoço',
    bgGradient: 'from-red-500/20 to-orange-500/20',
    badgeColor: 'bg-red-100 text-red-800'
  },
  snack: {
    label: 'Lanche',
    bgGradient: 'from-green-500/20 to-emerald-500/20',
    badgeColor: 'bg-green-100 text-green-800'
  },
  dinner: {
    label: 'Jantar',
    bgGradient: 'from-purple-500/20 to-pink-500/20',
    badgeColor: 'bg-purple-100 text-purple-800'
  }
};

const MealCard: React.FC<{ meal: Meal; index: number }> = ({ meal, index }) => {
  const config = mealTypeConfig[meal.type];

  return (
    <div
      className={clsx(
        'group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl',
        'animate-in fade-in slide-in-from-bottom-4',
        index > 0 && 'delay-100'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="aspect-video relative overflow-hidden">
        {meal.image ? (
          <div className="h-full w-full bg-gray-200 border-2 border-dashed rounded-xl" />
        ) : (
          <div className={clsx('h-full w-full', config.bgGradient)} />
        )}
        <div className="absolute top-3 right-3">
          <span className={clsx(
            'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
            config.badgeColor
          )}>
            {config.label}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      
      <div className="p-4">
        <h3 className="font-playfair text-lg font-bold text-gray-900">{meal.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{meal.description}</p>
      </div>
    </div>
  );
};

const EmptyDayCard: React.FC = () => (
  <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center">
    <div className="mb-4 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <UtensilsCrossed className="h-12 w-12 text-primary/60" />
    </div>
    <p className="text-lg font-medium text-gray-700">Nenhum cardápio cadastrado para este dia</p>
    <p className="mt-2 text-sm text-gray-500">Em breve teremos novidades deliciosas!</p>
  </div>
);

const DayCard: React.FC<{ day: Day; index: number }> = ({ day, index }) => {
  const dayName = format(day.date, 'EEEE', { locale: ptBR });
  const dayDate = format(day.date, "'de' MMMM", { locale: ptBR });
  const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('-feira', '-feira');

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm shadow-xl',
        'animate-in fade-in slide-in-from-bottom-8',
        index > 0 && 'delay-150'
      )}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-primary via-accent to-secondary" />
      
      <div className="p-6 pl-8">
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-gray-900">{capitalizedDayName}</h2>
          <p className="text-lg text-gray-600">{dayDate}</p>
        </div>

        {day.meals.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {day.meals.map((meal, mealIndex) => (
              <MealCard key={mealIndex} meal={meal} index={mealIndex} />
            ))}
          </div>
        ) : (
          <EmptyDayCard />
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [currentWeekStart] = useState(new Date(2025, 10, 3));
  const weekStart = format(currentWeekStart, "'Semana de' d 'a' ", { locale: ptBR });
  const weekEnd = format(new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000), 'd', { locale: ptBR });

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-pink-50">
        {/* Animated Orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-tr from-primary/10 to-secondary/10 blur-3xl animate-pulse animation-delay-2000" />
        </div>

        {/* Header */}
        <header className="relative z-10 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-primary to-secondary p-2">
                <UtensilsCrossed className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Seu Cardápio</h1>
            </div>
          </div>
        </header>

        {/* Main Title */}
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-5xl font-bold text-transparent md:text-6xl">
            Cardápio Semanal
          </h1>
          <p className="mt-3 text-lg text-gray-600">Refeições deliciosas e balanceadas para sua semana</p>
        </div>

        {/* Navigation Bar */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-md">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <button className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span>{weekStart}{weekEnd}</span>
                  <span className="text-gray-500">|</span>
                  <button className="text-primary hover:underline transition-colors">
                    Voltar para semana atual
                  </button>
                </div>

                <button className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 rounded-lg bg-beige-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-beige-200 transition-colors">
                  <Image className="h-4 w-4" />
                  PNG
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                  <Download className="h-4 w-4" />
                  PDF
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                  <FileText className="h-4 w-4" />
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
                  <Settings className="h-4 w-4" />
                  Personalizar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="space-y-10">
            {mockData.map((day, index) => (
              <DayCard key={index} day={day} index={index} />
            ))}
          </div>
        </main>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap');
        
        .font-playfair {
          font-family: 'Playfair Display', serif;
        }
        
        .animate-in {
          animation: animateIn 0.6s ease-out forwards;
        }
        
        .slide-in-from-bottom-4 {
          animation: slideInFromBottom 0.6s ease-out forwards;
        }
        
        .slide-in-from-bottom-8 {
          animation: slideInFromBottomLarge 0.6s ease-out forwards;
        }
        
        @keyframes animateIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInFromBottomLarge {
          from {
            opacity: 0;
            transform: translateY(32px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .bg-beige-100 {
          background-color: #F5F5DC;
        }
        
        .bg-beige-200 {
          background-color: #E5E5C5;
        }
        
        .from-primary {
          --tw-gradient-from: #f97316;
        }
        
        .via-accent {
          --tw-gradient-stops: var(--tw-gradient-from), #f59e0b, var(--tw-gradient-to);
        }
        
        .to-secondary {
          --tw-gradient-to: #8b5cf6;
        }
      `}</style>
    </>
  );
}