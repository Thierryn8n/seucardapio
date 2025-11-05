import { supabase } from "@/integrations/supabase/client";

export interface MercadoPagoConfig {
  access_token: string;
  public_key: string;
  webhook_secret?: string;
}

export interface MercadoPagoPlan {
  id: string;
  title: string;
  description: string;
  unit_price: number;
  currency_id: string;
  quantity: number;
  billing_type: "monthly" | "yearly";
  frequency: number;
  frequency_type: "months" | "years";
}

export interface MercadoPagoSubscription {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled" | "expired";
  plan_id: string;
  payer_email: string;
  payer_id: string;
  next_payment_date?: string;
  payment_method_id: string;
  total_paid_amount: number;
}

export interface MercadoPagoPayment {
  id: string;
  status: "pending" | "approved" | "authorized" | "in_process" | "in_mediation" | "rejected" | "cancelled" | "refunded" | "charged_back";
  status_detail: string;
  transaction_amount: number;
  date_created: string;
  date_approved?: string;
  payment_method_id: string;
  payment_type_id: string;
  payer: {
    id: string;
    email: string;
  };
}

class MercadoPagoService {
  private baseURL = "https://api.mercadopago.com";
  private accessToken: string | null = null;
  private publicKey: string | null = null;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("mercado_pago_access_token, mercado_pago_public_key")
        .limit(1)
        .single();

      if (error) {
        console.warn("Configurações do Mercado Pago não encontradas:", error.message);
        return;
      }

      if (data) {
        this.accessToken = data.mercado_pago_access_token;
        this.publicKey = data.mercado_pago_public_key;
      }
    } catch (error) {
      console.warn("Erro ao carregar configurações do Mercado Pago:", error);
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.accessToken) {
      throw new Error("Mercado Pago não configurado");
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Erro desconhecido" }));
      throw new Error(`Mercado Pago API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // Criar plano de assinatura
  async createPlan(plan: Omit<MercadoPagoPlan, "id">): Promise<{ id: string }> {
    const data = await this.makeRequest("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: plan.title,
        auto_recurring: {
          frequency: plan.frequency,
          frequency_type: plan.frequency_type,
          transaction_amount: plan.unit_price,
          currency_id: plan.currency_id,
        },
        back_url: `${window.location.origin}/admin/plans`,
        status: "active",
      }),
    });

    return { id: data.id };
  }

  // Criar assinatura
  async createSubscription(planId: string, payerEmail: string): Promise<{ id: string; init_point: string }> {
    const data = await this.makeRequest("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        preapproval_plan_id: planId,
        payer_email: payerEmail,
        back_url: `${window.location.origin}/admin/plans?status=success`,
        status: "pending",
      }),
    });

    return {
      id: data.id,
      init_point: data.init_point,
    };
  }

  // Criar pagamento único
  async createPayment(orderData: {
    amount: number;
    description: string;
    payerEmail: string;
    payerName: string;
    externalReference: string;
  }): Promise<{ id: string; init_point: string }> {
    const data = await this.makeRequest("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
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
        notification_url: `${window.location.origin}/api/webhooks/mercadopago`,
      }),
    });

    return {
      id: data.id,
      init_point: data.init_point,
    };
  }

  // Buscar assinatura
  async getSubscription(subscriptionId: string): Promise<MercadoPagoSubscription> {
    const data = await this.makeRequest(`/preapproval/${subscriptionId}`);
    
    return {
      id: data.id,
      status: data.status,
      plan_id: data.preapproval_plan_id,
      payer_email: data.payer_email,
      payer_id: data.payer_id,
      next_payment_date: data.next_payment_date,
      payment_method_id: data.payment_method_id,
      total_paid_amount: data.total_paid_amount,
    };
  }

  // Buscar pagamento
  async getPayment(paymentId: string): Promise<MercadoPagoPayment> {
    const data = await this.makeRequest(`/payments/${paymentId}`);
    
    return {
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
      transaction_amount: data.transaction_amount,
      date_created: data.date_created,
      date_approved: data.date_approved,
      payment_method_id: data.payment_method_id,
      payment_type_id: data.payment_type_id,
      payer: {
        id: data.payer.id,
        email: data.payer.email,
      },
    };
  }

  // Cancelar assinatura
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.makeRequest(`/preapproval/${subscriptionId}`, {
      method: "PUT",
      body: JSON.stringify({
        status: "cancelled",
      }),
    });
  }

  // Processar webhook
  async processWebhook(data: any): Promise<void> {
    const { type, data: webhookData } = data;

    if (type === "payment") {
      const paymentId = webhookData.id;
      const payment = await this.getPayment(paymentId);
      
      // Atualizar status do pagamento no banco
      await this.updatePaymentStatus(payment);
    } else if (type === "preapproval") {
      const subscriptionId = webhookData.id;
      const subscription = await this.getSubscription(subscriptionId);
      
      // Atualizar status da assinatura no banco
      await this.updateSubscriptionStatus(subscription);
    }
  }

  private async updatePaymentStatus(payment: MercadoPagoPayment): Promise<void> {
    // Atualizar pedido no banco de dados
    const { error } = await supabase
      .from("orders")
      .update({
        status: this.mapPaymentStatusToOrderStatus(payment.status),
        mercado_pago_payment_id: payment.id,
        updated_at: new Date().toISOString(),
      })
      .eq("mercado_pago_payment_id", payment.id);

    if (error) {
      console.error("Erro ao atualizar status do pedido:", error);
    }
  }

  private async updateSubscriptionStatus(subscription: MercadoPagoSubscription): Promise<void> {
    // Atualizar assinatura no banco de dados
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        mercado_pago_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      })
      .eq("mercado_pago_subscription_id", subscription.id);

    if (error) {
      console.error("Erro ao atualizar status da assinatura:", error);
    }

    // Se a assinatura foi aprovada, atualizar o plano do usuário
    if (subscription.status === "authorized") {
      await this.updateUserPlanFromSubscription(subscription);
    }
  }

  private async updateUserPlanFromSubscription(subscription: MercadoPagoSubscription): Promise<void> {
    // Buscar usuário pela assinatura
    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("user_id, plan_id")
      .eq("mercado_pago_subscription_id", subscription.id)
      .single();

    if (subscriptionData) {
      // Buscar informações do plano
      const { data: planData } = await supabase
        .from("plans")
        .select("name")
        .eq("id", subscriptionData.plan_id)
        .single();

      if (planData) {
        // Atualizar plano do usuário
        const { error } = await supabase
          .from("users")
          .update({
            user_plan: planData.name.toLowerCase(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionData.user_id);

        if (error) {
          console.error("Erro ao atualizar plano do usuário:", error);
        }
      }
    }
  }

  private mapPaymentStatusToOrderStatus(paymentStatus: string): string {
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

  // Configurar chaves de API
  async configureKeys(accessToken: string, publicKey: string): Promise<void> {
    const { error } = await supabase
      .from("settings")
      .update({
        mercado_pago_access_token: accessToken,
        mercado_pago_public_key: publicKey,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      throw new Error("Erro ao configurar chaves do Mercado Pago");
    }

    this.accessToken = accessToken;
    this.publicKey = publicKey;
  }

  // Obter chave pública
  getPublicKey(): string | null {
    return this.publicKey;
  }
}

export const mercadoPagoService = new MercadoPagoService();