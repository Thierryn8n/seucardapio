import { mercadoPagoService } from "./mercadopago.service";
import { supabase } from "@/integrations/supabase/client";
import type { MercadoPagoSplitPayment } from "./mercadopago.types";

export class MercadoPagoSplitService {
  
  // Configuração de split para administradores
  private static readonly ADMIN_SPLIT_PERCENTAGE = 0.10; // 10% para o administrador
  private static readonly MARKETPLACE_FEE_PERCENTAGE = 0.05; // 5% de taxa do marketplace

  static async createSplitPayment(orderData: {
    amount: number;
    description: string;
    payerEmail: string;
    payerName: string;
    externalReference: string;
    restaurantId: string;
    adminId: string;
  }): Promise<{ id: string; init_point: string }> {
    try {
      // Calcular divisão do pagamento
      const splitCalculation = this.calculateSplit(
        orderData.amount,
        orderData.restaurantId,
        orderData.adminId
      );

      // Criar pagamento com split
      const splitData = {
        items: [{
          title: orderData.description,
          quantity: 1,
          currency_id: "BRL",
          unit_price: orderData.amount,
        }],
        payer: {
          email: orderData.payerEmail,
          name: orderData.payerName,
        },
        external_reference: orderData.externalReference,
        back_urls: {
          success: `${window.location.origin}/payment/success`,
          failure: `${window.location.origin}/payment/failure`,
          pending: `${window.location.origin}/payment/pending`,
        },
        auto_return: "approved",
        notification_url: `${window.location.origin}/api/webhooks/mercadopago/split`,
        marketplace: "colab-eats",
        marketplace_fee: splitCalculation.marketplaceFee,
        collectors: splitCalculation.collectors,
        payment_methods: {
          excluded_payment_types: [],
          installments: 12,
        },
      };

      // Criar preferência de pagamento com split
      const response = await mercadoPagoService.createSplitPreference(splitData);

      // Registrar split no banco de dados
      await this.logSplitPayment({
        order_id: orderData.externalReference,
        total_amount: orderData.amount,
        restaurant_amount: splitCalculation.restaurantAmount,
        admin_amount: splitCalculation.adminAmount,
        marketplace_fee: splitCalculation.marketplaceFee,
        restaurant_id: orderData.restaurantId,
        admin_id: orderData.adminId,
        mercado_pago_preference_id: response.id,
      });

      return response;
      
    } catch (error) {
      console.error("Erro ao criar split payment:", error);
      throw error;
    }
  }

  private static calculateSplit(
    totalAmount: number,
    restaurantId: string,
    adminId: string
  ): {
    restaurantAmount: number;
    adminAmount: number;
    marketplaceFee: number;
    collectors: Array<{ id: string; amount: number; fee: number }>;
  } {
    // Calcular valores
    const marketplaceFee = Math.round(totalAmount * this.MARKETPLACE_FEE_PERCENTAGE * 100) / 100;
    const adminAmount = Math.round(totalAmount * this.ADMIN_SPLIT_PERCENTAGE * 100) / 100;
    const restaurantAmount = totalAmount - adminAmount - marketplaceFee;

    // Obter IDs do Mercado Pago
    const restaurantMpId = this.getMercadoPagoCollectorId(restaurantId);
    const adminMpId = this.getMercadoPagoCollectorId(adminId);

    return {
      restaurantAmount,
      adminAmount,
      marketplaceFee,
      collectors: [
        {
          id: restaurantMpId,
          amount: restaurantAmount,
          fee: 0,
        },
        {
          id: adminMpId,
          amount: adminAmount,
          fee: 0,
        },
      ],
    };
  }

  private static getMercadoPagoCollectorId(userId: string): string {
    // Mapear IDs do sistema para IDs do Mercado Pago
    // Isso deve ser configurado no banco de dados
    const collectorMap: Record<string, string> = {
      "admin-1": "123456789", // ID do Mercado Pago do administrador principal
      "restaurant-1": "987654321", // ID do Mercado Pago do restaurante
    };

    return collectorMap[userId] || userId;
  }

