import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/components/notifications/NotificationBell';

export interface CreateNotificationData {
  userId: string;
  title: string;
  message: string;
  type: Notification['type'];
  metadata?: {
    order_id?: string;
    promotion_id?: string;
    delivery_id?: string;
  };
}

export class NotificationService {
  static async createNotification(data: CreateNotificationData): Promise<Notification | null> {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          metadata: data.metadata,
          read: false,
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar notificação:', error);
        return null;
      }

      return notification;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }
  }

  static async createOrderStatusNotification(
    userId: string,
    orderId: string,
    status: string,
    additionalInfo?: string
  ): Promise<Notification | null> {
    const statusMessages = {
      'pending': 'Seu pedido foi recebido e está sendo preparado',
      'preparing': 'Seu pedido está sendo preparado',
      'ready': 'Seu pedido está pronto para retirada',
      'delivered': 'Seu pedido foi entregue com sucesso!',
      'cancelled': 'Seu pedido foi cancelado',
    };

    const title = `Pedido #${orderId.slice(-6)} - ${status}`;
    const message = additionalInfo || statusMessages[status as keyof typeof statusMessages] || 'Status do pedido atualizado';

    return this.createNotification({
      userId,
      title,
      message,
      type: 'order_status',
      metadata: { order_id: orderId },
    });
  }

  static async createDeliveryNotification(
    userId: string,
    deliveryId: string,
    status: string,
    estimatedTime?: string
  ): Promise<Notification | null> {
    const statusMessages = {
      'assigned': 'Entregador atribuído ao seu pedido',
      'picked_up': 'Seu pedido foi retirado do restaurante',
      'on_the_way': 'Seu pedido está a caminho',
      'delivered': 'Seu pedido foi entregue!',
    };

    const title = 'Atualização de Entrega';
    const message = estimatedTime 
      ? `${statusMessages[status as keyof typeof statusMessages]} - Tempo estimado: ${estimatedTime}`
      : statusMessages[status as keyof typeof statusMessages] || 'Status da entrega atualizado';

    return this.createNotification({
      userId,
      title,
      message,
      type: 'delivery',
      metadata: { delivery_id: deliveryId },
    });
  }

  static async createPromotionNotification(
    userId: string,
    promotionId: string,
    title: string,
    description: string
  ): Promise<Notification | null> {
    return this.createNotification({
      userId,
      title: `🎉 ${title}`,
      message: description,
      type: 'promotion',
      metadata: { promotion_id: promotionId },
    });
  }

  static async createSystemNotification(
    userId: string,
    title: string,
    message: string
  ): Promise<Notification | null> {
    return this.createNotification({
      userId,
      title,
      message,
      type: 'system',
    });
  }

  static async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    type: Notification['type']
  ): Promise<number> {
    let successCount = 0;
    
    for (const userId of userIds) {
      const notification = await this.createNotification({
        userId,
        title,
        message,
        type,
      });
      
      if (notification) {
        successCount++;
      }
    }

    console.log(`Notificações enviadas: ${successCount}/${userIds.length}`);
    return successCount;
  }

  static async cleanupOldNotifications(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Erro ao limpar notificações antigas:', error);
      } else {
        console.log('Notificações antigas removidas com sucesso');
      }
    } catch (error) {
      console.error('Erro ao limpar notificações antigas:', error);
    }
  }
}