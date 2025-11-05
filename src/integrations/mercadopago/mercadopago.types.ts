export interface MercadoPagoWebhookPayload {
  id: number;
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

export interface MercadoPagoPaymentWebhook extends MercadoPagoWebhookPayload {
  type: "payment";
  data: {
    id: string;
  };
}

export interface MercadoPagoSubscriptionWebhook extends MercadoPagoWebhookPayload {
  type: "preapproval";
  data: {
    id: string;
  };
}

export interface MercadoPagoPlanWebhook extends MercadoPagoWebhookPayload {
  type: "plan";
  data: {
    id: string;
  };
}

export type MercadoPagoWebhook = 
  | MercadoPagoPaymentWebhook 
  | MercadoPagoSubscriptionWebhook 
  | MercadoPagoPlanWebhook;

export interface MercadoPagoSplitPayment {
  id: string;
  transaction_amount: number;
  currency_id: string;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
  marketplace: string;
  marketplace_fee: number;
  collectors: Array<{
    id: string;
    amount: number;
    fee: number;
  }>;
}

export interface MercadoPagoCredential {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  user_id: string;
  token_type: string;
}

export interface MercadoPagoOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: string;
  refresh_token?: string;
}

export interface MercadoPagoError {
  message: string;
  error: string;
  status: number;
  cause?: Array<{
    code: string;
    description: string;
    data?: any;
  }>;
}