  private static async logSplitPayment(data: {
    order_id: string;
    total_amount: number;
    restaurant_amount: number;
    admin_amount: number;
    marketplace_fee: number;
    restaurant_id: string;
    admin_id: string;
    mercado_pago_preference_id: string;
  }): Promise<void> {
    const { error } = await supabase
      .from("split_payment_logs")
      .insert({
        order_id: data.order_id,
        total_amount: data.total_amount,
        restaurant_amount: data.restaurant_amount,
        admin_amount: data.admin_amount,
        marketplace_fee: data.marketplace_fee,
        restaurant_id: data.restaurant_id,
        admin_id: data.admin_id,
        mercado_pago_preference_id: data.mercado_pago_preference_id,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Erro ao registrar split payment:", error);
    }
  }

  static async processSplitWebhook(payload: any): Promise<void> {
    try {
      const { type, data } = payload;

      if (type === "payment" && data.id) {
        const paymentId = data.id;
        
        // Buscar detalhes do pagamento
        const payment = await mercadoPagoService.getPayment(paymentId);
        
        if (payment.status === "approved") {
          // Processar divisão do pagamento
          await this.processApprovedSplitPayment(payment);
        }
      }
      
    } catch (error) {
      console.error("Erro ao processar webhook de split payment:", error);
      throw error;
    }
  }

  private static async processApprovedSplitPayment(payment: any): Promise<void> {
    try {
      // Buscar informações do split no banco
      const { data: splitLog } = await supabase
        .from("split_payment_logs")
        .select("*")
        .eq("mercado_pago_preference_id", payment.preference_id)
        .single();

      if (!splitLog) {
        console.warn("Split payment log não encontrado para preferência:", payment.preference_id);
        return;
      }

      // Atualizar status do pagamento
      const { error: updateError } = await supabase
        .from("split_payment_logs")
        .update({
          status: "approved",
          mercado_pago_payment_id: payment.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", splitLog.id);

      if (updateError) {
        throw updateError;
      }

      // Notificar partes envolvidas
      await this.notifySplitPaymentParticipants(splitLog);

      console.log(`Split payment processado: ${payment.id}`);
      
    } catch (error) {
      console.error("Erro ao processar split payment aprovado:", error);
      throw error;
    }
  }

  private static async notifySplitPaymentParticipants(splitLog: any): Promise<void> {
    try {
      // Notificar restaurante
      await this.notifyRestaurant(splitLog.restaurant_id, {
        amount: splitLog.restaurant_amount,
        order_id: splitLog.order_id,
        type: "payment_received",
      });

      // Notificar administrador
      await this.notifyAdmin(splitLog.admin_id, {
        amount: splitLog.admin_amount,
        order_id: splitLog.order_id,
        type: "commission_received",
      });
      
    } catch (error) {
      console.error("Erro ao notificar participantes do split:", error);
    }
  }

  private static async notifyRestaurant(restaurantId: string, data: any): Promise<void> {
    // Implementar notificação para o restaurante
    console.log(`Notificando restaurante ${restaurantId}:`, data);
    
    // Aqui você pode implementar:
    // - Envio de email
    // - Notificação push
    // - Atualização de dashboard em tempo real
  }

  private static async notifyAdmin(adminId: string, data: any): Promise<void> {
    // Implementar notificação para o administrador
    console.log(`Notificando administrador ${adminId}:`, data);
    
    // Aqui você pode implementar:
    // - Envio de email
    // - Notificação push
    // - Atualização de dashboard em tempo real
  }

  static async getSplitPaymentReport(filters: {
    startDate?: string;
    endDate?: string;
    restaurantId?: string;
    adminId?: string;
    status?: string;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from("split_payment_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      if (filters.restaurantId) {
        query = query.eq("restaurant_id", filters.restaurantId);
      }

      if (filters.adminId) {
        query = query.eq("admin_id", filters.adminId);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
      
    } catch (error) {
      console.error("Erro ao buscar relatório de split payments:", error);
      throw error;
    }
  }

  static async getSplitPaymentStats(userId: string, userType: "restaurant" | "admin"): Promise<{
    totalReceived: number;
    totalPending: number;
    totalTransactions: number;
    monthlyAverage: number;
  }> {
    try {
      const column = userType === "restaurant" ? "restaurant_id" : "admin_id";
      
      const { data, error } = await supabase
        .from("split_payment_logs")
        .select("total_amount, restaurant_amount, admin_amount, status, created_at")
        .eq(column, userId);

      if (error) {
        throw error;
      }

      const payments = data || [];
      
      const amountField = userType === "restaurant" ? "restaurant_amount" : "admin_amount";
      
      const totalReceived = payments
        .filter(p => p.status === "approved")
        .reduce((sum, p) => sum + (p[amountField as keyof typeof p] as number), 0);

      const totalPending = payments
        .filter(p => p.status === "pending")
        .reduce((sum, p) => sum + (p[amountField as keyof typeof p] as number), 0);

      const totalTransactions = payments.length;
      
      const monthlyAverage = totalTransactions > 0 ? totalReceived / 12 : 0; // Últimos 12 meses

      return {
        totalReceived,
        totalPending,
        totalTransactions,
        monthlyAverage,
      };
      
    } catch (error) {
      console.error("Erro ao buscar estatísticas de split payments:", error);
      throw error;
    }
  }
}