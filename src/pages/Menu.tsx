import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { UtensilsCrossed, ChevronLeft, ChevronRight, Camera, FileText, Settings, MessageSquare, X, ShoppingCart, Package } from "lucide-react";
import { format, addDays, startOfWeek, addWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import clsx from "clsx";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useSettings } from "@/hooks/useSettings";
import Background from "@/components/Background";
import { MealSuggestions } from "@/components/MealSuggestions";
import { useProducts } from "@/hooks/useDelivery";
import { TransformedProductCard } from "@/components/TransformedProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { CartProvider, useCart } from "@/hooks/useCart";
import "@/styles/animations.css";

// Interfaces
interface Meal {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  meal_number: number;
  isProduct?: boolean;
  price?: number;
}

interface Day {
  date: Date;
  meals: Meal[];
  visible?: boolean;
}

interface TransformedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  promotionalPrice?: number;
  image_url?: string;
  category: string;
  rating?: number;
  preparation_time?: string;
}

// Configurações para tipos de refeição
const mealTypeConfig = {
  breakfast: {
    label: "Café da manhã",
    gradient: "from-amber-500 to-yellow-500",
    badgeColor: "bg-amber-100 text-amber-800"
  },
  lunch: {
    label: "Almoço",
    gradient: "from-emerald-500 to-green-500",
    badgeColor: "bg-emerald-100 text-emerald-800"
  },
  dinner: {
    label: "Jantar",
    gradient: "from-indigo-500 to-blue-500",
    badgeColor: "bg-indigo-100 text-indigo-800"
  },
  snack: {
    label: "Lanche",
    gradient: "from-orange-500 to-red-500",
    badgeColor: "bg-orange-100 text-orange-800"
  }
};

// Função para determinar se um dia deve ser exibido com base nas configurações
const shouldShowDay = (dayIndex: number, settings?: Settings | null): boolean => {
  if (!settings) return true; // Se não houver configurações, mostrar todos os dias
  
  switch (dayIndex) {
    case 0: return settings.show_sunday;
    case 1: return settings.show_monday;
    case 2: return settings.show_tuesday;
    case 3: return settings.show_wednesday;
    case 4: return settings.show_thursday;
    case 5: return settings.show_friday;
    case 6: return settings.show_saturday;
    default: return true;
  }
};

