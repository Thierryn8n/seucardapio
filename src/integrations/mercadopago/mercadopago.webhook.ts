import { mercadoPagoService } from "./mercadopago.service";
import { RoleEncryption } from "./mercadopago.encryption";
import type { MercadoPagoWebhook } from "./mercadopago.types";
import { supabase } from "@/integrations/supabase/client";

export class MercadoPagoWebhookHandler {
  
  static async handleWebhook(payload: MercadoPagoWebhook): Promise<void> {
    try {
      console.log(`Processando webhook do Mercado Pago: ${payload.type}`, payload);

      switch (payload.type) {
        case "payment":
          await this.handlePaymentWebhook(payload);
          break;
        case "preapproval":
          await this.handleSubscriptionWebhook(payload);
          break;
        case "plan":
          await this.handlePlanWebhook(payload);
          break;
        default:
          console.warn(`Tipo de webhook não tratado: ${payload.type}`);
      }
    } catch (error) {
      console.error("Erro ao processar webhook do Mercado Pago:", error);
      throw error;
    }
  }

  private static async handlePaymentWebhook(payload: MercadoPagoWebhook): Promise<void> {
    const paymentId = payload.data.id;
    
    try {
      // Buscar detalhes do pagamento
      const payment = await mercadoPagoService.getPayment(paymentId);
      
      // Atualizar status do pedido
      await this.updateOrderPaymentStatus(payment);
      
      // Se pagamento foi aprovado, processar benefícios
      if (payment.status === "approved") {
        await this.processPaymentBenefits(payment);
      }
      
      // Registrar log do webhook
      await this.logWebhookEvent("payment", paymentId, payment.status, payload);
      
    } catch (error) {
      console.error(`Erro ao processar webhook de pagamento ${paymentId}:`, error);
      throw error;
    }
  }

  private static async handleSubscriptionWebhook(payload: MercadoPagoWebhook): Promise<void> {
    const subscriptionId = payload.data.id;
    
    try {
      // Buscar detalhes da assinatura
      const subscription = await mercadoPagoService.getSubscription(subscriptionId);
      
      // Atualizar status da assinatura
      await this.updateSubscriptionStatus(subscription);
      
      // Se assinatura foi autorizada, ativar plano do usuário
      if (subscription.status === "authorized") {
        await this.activateUserPlan(subscription);
      }
      
      // Se assinatura foi cancelada, desativar plano
      if (subscription.status === "cancelled") {
        await this.deactivateUserPlan(subscription);
      }
      
      // Registrar log do webhook
      await this.logWebhookEvent("subscription", subscriptionId, subscription.status, payload);
      
    } catch (error) {
      console.error(`Erro ao processar webhook de assinatura ${subscriptionId}:`, error);
      throw error;
    }
  }

  private static async handlePlanWebhook(payload: MercadoPagoWebhook): Promise<void> {
    const planId = payload.data.id;
    
    try {
      // Registrar log do webhook de plano
      await this.logWebhookEvent("plan", planId, "updated", payload);
      
      // Atualizar informações do plano se necessário
      await this.updatePlanInfo(planId);
      
    } catch (error) {
      console.error(`Erro ao processar webhook de plano ${planId}:`, error);
      throw error;
    }
  }

  private static async updateOrderPaymentStatus(payment: any): Promise<void> {
    const orderStatus = this.mapPaymentStatusToOrderStatus(payment.status);
    
    const { error } = await supabase
      .from("orders")
      .update({
        status: orderStatus,
        mercado_pago_payment_id: payment.id,
        payment_status: payment.status,
        payment_date: payment.date_approved,
        updated_at: new Date().toISOString(),
      })
      .eq("mercado_pago_payment_id", payment.id);

    if (error) {
      throw new Error(`Erro ao atualizar status do pedido: ${error.message}`);
    }

    console.log(`Pedido atualizado: ${payment.id} -> ${orderStatus}`);
  }

