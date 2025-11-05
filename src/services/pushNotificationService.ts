import { NotificationService } from '@/services/notificationService';
import { supabase } from '@/integrations/supabase/client';

export class PushNotificationService {
  private static isSupported = 'Notification' in window;
  private static permission: NotificationPermission = 'default';

  static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Push notifications não são suportadas neste navegador');
      return 'denied';
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission;
    } catch (error) {
      console.error('Erro ao solicitar permissão para notificações:', error);
      return 'denied';
    }
  }

  static async showNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<void> {
    if (!this.isSupported) return;

    if (this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Permissão para notificações negada');
        return;
      }
    }

    try {
      await navigator.serviceWorker.ready;
      
      // Registrar service worker se ainda não estiver registrado
      if (!navigator.serviceWorker.controller) {
        await this.registerServiceWorker();
      }

      const defaultOptions: NotificationOptions = {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'colab-eats-notification',
        requireInteraction: false,
        ...options,
      };

      // Mostrar notificação usando o Service Worker
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, defaultOptions);
    } catch (error) {
      console.error('Erro ao mostrar notificação:', error);
      // Fallback para notificação direta
      if (this.permission === 'granted') {
        new Notification(title, options);
      }
    }
  }

  static async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers não são suportados');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado com sucesso');
      return registration;
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
    }
  }

  static async setupPushSubscription(userId: string): Promise<void> {
    if (!this.isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Verificar se já existe uma inscrição
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Obter chave pública VAPID do servidor (você precisará implementar isso)
        const { data: { publicKey }, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'vapid_public_key')
          .single();

        if (error || !publicKey) {
          console.error('Chave VAPID não encontrada');
          return;
        }

        const applicationServerKey = this.urlBase64ToUint8Array(publicKey);
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey,
        });
      }

      // Salvar inscrição no banco de dados
      await this.saveSubscription(userId, subscription);
      
    } catch (error) {
      console.error('Erro ao configurar inscrição push:', error);
    }
  }

  private static async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.toJSON().keys?.p256dh,
          auth_key: subscription.toJSON().keys?.auth,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Erro ao salvar inscrição:', error);
      }
    } catch (error) {
      console.error('Erro ao salvar inscrição:', error);
    }
  }

  private static urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  static async sendPushNotification(
    userId: string,
    title: string,
    options: NotificationOptions = {}
  ): Promise<void> {
    try {
      // Buscar inscrição do usuário
      const { data: subscription, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !subscription) {
        console.warn('Inscrição push não encontrada para o usuário');
        return;
      }

      // Enviar notificação push (isso normalmente seria feito no servidor)
      // Aqui estamos apenas mostrando a notificação localmente como fallback
      await this.showNotification(title, options);
      
      // Também criar notificação no banco de dados
      await NotificationService.createSystemNotification(userId, title, options.body || '');
      
    } catch (error) {
      console.error('Erro ao enviar notificação push:', error);
    }
  }
}