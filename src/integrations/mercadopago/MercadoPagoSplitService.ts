import { supabase } from "@/integrations/supabase/client";

export interface SplitConfig {
  marketplaceFee: number; // Percentual da taxa do marketplace (ex: 5 para 5%)
  sellerAccountId?: string; // ID da conta do seller no Mercado Pago
  enableAutomaticSplit: boolean;
  splitMode: 'percentage' | 'fixed'; // Modo de divisão
}

export interface PaymentSplitData {
  paymentId: string;
  totalAmount: number;
  marketplaceAmount: number;
  sellerAmount: number;
  feeAmount: number;
  currency: string;
  status: 'pending' | 'processed' | 'failed';
  metadata?: Record<string, any>;
}

export class MercadoPagoSplitService {
  private static instance: MercadoPagoSplitService;
  private accessToken: string;
  private sandboxMode: boolean;

  static getInstance(): MercadoPagoSplitService {
    if (!this.instance) {
      this.instance = new MercadoPagoSplitService();
    }
    return this.instance;
  }

  configure(accessToken: string, sandboxMode: boolean = false): void {
    this.accessToken = accessToken;
    this.sandboxMode = sandboxMode;
  }

  async createSplitPayment(
    orderData: {
      orderId: string;
      userId: string;
      totalAmount: number;
      items: Array<{
        id: string;
        title: string;
        quantity: number;
        unit_price: number;
      }>;
      payer: {
        email: string;
        name: string;
        identification: {
          type: string;
          number: string;
        };
      };
    },
    splitConfig: SplitConfig
  ): Promise<string> {
    try {
      // Buscar configurações do Mercado Pago do usuário
      const { data: userSettings } = await supabase
        .from("mercado_pago_settings")
        .select("*")
        .eq("user_id", orderData.userId)
        .single();

      if (!userSettings) {
        throw new Error("Mercado Pago settings not found for user");
      }

      // Calcular valores do split
      const { marketplaceAmount, sellerAmount, feeAmount } = this.calculateSplit(
        orderData.totalAmount,
        splitConfig
      );

      // Preparar dados do pagamento
      const paymentData = {
        transaction_amount: orderData.totalAmount,
        description: `Pedido #${orderData.orderId}`,
        payment_method_id: "pix", // Pode ser ajustado conforme necessário
        payer: {
          email: orderData.payer.email,
          identification: orderData.payer.identification,
          type: "customer"
        },
        additional_info: {
          items: orderData.items,
          payer: {
            first_name: orderData.payer.name.split(" ")[0],
            last_name: orderData.payer.name.split(" ").slice(1).join(" ")
          }
        },
        metadata: {
          order_id: orderData.orderId,
          user_id: orderData.userId,
          seller_id: orderData.userId,
          split_enabled: splitConfig.enableAutomaticSplit,
          marketplace_fee: splitConfig.marketplaceFee,
          marketplace_amount: marketplaceAmount,
          seller_amount: sellerAmount,
          fee_amount: feeAmount
        },
        // Configurações de split (se suportado pela API)
        ...(splitConfig.enableAutomaticSplit && splitConfig.sellerAccountId && {
          marketplace: {
            fee: splitConfig.marketplaceFee,
            mode: splitConfig.splitMode
          }
        })
      };

      // Criar preferência de pagamento
      const preferenceResponse = await this.createPreference(paymentData);
      
      // Registrar split no banco de dados
      await this.recordSplitPayment({
        paymentId: preferenceResponse.id,
        totalAmount: orderData.totalAmount,
        marketplaceAmount,
        sellerAmount,
        feeAmount,
        currency: "BRL",
        status: "pending",
        metadata: {
          order_id: orderData.orderId,
          user_id: orderData.userId,
          split_config: splitConfig
        }
      });

      return preferenceResponse.init_point;
    } catch (error) {
      console.error("Error creating split payment:", error);
      throw error;
    }
  }

  private calculateSplit(
    totalAmount: number,
    config: SplitConfig
  ): { marketplaceAmount: number; sellerAmount: number; feeAmount: number } {
    const marketplaceAmount = (totalAmount * config.marketplaceFee) / 100;
    const feeAmount = totalAmount * 0.0499; // Taxa do Mercado Pago (~4.99%)
    const sellerAmount = totalAmount - marketplaceAmount - feeAmount;

    return {
      marketplaceAmount: Math.round(marketplaceAmount * 100) / 100,
      sellerAmount: Math.round(sellerAmount * 100) / 100,
      feeAmount: Math.round(feeAmount * 100) / 100
    };
  }