  private static async updateSubscriptionStatus(subscription: any): Promise<void> {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        mercado_pago_subscription_id: subscription.id,
        next_payment_date: subscription.next_payment_date,
        updated_at: new Date().toISOString(),
      })
      .eq("mercado_pago_subscription_id", subscription.id);

    if (error) {
      throw new Error(`Erro ao atualizar status da assinatura: ${error.message}`);
    }

    console.log(`Assinatura atualizada: ${subscription.id} -> ${subscription.status}`);
  }

  private static async activateUserPlan(subscription: any): Promise<void> {
    try {
      // Buscar informações da assinatura no banco
      const { data: dbSubscription } = await supabase
        .from("subscriptions")
        .select("user_id, plan_id")
        .eq("mercado_pago_subscription_id", subscription.id)
        .single();

      if (!dbSubscription) {
        throw new Error("Assinatura não encontrada no banco de dados");
      }

      // Buscar informações do plano
      const { data: plan } = await supabase
        .from("plans")
        .select("name, features")
        .eq("id", dbSubscription.plan_id)
        .single();

      if (!plan) {
        throw new Error("Plano não encontrado");
      }

      // Criptografar o novo role
      const encryptedRole = RoleEncryption.encryptRole(plan.name.toLowerCase(), dbSubscription.user_id);

      // Atualizar usuário com novo plano e role criptografado
      const { error } = await supabase
        .from("users")
        .update({
          user_plan: plan.name.toLowerCase(),
          role_encrypted: JSON.stringify(encryptedRole),
          subscription_status: "active",
          plan_expires_at: this.calculatePlanExpiry(plan.name.toLowerCase()),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dbSubscription.user_id);

      if (error) {
        throw new Error(`Erro ao ativar plano do usuário: ${error.message}`);
      }

      // Registrar ativação
      await this.logPlanActivation(dbSubscription.user_id, plan.name, subscription.id);

      console.log(`Plano ativado para usuário ${dbSubscription.user_id}: ${plan.name}`);
      
    } catch (error) {
      console.error("Erro ao ativar plano do usuário:", error);
      throw error;
    }
  }

  private static async deactivateUserPlan(subscription: any): Promise<void> {
    try {
      // Buscar usuário pela assinatura
      const { data: dbSubscription } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("mercado_pago_subscription_id", subscription.id)
        .single();

      if (!dbSubscription) {
        throw new Error("Assinatura não encontrada no banco de dados");
      }

      // Criptografar role de usuário comum
      const encryptedRole = RoleEncryption.encryptRole("user", dbSubscription.user_id);

      // Reverter usuário para plano gratuito
      const { error } = await supabase
        .from("users")
        .update({
          user_plan: "free",
          role_encrypted: JSON.stringify(encryptedRole),
          subscription_status: "cancelled",
          plan_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dbSubscription.user_id);

      if (error) {
        throw new Error(`Erro ao desativar plano do usuário: ${error.message}`);
      }

      // Registrar cancelamento
      await this.logPlanCancellation(dbSubscription.user_id, subscription.id);

      console.log(`Plano desativado para usuário ${dbSubscription.user_id}`);
      
    } catch (error) {
      console.error("Erro ao desativar plano do usuário:", error);
      throw error;
    }
  }

  private static async processPaymentBenefits(payment: any): Promise<void> {
    // Implementar lógica de benefícios baseada no pagamento
    // Por exemplo: créditos, upgrade temporário, etc.
    console.log(`Processando benefícios para pagamento ${payment.id}`);
  }

  private static async updatePlanInfo(planId: string): Promise<void> {
    // Atualizar informações do plano no banco se necessário
    console.log(`Atualizando informações do plano ${planId}`);
  }

  private static async logWebhookEvent(
    type: string, 
    resourceId: string, 
    status: string, 
    payload: any
  ): Promise<void> {
    const { error } = await supabase
      .from("webhook_logs")
      .insert({
        type,
        resource_id: resourceId,
        status,
        payload: JSON.stringify(payload),
        processed_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Erro ao registrar log de webhook:", error);
    }
  }

  private static async logPlanActivation(userId: string, planName: string, subscriptionId: string): Promise<void> {
    const { error } = await supabase
      .from("plan_activation_logs")
      .insert({
        user_id: userId,
        plan_name: planName,
        subscription_id: subscriptionId,
        activated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Erro ao registrar ativação de plano:", error);
    }
  }

  private static async logPlanCancellation(userId: string, subscriptionId: string): Promise<void> {
    const { error } = await supabase
      .from("plan_cancellation_logs")
      .insert({
        user_id: userId,
        subscription_id: subscriptionId,
        cancelled_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Erro ao registrar cancelamento de plano:", error);
    }
  }

  private static mapPaymentStatusToOrderStatus(paymentStatus: string): string {
    const statusMap: Record<string, string> = {
      "approved": "paid",
      "pending": "pending",
      "in_process": "processing",
      "rejected": "failed",
      "cancelled": "cancelled",
      "refunded": "refunded",
      "charged_back": "charged_back",
    };

    return statusMap[paymentStatus] || "pending";
  }

  private static calculatePlanExpiry(planName: string): string {
    const now = new Date();
    
    switch (planName.toLowerCase()) {
      case "professional":
      case "premium":
        // Plano mensal
        now.setMonth(now.getMonth() + 1);
        break;
      case "free":
      default:
        // Plano gratuito não expira
        return now.toISOString();
    }
    
    return now.toISOString();
  }

  // Método para verificar assinaturas expiradas
  static async checkExpiredSubscriptions(): Promise<void> {
    try {
      const { data: expiredSubscriptions } = await supabase
        .from("subscriptions")
        .select("id, user_id, plan_expires_at")
        .eq("status", "active")
        .lt("plan_expires_at", new Date().toISOString());

      if (expiredSubscriptions) {
        for (const subscription of expiredSubscriptions) {
          await this.handleExpiredSubscription(subscription);
        }
      }
      
    } catch (error) {
      console.error("Erro ao verificar assinaturas expiradas:", error);
    }
  }

  private static async handleExpiredSubscription(subscription: any): Promise<void> {
    try {
      // Atualizar status da assinatura
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      if (updateError) {
        throw updateError;
      }

      // Reverter usuário para plano gratuito
      const encryptedRole = RoleEncryption.encryptRole("user", subscription.user_id);

      const { error: userError } = await supabase
        .from("users")
        .update({
          user_plan: "free",
          role_encrypted: JSON.stringify(encryptedRole),
          subscription_status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.user_id);

      if (userError) {
        throw userError;
      }

      console.log(`Assinatura expirada processada: ${subscription.id}`);
      
    } catch (error) {
      console.error(`Erro ao processar assinatura expirada ${subscription.id}:`, error);
    }
  }
}