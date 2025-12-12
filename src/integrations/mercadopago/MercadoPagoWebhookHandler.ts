import { supabase } from "@/integrations/supabase/client";

export interface MercadoPagoWebhookPayload {
  id: string;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: string;
  user_id: string;
  version: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

export interface PaymentData {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  net_received_amount: number;
  total_paid_amount: number;
  marketplace_fee: number;
  merchant_account_id?: string;
  payer: {
    id: string;
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
  additional_info: {
    items: Array<{
      id: string;
      title: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  metadata?: {
    user_id?: string;
    order_id?: string;
    seller_id?: string;
  };
}

export class MercadoPagoWebhookHandler {
  private static instance: MercadoPagoWebhookHandler;

  static getInstance(): MercadoPagoWebhookHandler {
    if (!this.instance) {
      this.instance = new MercadoPagoWebhookHandler();
    }
    return this.instance;
  }

  async handleWebhook(payload: MercadoPagoWebhookPayload): Promise<void> {
    console.log("Processing Mercado Pago webhook:", payload);

    try {
      // Buscar configurações do Mercado Pago para o usuário
      const { data: settings } = await supabase
        .from("mercado_pago_settings")
        .select("*")
        .eq("user_id", payload.user_id)
        .single();

      if (!settings) {
        console.error("Mercado Pago settings not found for user:", payload.user_id);
        return;
      }

      // Buscar dados completos do pagamento
      const paymentData = await this.fetchPaymentData(payload.data.id, settings.access_token);
      if (!paymentData) {
        console.error("Failed to fetch payment data for payment:", payload.data.id);
        return;
      }

      // Processar diferentes tipos de ações
      switch (payload.action) {
        case "payment.created":
        case "payment.updated":
          await this.processPaymentUpdate(paymentData, settings);
          break;
        case "payment.approved":
          await this.processPaymentApproved(paymentData, settings);
          break;
        case "payment.rejected":
          await this.processPaymentRejected(paymentData, settings);
          break;
        case "payment.refunded":
          await this.processPaymentRefunded(paymentData, settings);
          break;
        default:
          console.log("Unhandled webhook action:", payload.action);
      }

    } catch (error) {
      console.error("Error processing webhook:", error);
      throw error;
    }
  }

  private async fetchPaymentData(paymentId: string, accessToken: string): Promise<PaymentData | null> {
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment data: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching payment data:", error);
      return null;
    }
  }

  private async processPaymentUpdate(paymentData: PaymentData, settings: any): Promise<void> {
    console.log("Processing payment update:", paymentData.id);

    // Atualizar status do pedido no banco de dados
    if (paymentData.metadata?.order_id) {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: paymentData.status,
          payment_id: paymentData.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentData.metadata.order_id);

      if (error) {
        console.error("Error updating order:", error);
      }
    }

    // Registrar transação
    await this.recordTransaction(paymentData, settings);
  }

  private async processPaymentApproved(paymentData: PaymentData, settings: any): Promise<void> {
    console.log("Processing payment approved:", paymentData.id);

    // Atualizar status do pedido para aprovado
    if (paymentData.metadata?.order_id) {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "approved",
          status: "confirmed",
          payment_id: paymentData.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentData.metadata.order_id);

      if (error) {
        console.error("Error updating order:", error);
      }
    }

    // Processar split de pagamentos se habilitado
    if (settings.split_enabled && settings.marketplace_fee > 0) {
      await this.processPaymentSplit(paymentData, settings);
    }

    // Registrar transação
    await this.recordTransaction(paymentData, settings);
  }

  private async processPaymentRejected(paymentData: PaymentData, settings: any): Promise<void> {
    console.log("Processing payment rejected:", paymentData.id);

    // Atualizar status do pedido para rejeitado
    if (paymentData.metadata?.order_id) {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "rejected",
          status: "cancelled",
          payment_id: paymentData.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentData.metadata.order_id);

      if (error) {
        console.error("Error updating order:", error);
      }
    }

    // Registrar transação
    await this.recordTransaction(paymentData, settings);
  }

  private async processPaymentRefunded(paymentData: PaymentData, settings: any): Promise<void> {
    console.log("Processing payment refunded:", paymentData.id);

    // Atualizar status do pedido para reembolsado
    if (paymentData.metadata?.order_id) {
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "refunded",
          status: "cancelled",
          payment_id: paymentData.id,
          updated_at: new Date().toISOString()
        })
        .eq("id", paymentData.metadata.order_id);

      if (error) {
        console.error("Error updating order:", error);
      }
    }

    // Registrar transação
    await this.recordTransaction(paymentData, settings);
  }

  private async processPaymentSplit(paymentData: PaymentData, settings: any): Promise<void> {
    console.log("Processing payment split for:", paymentData.id);

    const marketplaceFee = (paymentData.transaction_amount * settings.marketplace_fee) / 100;
    const sellerAmount = paymentData.transaction_amount - marketplaceFee;

    console.log(`Split: Marketplace fee: ${marketplaceFee}, Seller amount: ${sellerAmount}`);

    // Aqui você implementaria a lógica real de split com Mercado Pago
    // Por exemplo, criando uma transferência para o seller
    if (paymentData.merchant_account_id) {
      // Implementar transferência para a conta do merchant
      console.log(`Would transfer ${sellerAmount} to merchant account: ${paymentData.merchant_account_id}`);
    }
  }

  private async recordTransaction(paymentData: PaymentData, settings: any): Promise<void> {
    try {
      const { error } = await supabase
        .from("transactions")
        .insert({
          user_id: settings.user_id,
          payment_id: paymentData.id,
          order_id: paymentData.metadata?.order_id,
          amount: paymentData.transaction_amount,
          net_amount: paymentData.net_received_amount,
          fee: paymentData.marketplace_fee,
          status: paymentData.status,
          payer_email: paymentData.payer.email,
          payer_id: paymentData.payer.id,
          payment_method: "mercado_pago",
          metadata: paymentData,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error recording transaction:", error);
      }
    } catch (error) {
      console.error("Error recording transaction:", error);
    }
  }

  // Verificar assinatura do webhook (para produção)
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Implementar verificação de assinatura HMAC
    // Esta é uma implementação básica - ajuste conforme necessário
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }
}