// Função para normalizar datas para o formato YYYY-MM-DD
const normalizeDate = (date: string | Date): string => {
  try {
    if (typeof date === 'string') {
      // Detectar formato DD/MM/YYYY e converter para YYYY-MM-DD
      if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}`;
      }
      // Se já estiver no formato YYYY-MM-DD, retornar como está
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date;
      }
    }
    
    // Para objetos Date, formatar como YYYY-MM-DD
    if (date instanceof Date) {
      return format(date, 'yyyy-MM-dd');
    }
    
    // Tentar converter string para Date e depois formatar
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      return format(dateObj, 'yyyy-MM-dd');
    }
    
    console.warn('Formato de data não reconhecido:', date);
    return date.toString();
  } catch (error) {
    console.error('Erro ao normalizar data:', error, date);
    return date.toString();
  }
};

// Função para determinar o tipo de refeição com base no meal_number
const getMealType = (mealNumber: number): "breakfast" | "lunch" | "dinner" | "snack" => {
  switch (mealNumber) {
    case 1: return "breakfast";
    case 2: return "lunch";
    case 3: return "dinner";
    default: return "snack";
  }
};

const MenuContent = () => {
  const { id } = useParams();
  const { settings } = useSettings();
  const { isAdmin, userPlan } = useAuth();
  const { isMasterAdmin } = useAdminStatus(settings?.user_id || '');
  const exportRef = useRef(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 0 });
  });

  // Log inicial para confirmar que o componente está sendo renderizado
  console.log('=== MENU CONTENT RENDERIZADO ===');
  console.log('ID do restaurante:', id);
  console.log('Data inicial da semana:', format(currentWeekStart, 'yyyy-MM-dd'));
  console.log('Configurações carregadas:', settings);
  console.log('Nível do plano:', settings?.plan_level);
  console.log('user_id das configurações:', settings?.user_id);
  
  // Estados para controles de interface
  const [showWhatsAppOptions, setShowWhatsAppOptions] = useState(false);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  const [personalizationSettings, setPersonalizationSettings] = useState({
    includeLogo: true,
    includeBackground: true,
    format: 'png' as 'png' | 'pdf' | 'txt',
    emojiStyle: 'modern' as 'modern' | 'classic' | 'minimal'
  });
  
  // Estados para produtos transformados e carrinho
  const [selectedTransformedProduct, setSelectedTransformedProduct] = useState<TransformedProduct | null>(null);
  const [showCart, setShowCart] = useState(false);
  const { items, total, itemCount } = useCart();
  
  // Logos do aplicativo
  const logoColorido = "/logo -seu cardapio- para fundo bege.png";
  const logoPretoBranco = "/logo preto e branco -seu cardapio- para fundo bege.png";

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  // Log detalhado da data da semana atual
  console.log(`📅 Data da semana atual:`, {
    currentWeekStart: currentWeekStart,
    formatted: format(currentWeekStart, "yyyy-MM-dd"),
    dayOfWeek: currentWeekStart.getDay(),
    timestamp: currentWeekStart.getTime()
  });
  
  // Log do produto exemplo para comparação
  console.log(`🎯 Dados do produto exemplo:`, {
    id: 'fc799e06-dc4e-40b9-9f63-0f21ff3d6108',
    user_id: 'e9ebc52f-3ddb-4a47-9bea-bae3fd2a75ba',
    week_start_date: '2025-11-02',
    day_of_week: 5,
    meal_number: 2,
    available: true
  });

  // Teste direto para verificar se o produto existe
  useEffect(() => {
    const testProductExists = async () => {
      console.log(`🧪 TESTANDO EXISTÊNCIA DO PRODUTO...`);
      
      // Teste 1: Buscar pelo ID
      const { data: byId, error: idError } = await supabase
        .from("products")
        .select("*")
        .eq("id", "fc799e06-dc4e-40b9-9f63-0f21ff3d6108");
      
      console.log(`🔍 Busca por ID:`, { data: byId, error: idError });
      
      // Teste 2: Buscar pelo user_id e semana
      const { data: byWeek, error: weekError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", "e9ebc52f-3ddb-4a47-9bea-bae3fd2a75ba")
        .eq("week_start_date", "2025-11-02");
      
      console.log(`📅 Busca por user_id e semana:`, { data: byWeek, error: weekError });
      
      // Teste 3: Buscar todos os produtos do user
      const { data: allProducts, error: allError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", "e9ebc52f-3ddb-4a47-9bea-bae3fd2a75ba");
      
      console.log(`📋 Todos os produtos do user:`, { data: allProducts, error: allError, count: allProducts?.length });
    };
    
    testProductExists();
  }, []);

  const { toast } = useToast();

  // Buscar produtos disponíveis
  const { data: products = [] } = useProducts();
  
  // Buscar produtos transformados da semana atual
  const { data: weekProducts = [] } = useQuery({
    queryKey: ["week-products", currentWeekStart, id],
    queryFn: async () => {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      console.log(`🔍 Buscando produtos transformados para:`, {
        user_id: id,
        week_start_date: weekStart,
        is_transformed: true
      });
      
      // Primeiro tentar buscar com is_transformed = true
      let { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", id)
        .eq("week_start_date", weekStart)
        .eq("is_transformed", true)
        .order("day_of_week")
        .order("meal_number");

      // Se não encontrar nenhum produto transformado, tentar buscar todos os produtos da semana
      if (!data || data.length === 0) {
        console.log(`🔄 Nenhum produto transformado encontrado, tentando buscar todos os produtos da semana...`);
        const { data: allProducts, error: allError } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", id)
          .eq("week_start_date", weekStart)
          .order("day_of_week")
          .order("meal_number");
        
        console.log(`📦 Resultado da busca de todos os produtos:`, {
          data: allProducts,
          error: allError,
          count: allProducts?.length
        });
        
        data = allProducts;
        error = allError;
      }

      console.log(`📦 Resultado final da busca de produtos:`, {
        data: data,
        error: error,
        count: data?.length
      });
      
      // Log específico para verificar o produto do exemplo
      if (data && data.length > 0) {
        const exampleProduct = data.find(p => p.id === 'fc799e06-dc4e-40b9-9f63-0f21ff3d6108');
        if (exampleProduct) {
          console.log(`✅ PRODUTO EXEMPLO ENCONTRADO:`, {
            id: exampleProduct.id,
            name: exampleProduct.name,
            week_start_date: exampleProduct.week_start_date,
            day_of_week: exampleProduct.day_of_week,
            meal_number: exampleProduct.meal_number,
            available: exampleProduct.available
          });
        } else {
          console.log(`❌ PRODUTO EXEMPLO NÃO ENCONTRADO na lista de produtos retornados`);
          console.log(`📋 Produtos retornados:`, data.map(p => ({
            id: p.id,
            name: p.name,
            week_start_date: p.week_start_date,
            day_of_week: p.day_of_week,
            meal_number: p.meal_number
          })));
        }
      }
      
      if (error) throw error;
      return data;
    },
  });
  
  // Filtrar produtos transformados e disponíveis
  const transformedProducts = products.filter(product => product.available);

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ["menus", currentWeekStart, id],
    queryFn: async () => {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("menus")
        .select("*")
        .eq("user_id", id)
        .eq("week_start_date", weekStart)
        .order("day_of_week")
        .order("meal_number");

      if (error) throw error;
      return data;
    },
  });

  // Processar dados para o formato necessário - combinando menus e produtos com validação
  const days: Day[] = Array.from({ length: 7 }, (_, i) => {
    console.log(`=== PROCESSANDO DIA ${i} ===`);
    const date = addDays(currentWeekStart, i);
    const dayOfWeek = i; // Usando o índice como dia da semana (0 = domingo, 1 = segunda, etc.)
    
    // Logs de depuração detalhados para datas
    console.log(`Data atual da semana: ${format(currentWeekStart, 'yyyy-MM-dd')}`);
    console.log(`Dia processado: ${i}, Data calculada: ${format(date, 'yyyy-MM-dd')}`);
    
    // Log dos dados brutos recebidos
    console.log(`Menus recebidos:`, menus.map(m => ({
      id: m.id,
      meal_name: m.meal_name,
      week_start_date: m.week_start_date,
      day_of_week: m.day_of_week,
      meal_number: m.meal_number,
      normalized_date: normalizeDate(m.week_start_date)
    })));
    
    console.log(`Produtos recebidos:`, weekProducts.map(p => ({
      id: p.id,
      name: p.name,
      week_start_date: p.week_start_date,
      day_of_week: p.day_of_week,
      meal_number: p.meal_number,
      normalized_date: normalizeDate(p.week_start_date)
    })));
    
    // Validação de consistência dos dados
    const validateMenu = (menu: any): boolean => {
      return menu && 
             typeof menu.day_of_week === 'number' && 
             menu.day_of_week >= 0 && menu.day_of_week <= 6 &&
             typeof menu.meal_number === 'number' && 
             menu.meal_number >= 1 && menu.meal_number <= 5 &&
             menu.meal_name && menu.meal_name.trim() !== '';
    };

    const validateProduct = (product: any): boolean => {
      return product && 
             typeof product.day_of_week === 'number' && 
             product.day_of_week >= 0 && product.day_of_week <= 6 &&
             typeof product.meal_number === 'number' && 
             product.meal_number >= 1 && product.meal_number <= 5 &&
             product.name && product.name.trim() !== '' &&
             typeof product.price === 'number' && product.price > 0;
    };

    // Filtrar dados inválidos
    const validMenus = menus.filter(validateMenu);
    const validWeekProducts = weekProducts.filter(validateProduct);
    
    console.log(`Dia ${i}: menus válidos=${validMenus.length}, produtos válidos=${validWeekProducts.length}`);
    console.log(`Dia ${i}: menus brutos=${menus.length}, produtos brutos=${weekProducts.length}`);
    
    // VERIFICAR SE USUÁRIO É MASTER ADMIN
    console.log(`=== VERIFICAÇÃO DE MASTER ADMIN ===`);
    console.log(`ID do restaurante: ${id}`);
    console.log(`user_id das configurações: ${settings?.user_id}`);
    console.log(`É master admin: ${isMasterAdmin}`);
    console.log(`Configurações completas:`, settings);
    
    // Se for master admin, usar apenas produtos (substituição completa)
    if (isMasterAdmin) {
      console.log(`🎯 MASTER ADMIN DETECTADO - SUBSTITUINDO TODOS OS MENUS POR PRODUTOS`);
      
      // Criar mapa de produtos para este dia
      const productMap = new Map<string, Meal>();
      
      validWeekProducts
        .filter(product => parseInt(product.day_of_week.toString()) === dayOfWeek)
        .forEach(product => {
          const key = `${product.day_of_week}-${product.meal_number}`;
          if (!productMap.has(key)) { // Evitar sobrescrição
            productMap.set(key, {
              id: product.id,
              title: product.name,
              description: product.description || "",
              image_url: product.image_url,
              type: getMealType(product.meal_number),
              meal_number: product.meal_number,
              isProduct: true,
              price: product.price
            });
          }
        });
      
      // Converter mapa para array e ordenar
      const meals = Array.from(productMap.values()).sort((a, b) => a.meal_number - b.meal_number);
      
      console.log(`Dia ${i}: NÍVEL 3 - ${meals.length} produtos encontrados`);
      
      return {
        date,
        meals,
        visible: shouldShowDay(i, settings)
      };
    }
    
    // Se não for master admin, usar lógica normal de combinação
    console.log(`📋 NÃO É MASTER ADMIN - USANDO COMBINAÇÃO NORMAL`);
    
    // Criar mapas para busca rápida
    const menuMap = new Map<string, Meal>();
    const productMap = new Map<string, any>();
    
    // Mapear menus por chave dia+refeição
    validMenus
      .filter(menu => parseInt(menu.day_of_week.toString()) === dayOfWeek)
      .forEach(menu => {
        const key = `${menu.day_of_week}-${menu.meal_number}`;
        if (!menuMap.has(key)) { // Evitar sobrescrição
          menuMap.set(key, {
            id: menu.id,
            title: menu.meal_name,
            description: menu.description || "",
            image_url: menu.image_url,
            type: getMealType(menu.meal_number),
            meal_number: menu.meal_number
          });
        }
      });
    
    // Mapear produtos por chave dia+refeição
    validWeekProducts
      .filter(product => parseInt(product.day_of_week.toString()) === dayOfWeek)
      .forEach(product => {
        const key = `${product.day_of_week}-${product.meal_number}`;
        if (!productMap.has(key)) { // Evitar sobrescrição
          productMap.set(key, product);
        }
      });
    
    console.log(`Dia ${i}: menus mapeados=${menuMap.size}, produtos mapeados=${productMap.size}`);
    
    // Logs detalhados de comparação
    const weekStartFormatted = format(currentWeekStart, 'yyyy-MM-dd');
    console.log(`Comparando com week_start_date: ${weekStartFormatted}`);
    
    validMenus.forEach(menu => {
      const menuWeekStart = normalizeDate(menu.week_start_date);
      console.log(`Menu ${menu.id}: week_start_date original=${menu.week_start_date}, normalizado=${menuWeekStart}, dia_semana=${menu.day_of_week}, meal_number=${menu.meal_number}, match=${menuWeekStart === weekStartFormatted && menu.day_of_week === dayOfWeek}`);
    });
    
    validWeekProducts.forEach(product => {
      const productWeekStart = normalizeDate(product.week_start_date);
      console.log(`Produto ${product.id}: week_start_date original=${product.week_start_date}, normalizado=${productWeekStart}, dia_semana=${product.day_of_week}, meal_number=${product.meal_number}, match=${productWeekStart === weekStartFormatted && product.day_of_week === dayOfWeek}`);
    });
    
    // Combinar: priorizar produtos, manter menus sem produtos correspondentes
    const combinedMeals: Meal[] = [];
    const processedKeys = new Set<string>();
    
    // Primeiro adicionar produtos (com prioridade)
    productMap.forEach((product, key) => {
      combinedMeals.push({
        id: product.id,
        title: product.name,
        description: product.description || "",
        image_url: product.image_url,
        type: getMealType(product.meal_number),
        meal_number: product.meal_number,
        isProduct: true,
        price: product.price
      });
      processedKeys.add(key);
    });
    
    // Depois adicionar menus que não têm produtos correspondentes
    menuMap.forEach((menu, key) => {
      if (!processedKeys.has(key)) {
        combinedMeals.push(menu);
      }
    });
    
    // Ordenar por meal_number
    combinedMeals.sort((a, b) => a.meal_number - b.meal_number);
    
    console.log(`Dia ${i}: total de refeições combinadas=${combinedMeals.length}`);
    console.log(`=== FINALIZADO DIA ${i} ===`);
    
    return {
      date,
      meals: combinedMeals,
      visible: shouldShowDay(i, settings)
    };
  });

  // Componente para exibir um card de refeição
  const MealCard = ({ meal, day, onTransformToProduct, cartEnabled = true }: { meal: Meal; day: Day; onTransformToProduct?: (product: TransformedProduct) => void; cartEnabled?: boolean }) => {
    // Validação básica dos dados do meal
    if (!meal || !meal.title || meal.title.trim() === '') {
      console.warn('MealCard recebido com dados inválidos:', meal);
      return null;
    }

    const config = mealTypeConfig[meal.type];
    
    // Se for um produto (já transformado), mostrar como produto
    if (meal.isProduct) {
      // Validação adicional para produtos
      if (!meal.price || meal.price <= 0) {
        console.warn('Produto com preço inválido:', meal);
        return null;
      }

      return (
        <div 
          className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm shadow-md transition-all hover:shadow-lg cursor-pointer"
          onClick={() => onTransformToProduct && onTransformToProduct({
            id: meal.id,
            name: meal.title,
            description: meal.description || 'Produto transformado',
            price: meal.price,
            image_url: meal.image_url,
            category: config?.label || 'Produto',
            preparation_time: "40 minutos"
          })}
        >
          <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-r from-green-500 to-emerald-500 mix-blend-overlay"></div>
          
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
              <Package className="w-3 h-3 mr-1" />
              Produto
            </span>
          </div>
          
          <div className="flex">
            {meal.image_url ? (
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden">
                <img 
                  src={meal.image_url} 
                  alt={meal.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/100x100/orange/white?text=Sem+Imagem";
                  }}
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
                <Package className="h-10 w-10 text-green-300" />
              </div>
            )}
            
            <div className="flex flex-1 flex-col p-3">
              <h3 className="font-medium text-gray-900 line-clamp-1">{meal.title}</h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{meal.description}</p>
              {meal.price && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    R$ {meal.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500">Clique para ver detalhes</span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // Card de refeição normal
    return (
      <div className="group relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm shadow-md transition-all hover:shadow-lg">
        <div className={`absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-r ${config?.gradient || 'from-orange-500 to-amber-500'} mix-blend-overlay`}></div>
        
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config?.badgeColor || 'bg-orange-100 text-orange-800'}`}>
            {config?.label || 'Refeição'}
          </span>
        </div>
        
        <div className="flex">
          {meal.image_url ? (
            <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden">
              <img 
                src={meal.image_url} 
                alt={meal.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/100x100/orange/white?text=Sem+Imagem";
                }}
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
              <UtensilsCrossed className="h-10 w-10 text-orange-300" />
            </div>
          )}
          
          <div className="flex flex-1 flex-col p-3">
            <h3 className="font-medium text-gray-900 line-clamp-1">{meal.title}</h3>
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{meal.description}</p>
          </div>
      </div>
      
    </div>
  );
};

  // Componente para exibir um card de dia vazio
  const EmptyDayCard = () => (
    <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-blue-50/20 to-blue-100/20 backdrop-blur-sm p-6 text-center">
      <div className="mb-3 rounded-full bg-white/20 backdrop-blur-sm p-3 shadow-sm">
        <UtensilsCrossed className="h-8 w-8 text-blue-300" />
      </div>
      <h3 className="text-lg font-medium text-gray-700">Nenhum cardápio cadastrado para este dia</h3>
      <p className="mt-1 text-sm text-gray-500">Em breve teremos novidades deliciosas!</p>
    </div>
  );

  // Componente para exibir um card de dia
  const DayCard = ({ day }: { day: Day }) => {
    // Validação do dia
    if (!day || !day.date) {
      console.warn('DayCard recebido com dados inválidos:', day);
      return null;
    }

    const dayName = format(day.date, 'EEEE', { locale: ptBR });
    const dayNumber = format(day.date, 'd', { locale: ptBR });
    const monthName = format(day.date, 'MMMM', { locale: ptBR });

    const handleTransformToProduct = (product: TransformedProduct) => {
      setSelectedTransformedProduct(product);
    };
    
    // Validação das refeições do dia
    const validMeals = day.meals?.filter(meal => {
      if (!meal || !meal.title || meal.title.trim() === '') {
        console.warn('Refeição inválida encontrada:', meal);
        return false;
      }
      return true;
    }) || [];
    
    return (
      <div className="overflow-hidden rounded-xl bg-white/10 backdrop-blur-sm shadow-md">
        <div className="flex items-center border-l-4 border-orange-500 bg-gradient-to-r from-orange-50 to-transparent p-4">
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-sm">
            <span className="text-lg font-bold text-gray-700">{dayNumber}</span>
          </div>
          <div>
            <h3 className="text-lg font-medium capitalize text-gray-900">{dayName}</h3>
            <p className="text-sm text-gray-500 capitalize">{dayNumber} de {monthName}</p>
          </div>
        </div>
        
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            </div>
          ) : validMeals.length > 0 ? (
            // Mostrar as refeições combinadas (produtos e menus)
            <ul className="space-y-3">
              {validMeals.map(meal => (
                <li key={meal.id}>
                  <MealCard meal={meal} day={day} onTransformToProduct={handleTransformToProduct} cartEnabled={settings?.plan_level === 2 || settings?.plan_level === 3 || isMasterAdmin} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyDayCard />
          )}
        </div>
      </div>
    );
  };

  const exportAsPNG = async () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }
    
    try {
      // Ocultar a div sticky temporariamente
      const stickyElement = document.querySelector('.sticky');
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = 'none';
      }
      
      // Capturar toda a página com o background
      const element = document.querySelector('.min-h-screen');
      if (!element) return;
      
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Manter background transparente para capturar orbes
        width: element.clientWidth,
        height: element.clientHeight,
        windowWidth: element.clientWidth,
        windowHeight: element.clientHeight,
      });
      
      // Restaurar a visibilidade da div sticky
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = '';
      }
      
      const link = document.createElement("a");
      link.download = `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast({ title: "Cardápio exportado com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar PNG:", error);
      toast({ title: "Erro ao exportar cardápio", variant: "destructive" });
    }
  };

  const exportAsPDF = async () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para exportar", variant: "destructive" });
      return;
    }
    
    try {
      // Ocultar a div sticky temporariamente
      const stickyElement = document.querySelector('.sticky');
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = 'none';
      }
      
      // Capturar toda a página com o background para PDF
      const element = document.querySelector('.min-h-screen');
      if (!element) return;
      
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Manter background transparente para capturar orbes
        width: element.clientWidth,
        height: element.clientHeight,
        windowWidth: element.clientWidth,
        windowHeight: element.clientHeight,
      });
      
      // Restaurar a visibilidade da div sticky
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = '';
      }
      
      const imgData = canvas.toDataURL("image/png");
      
      // Criar PDF no formato A4 retrato (vertical)
      const pdf = new jsPDF({
        orientation: "portrait", // Mudar para retrato (vertical)
        unit: "mm",
        format: "a4", // Formato A4 padrão
      });
      
      // Calcular dimensões para caber a imagem no A4 retrato
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular proporção para caber a imagem na página
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const canvasRatio = canvasWidth / canvasHeight;
      const pdfRatio = pdfWidth / pdfHeight;
      
      let imgWidth, imgHeight, x, y;
      
      if (canvasRatio > pdfRatio) {
        // Imagem mais larga que a página - ajustar largura
        imgWidth = pdfWidth - 20; // Margem de 10mm de cada lado
        imgHeight = imgWidth / canvasRatio;
        x = 10; // Margem esquerda
        y = (pdfHeight - imgHeight) / 2; // Centralizar verticalmente
      } else {
        // Imagem mais alta que a página - ajustar altura
        imgHeight = pdfHeight - 20; // Margem de 10mm em cima e embaixo
        imgWidth = imgHeight * canvasRatio;
        y = 10; // Margem superior
        x = (pdfWidth - imgWidth) / 2; // Centralizar horizontalmente
      }
      
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      pdf.save(`cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
      
      toast({ title: "PDF exportado com sucesso!" });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    }
  };

  const generateAndDownloadPNG = async () => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para compartilhar", variant: "destructive" });
      return;
    }
    
    try {
      const element = document.getElementById("export-container");
      if (!element) return;
      
      element.style.display = "block";
      
      const canvas = await html2canvas(element.firstChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      
      element.style.display = "none";
      
      // Converter para Blob
      canvas.toBlob(blob => {
        if (!blob) {
          toast({ title: "Erro ao gerar imagem", variant: "destructive" });
          return;
        }
        
        // Criar URL temporária
        const file = new File([blob], "cardapio.png", { type: "image/png" });
        const fileUrl = URL.createObjectURL(file);
        
        // Sempre oferecer download da imagem (evita bloqueio por popup)
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.png`;
        link.click();
        toast({ title: "Imagem do cardápio gerada e baixada" });
      }, "image/png");
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      toast({ title: "Erro ao compartilhar cardápio", variant: "destructive" });
    }
  };

  const shareViaWhatsApp = (fileUrl: string) => {
    const text = `Cardápio da semana de ${format(currentWeekStart, "dd/MM", { locale: ptBR })} a ${format(
      addDays(currentWeekStart, 6),
      "dd/MM",
      { locale: ptBR }
    )}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
    
    // Como não podemos enviar a imagem diretamente via URL, oferecemos download
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.png`;
    link.click();
    
    toast({ title: "Imagem baixada para compartilhamento" });
  };

  // Função para gerar texto formatado com emojis para WhatsApp
  const generateWhatsAppText = (): string => {
    const emojiStyles = {
      modern: {
        breakfast: "🥐☕",
        lunch: "🍽️🥗",
        dinner: "🍽️🍷",
        snack: "🍎🥜",
        separator: "•",
        title: "📋",
        week: "📅",
        logo: "🍽️"
      },
      classic: {
        breakfast: "🌅",
        lunch: "☀️",
        dinner: "🌙",
        snack: "🍎",
        separator: "-",
        title: "📄",
        week: "📆",
        logo: "🏪"
      },
      minimal: {
        breakfast: "🥄",
        lunch: "🍴",
        dinner: "🍴",
        snack: "🥨",
        separator: "•",
        title: "",
        week: "",
        logo: ""
      }
    };

    const emojis = emojiStyles[personalizationSettings.emojiStyle];
    
    let text = "";
    
    // Cabeçalho
    if (personalizationSettings.includeLogo) {
      text += `${emojis.logo} *SEU CARDÁPIO* ${emojis.logo}\\n\\n`;
    }
    
    text += `${emojis.week} *Cardápio da semana:*\\n`;
    text += `*${format(currentWeekStart, "dd/MM", { locale: ptBR })}* a *${format(
      addDays(currentWeekStart, 6),
      "dd/MM",
      { locale: ptBR }
    )}*\\n\\n`;
    
    // Adicionar refeições por dia
    days.forEach((day, index) => {
      if (!day.visible || day.meals.length === 0) return;
      
      const dayName = format(day.date, "EEEE", { locale: ptBR });
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      
      text += `*${capitalizedDay}* ${emojis.separator} *${format(day.date, "dd/MM")}*\\n`;
      
      day.meals.forEach(meal => {
        const config = mealTypeConfig[meal.type];
        const mealEmoji = emojis[meal.type as keyof typeof emojis];
        
        text += `  ${mealEmoji} *${config.label}:* ${meal.title}\\n`;
        if (meal.description) {
          text += `    _${meal.description}_\\n`;
        }
      });
      
      text += "\\n";
    });
    
    // Rodapé
    text += "\\n*${emojis.title} Bom apetite!* 🍽️\\n";
    if (settings?.companyName) {
      text += `_${settings.companyName}_`;
    }
    
    return text;
  };

  // Função para compartilhar via WhatsApp com opções
  const openWhatsAppWithText = (text: string) => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleWhatsAppShare = async (format: 'png' | 'pdf' | 'txt') => {
    if (!menus.length) {
      toast({ title: "Nenhum cardápio para compartilhar", variant: "destructive" });
      return;
    }
    
    setShowWhatsAppOptions(false);
    
    try {
      if (format === 'txt') {
        // Compartilhar texto diretamente
        const text = generateWhatsAppText();
        openWhatsAppWithText(text);
        toast({ title: "Cardápio em texto enviado para WhatsApp!" });
      } else if (format === 'png') {
        // Abrir WhatsApp imediatamente e gerar imagem para baixar
        const textIntro = `${generateWhatsAppText()}\n\nA imagem do cardápio será baixada em seguida. Anexe-a na conversa.`;
        openWhatsAppWithText(textIntro);
        await generateAndDownloadPNG();
      } else if (format === 'pdf') {
        // Abrir WhatsApp imediatamente e gerar PDF para baixar
        const textIntro = `${generateWhatsAppText()}\n\nO PDF do cardápio será baixado em seguida. Anexe-o na conversa.`;
        openWhatsAppWithText(textIntro);
        await shareWhatsAppPDF();
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      toast({ title: "Erro ao compartilhar cardápio", variant: "destructive" });
    }
  };

  // Função para compartilhar PDF via WhatsApp
  const shareWhatsAppPDF = async () => {
    try {
      // Ocultar a div sticky temporariamente
      const stickyElement = document.querySelector('.sticky');
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = 'none';
      }
      
      // Capturar toda a página com o background para PDF
      const element = document.querySelector('.min-h-screen');
      if (!element) return;
      
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: element.clientWidth,
        height: element.clientHeight,
        windowWidth: element.clientWidth,
        windowHeight: element.clientHeight,
      });
      
      // Restaurar a visibilidade da div sticky
      if (stickyElement) {
        (stickyElement as HTMLElement).style.display = '';
      }
      
      const imgData = canvas.toDataURL("image/png");
      
      // Criar PDF no formato A4 retrato
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const canvasRatio = canvasWidth / canvasHeight;
      const pdfRatio = pdfWidth / pdfHeight;
      
      let imgWidth, imgHeight, x, y;
      
      if (canvasRatio > pdfRatio) {
        imgWidth = pdfWidth - 20;
        imgHeight = imgWidth / canvasRatio;
        x = 10;
        y = (pdfHeight - imgHeight) / 2;
      } else {
        imgHeight = pdfHeight - 20;
        imgWidth = imgHeight * canvasRatio;
        y = 10;
        x = (pdfWidth - imgWidth) / 2;
      }
      
      pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
      
      // Salvar PDF e criar link para download
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`, { type: 'application/pdf' });
      const fileUrl = URL.createObjectURL(file);
      
      // Criar mensagem com link para download
      const text = `Cardápio da semana de ${format(currentWeekStart, "dd/MM", { locale: ptBR })} a ${format(
        addDays(currentWeekStart, 6),
        "dd/MM",
        { locale: ptBR }
      )}\\n\\nPDF anexado! 📄`;
      
      // Não abrir WhatsApp aqui para evitar bloqueio; já abrimos antes
      
      // Oferecer download do PDF
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `cardapio-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`;
      link.click();
      
      toast({ title: "PDF do cardápio gerado e baixado" });
    } catch (error) {
      console.error("Erro ao gerar PDF para WhatsApp:", error);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  // Componente do Modal de Personalização
  const PersonalizationModal = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Personalizar Exportação</h2>
            <button
              onClick={() => setShowPersonalizationModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={personalizationSettings.includeLogo}
                  onChange={(e) => setPersonalizationSettings(prev => ({ ...prev, includeLogo: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Incluir logo/título</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={personalizationSettings.includeBackground}
                  onChange={(e) => setPersonalizationSettings(prev => ({ ...prev, includeBackground: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Incluir background</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato padrão para exportação
              </label>
              <select
                value={personalizationSettings.format}
                onChange={(e) => setPersonalizationSettings(prev => ({ ...prev, format: e.target.value as 'png' | 'pdf' | 'txt' }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="png">PNG</option>
                <option value="pdf">PDF</option>
                <option value="txt">TXT</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estilo de emojis
              </label>
              <select
                value={personalizationSettings.emojiStyle}
                onChange={(e) => setPersonalizationSettings(prev => ({ ...prev, emojiStyle: e.target.value as 'modern' | 'classic' | 'minimal' }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="modern">Moderno (🥐☕ 🍽️🥗)</option>
                <option value="classic">Clássico (🌅 ☀️ 🌙)</option>
                <option value="minimal">Minimalista (🥄 🍴)</option>
              </select>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setShowPersonalizationModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowPersonalizationModal(false);
                  toast({ title: "Configurações salvas com sucesso!" });
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {console.log('=== RENDERIZANDO COMPONENTE MENU ===')}
      {console.log('Estado de carregamento:', isLoading)}
      {console.log('Quantidade de dias da semana:', days.length)}
      {console.log('Nível do plano:', settings?.plan_level)}
      {console.log('ID do restaurante (URL):', id)}
      {console.log('Settings completo:', settings)}
      {console.log('É admin (usuário logado)?', isAdmin)}
      {console.log('É master admin (dono do restaurante)?', isMasterAdmin)}
      
      {/* Painel de Depuração para Master Admin */}
      <div className="bg-blue-100 border-b border-blue-300 p-2 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-4">
            <span className="text-blue-800 font-bold">🔍 DEPURAÇÃO</span>
            <span className="text-blue-700">Restaurante: {id}</span>
            <span className="text-blue-700">É Master Admin: {isMasterAdmin ? 'Sim' : 'Não'}</span>
            <span className="text-blue-700">Semana: {format(currentWeekStart, 'yyyy-MM-dd')}</span>
            <span className="text-blue-700">Menus: {menus.length}</span>
            <span className="text-blue-700">Produtos: {weekProducts.length}</span>
            {isMasterAdmin && (
              <span className="text-green-800 font-bold ml-4">🎯 MASTER ADMIN ATIVADO</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Painel de Master Admin (apenas quando ativo) */}
      {isMasterAdmin && (
        <div className="bg-green-100 border-b border-green-300 p-2 text-xs font-mono">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center space-x-4">
              <span className="text-green-800 font-bold">🎯 MASTER ADMIN ATIVADO</span>
              <span className="text-green-700">Substituição ativa: 100%</span>
              <span className="text-green-700">Menus ocultos: {menus.length}</span>
              <span className="text-green-700">Produtos visíveis: {weekProducts.length}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Componente Background com orbes animadas */}
      <Background />
      
      {/* Cabeçalho centralizado com logo */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 flex flex-col items-center justify-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-4 sm:gap-16">
            <img src={logoColorido} alt="Seu Cardápio" className="h-12 w-auto sm:h-16" />
            {settings?.logo_url && (
              <img src={settings.logo_url} alt={settings?.companyName || "Logo da Empresa"} className="h-12 w-auto sm:h-16" />
            )}
          </div>
          <h2 className="text-4xl font-bold text-gray-900">Cardápio Semanal</h2>
          <p className="mt-2 text-center text-gray-600">Refeições deliciosas e balanceadas para sua semana</p>
        </div>
        
        {/* Barra de navegação fixa */}
        <div className="sticky top-2 sm:top-4 z-40 mb-4 sm:mb-6 w-full flex flex-col sm:flex-row items-center sm:items-center justify-evenly sm:justify-between rounded-xl bg-white/10 backdrop-blur-md p-2 sm:p-3 shadow-md gap-2 text-center">
          <div className="w-full sm:w-auto flex items-center justify-center flex-wrap gap-2 sm:gap-1">
            <button
              onClick={goToPreviousWeek}
              className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            >
              <ChevronLeft className="h-6 w-6 sm:h-5 sm:w-5" />
            </button>
            
            {(() => {
              const firstVisibleDay = days.find(d => d.visible !== false);
              const lastVisibleDay = [...days].reverse().find(d => d.visible !== false);
              const startDate = firstVisibleDay?.date || currentWeekStart;
              const endDate = lastVisibleDay?.date || addDays(currentWeekStart, 6);
              return (
                <div className="text-xs sm:text-sm font-medium">
                  Semana do dia <span className="font-semibold">{format(startDate, 'd', { locale: ptBR })}</span> ao dia <span className="font-semibold">{format(endDate, 'd', { locale: ptBR })}</span>
                </div>
              );
            })()}
            
            <button
              onClick={goToNextWeek}
              className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
            >
              <ChevronRight className="h-6 w-6 sm:h-5 sm:w-5" />
            </button>
            
            <button
              onClick={goToCurrentWeek}
              className="ml-1 rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 hidden sm:inline"
            >
              Voltar para semana atual
            </button>
          </div>
          
          <div className="w-full sm:w-auto flex items-center justify-center flex-wrap gap-2 sm:gap-1 overflow-x-auto max-w-full -mx-1 px-1">
            <button
              onClick={exportAsPNG}
              className="flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
              title="Exportar como PNG"
            >
              <Camera className="h-6 w-6 sm:h-5 sm:w-5" />
              <span className="ml-1 hidden sm:inline">PNG</span>
            </button>
            
            <button
              onClick={exportAsPDF}
              className="flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
              title="Exportar como PDF"
            >
              <FileText className="h-6 w-6 sm:h-5 sm:w-5" />
              <span className="ml-1 hidden sm:inline">PDF</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowWhatsAppOptions(!showWhatsAppOptions)}
                className="flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
                title="Compartilhar no WhatsApp"
              >
                <img src="/whatsapp.png" alt="WhatsApp" className="h-6 w-6 sm:h-5 sm:w-5 object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/whatsapp.svg'; }} />
                <span className="ml-1 hidden sm:inline">WhatsApp</span>
              </button>
              
              {showWhatsAppOptions && (
                <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => handleWhatsAppShare('png')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Compartilhar como PNG
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare('pdf')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Compartilhar como PDF
                    </button>
                    <button
                      onClick={() => handleWhatsAppShare('txt')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Compartilhar como Texto
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Botão Personalizar - apenas para ADM */}
            {isAdmin && (
              <button
                onClick={() => setShowPersonalizationModal(true)}
                className="flex items-center rounded-lg p-2 text-gray-700 hover:bg-gray-100"
                title="Personalizar"
              >
                <Settings className="h-5 w-5" />
                <span className="ml-1 hidden sm:inline">Personalizar</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Lista de dias da semana */}
        <div className="space-y-4">
          {days
            .filter(day => day.visible !== false)
            .map((day, index) => (
              <DayCard key={index} day={day} />
            ))}
        </div>

        {/* Sugestões dos colaboradores */}
        <div className="mt-8">
          <MealSuggestions />
        </div>
      </div>
      
      {/* Elemento para exportação */}
      <div id="export-container" className="fixed left-[-9999px] top-[-9999px] hidden">
        <div
          ref={exportRef}
          className="w-[800px] bg-white/10 backdrop-blur-sm p-8"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <img src={logoPretoBranco} alt="Seu Cardápio" className="mr-2 h-12 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Seu Cardápio</h1>
                <p className="text-sm text-gray-500">
                  {(() => {
                    const firstVisibleDay = days.find(d => d.visible !== false);
                    const lastVisibleDay = [...days].reverse().find(d => d.visible !== false);
                    const startDate = firstVisibleDay?.date || currentWeekStart;
                    const endDate = lastVisibleDay?.date || addDays(currentWeekStart, 6);
                    return (
                      <>
                        Semana do dia <span className="font-semibold">{format(startDate, 'dd/MM/yyyy', { locale: ptBR })}</span> ao dia <span className="font-semibold">{format(endDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-medium text-gray-900">{settings?.companyName || "Sua Empresa"}</h2>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-4">
            {days.map((day, index) => (
              <div key={index} className="rounded border border-gray-200 bg-white/10 backdrop-blur-sm">
                <div className="border-b border-gray-200 bg-gray-50/20 backdrop-blur-sm p-2">
                  <h3 className="text-center font-medium capitalize text-gray-900">
                    {format(day.date, 'EEEE', { locale: ptBR })}
                  </h3>
                  <p className="text-center text-sm text-gray-500">
                    {format(day.date, 'd/MM', { locale: ptBR })}
                  </p>
                </div>
                <div className="p-3">
                  {day.meals.length > 0 ? (
                    <div className="space-y-3">
                      {day.meals.map(meal => (
                        <div key={meal.id} className="border-b border-gray-100 pb-2 last:border-0">
                          <h4 className="font-medium text-gray-900">{mealTypeConfig[meal.type].label}</h4>
                          <p className="text-sm font-medium">{meal.title}</p>
                          <p className="text-xs text-gray-500">{meal.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-2 text-center text-sm text-gray-500">Sem refeições</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Modais */}
      {showPersonalizationModal && <PersonalizationModal />}

      {/* Overlay para fechar o toggle do WhatsApp */}
      {showWhatsAppOptions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowWhatsAppOptions(false)}
        />
      )}

      {/* Badge flutuante: Criado por + Crie o seu também - oculto para níveis 2 e 3 */}
      {userPlan !== 'professional' && userPlan !== 'premium' && (
        <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-full border bg-white/20 backdrop-blur-sm px-3 py-1 text-xs shadow-sm hover:bg-white/30"
            title="Criado por Seu Cardápio"
          >
            <span className="text-gray-700">Criado por</span>
            <img src={logoColorido} alt="Seu Cardápio" className="h-[1.5rem] w-auto" />
          </Link>
          <Link
            to="/auth"
            className="rounded-full border bg-orange-500/90 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-orange-500"
            title="Crie o seu também"
          >
            Crie o seu também
          </Link>
        </div>
      )}
      
      {/* Botão fixo do carrinho - apenas para níveis 2 e 3 e Master Admin */}
      {(settings?.plan_level === 2 || settings?.plan_level === 3 || isMasterAdmin) && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 z-50"
        >
          <ShoppingCart className="h-6 w-6" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
              {itemCount}
            </span>
          )}
        </button>
      )}
      
      {/* Card do produto transformado (desliza de baixo para cima) - apenas para níveis 2 e 3 e Master Admin */}
      {selectedTransformedProduct && (settings?.plan_level === 2 || settings?.plan_level === 3 || isMasterAdmin) && (
        <TransformedProductCard
          product={selectedTransformedProduct}
          onClose={() => setSelectedTransformedProduct(null)}
          onAddToCart={() => setSelectedTransformedProduct(null)}
          cartEnabled={settings?.plan_level === 2 || settings?.plan_level === 3 || isMasterAdmin}
        />
      )}
      
      {/* Carrinho (desliza de baixo para cima) */}
      <CartDrawer
        isOpen={showCart}
        onClose={() => setShowCart(false)}
      />
    </div>
  );
};

const Menu = () => {
  return (
    <CartProvider>
      <MenuContent />
    </CartProvider>
  );
};

export default Menu;

// Validação adicional ao carregar o componente principal
(() => {
  // Log de depuração para validar os dados da semana
  console.log('Componente Menu carregado. Verificando integridade dos dados...');
  
  // Adicionar validação de segurança para garantir que os dados estão corretos
  const validateMenuData = () => {
    try {
      // Verificar se há dados válidos no localStorage ou contexto
      const menuData = localStorage.getItem('menuData');
      if (menuData) {
        const parsed = JSON.parse(menuData);
        console.log('Dados do menu encontrados:', parsed);
      }
    } catch (error) {
      console.warn('Erro ao validar dados do menu:', error);
    }
  };
  
  // Executar validação após um pequeno delay para garantir que tudo está carregado
  setTimeout(validateMenuData, 1000);
})();
