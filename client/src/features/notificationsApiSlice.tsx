// client/src/features/notificationsApiSlice.tsx
import { apiSlice } from '../app/api/apiSlice';

interface MaintenanceRequest {
  minutes: number;
  message?: string;
}

interface BroadcastRequest {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

interface NotificationResponse {
  success: boolean;
  message: string;
  clientCount: number;
}

interface ClientCountResponse {
  clientCount: number;
}

export const notificationsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sendMaintenanceNotification: builder.mutation<NotificationResponse, MaintenanceRequest>({
      query: (data) => ({
        url: '/notifications/maintenance',
        method: 'POST',
        body: data,
      }),
    }),
    sendBroadcastNotification: builder.mutation<NotificationResponse, BroadcastRequest>({
      query: (data) => ({
        url: '/notifications/broadcast',
        method: 'POST',
        body: data,
      }),
    }),
    getConnectedClients: builder.query<ClientCountResponse, void>({
      query: () => '/notifications/clients',
    }),
  }),
});

export const {
  useSendMaintenanceNotificationMutation,
  useSendBroadcastNotificationMutation,
  useGetConnectedClientsQuery,
} = notificationsApiSlice;