  private async createPreference(paymentData: any): Promise<any> {
    const baseUrl = this.sandboxMode 
      ? "https://api.mercadopago.com/checkout/preferences"
      : "https://api.mercadopago.com/checkout/preferences";

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create preference: ${errorData.message}`);
    }

    return await response.json();
  }

  private async recordSplitPayment(splitData: PaymentSplitData): Promise<void> {
    try {
      const { error } = await supabase
        .from("payment_splits")
        .insert({
          payment_id: splitData.paymentId,
          total_amount: splitData.totalAmount,
          marketplace_amount: splitData.marketplaceAmount,
          seller_amount: splitData.sellerAmount,
          fee_amount: splitData.feeAmount,
          currency: splitData.currency,
          status: splitData.status,
          metadata: splitData.metadata,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error recording split payment:", error);
      }
    } catch (error) {
      console.error("Error recording split payment:", error);
    }
  }

  async processSplitPayment(paymentId: string): Promise<void> {
    try {
      // Buscar dados do split
      const { data: splitData } = await supabase
        .from("payment_splits")
        .select("*")
        .eq("payment_id", paymentId)
        .single();

      if (!splitData) {
        throw new Error("Split data not found");
      }

      // Buscar configurações do Mercado Pago
      const { data: settings } = await supabase
        .from("mercado_pago_settings")
        .select("*")
        .eq("user_id", splitData.metadata?.user_id)
        .single();

      if (!settings) {
        throw new Error("Mercado Pago settings not found");
      }

      // Processar transferência para o seller (se aplicável)
      if (settings.split_enabled && splitData.seller_amount > 0) {
        await this.transferToSeller(
          paymentId,
          splitData.seller_amount,
          settings
        );
      }

      // Atualizar status do split
      await supabase
        .from("payment_splits")
        .update({
          status: "processed",
          processed_at: new Date().toISOString()
        })
        .eq("payment_id", paymentId);

    } catch (error) {
      console.error("Error processing split payment:", error);
      
      // Atualizar status para falhou
      await supabase
        .from("payment_splits")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error"
        })
        .eq("payment_id", paymentId);
    }
  }

  private async transferToSeller(
    paymentId: string,
    amount: number,
    settings: any
  ): Promise<void> {
    // Implementar lógica de transferência para o seller
    // Isso pode envolver criar uma transferência via API do Mercado Pago
    console.log(`Transferring ${amount} to seller for payment ${paymentId}`);
    
    // Exemplo de implementação (ajustar conforme necessário):
    /*
    const transferData = {
      amount: amount,
      payer_email: settings.seller_email,
      payment_id: paymentId,
      description: `Split payment for order ${paymentId}`
    };

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(transferData)
    });

    if (!response.ok) {
      throw new Error("Failed to create transfer");
    }
    */
  }

  async getSplitHistory(userId: string, limit: number = 50): Promise<PaymentSplitData[]> {
    const { data, error } = await supabase
      .from("payment_splits")
      .select("*")
      .or(`user_id.eq.${userId},metadata->>user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching split history:", error);
      return [];
    }

    return data as PaymentSplitData[];
  }

  async getSplitSummary(userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalProcessed: number;
    totalMarketplace: number;
    totalSeller: number;
    totalFees: number;
    splitCount: number;
  }> {
    let query = supabase
      .from("payment_splits")
      .select("*")
      .or(`user_id.eq.${userId},metadata->>user_id.eq.${userId}`)
      .eq("status", "processed");

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching split summary:", error);
      return {
        totalProcessed: 0,
        totalMarketplace: 0,
        totalSeller: 0,
        totalFees: 0,
        splitCount: 0
      };
    }

    const summary = data.reduce((acc, split) => ({
      totalProcessed: acc.totalProcessed + split.total_amount,
      totalMarketplace: acc.totalMarketplace + split.marketplace_amount,
      totalSeller: acc.totalSeller + split.seller_amount,
      totalFees: acc.totalFees + split.fee_amount,
      splitCount: acc.splitCount + 1
    }), {
      totalProcessed: 0,
      totalMarketplace: 0,
      totalSeller: 0,
      totalFees: 0,
      splitCount: 0
    });

    return summary;
  }
}