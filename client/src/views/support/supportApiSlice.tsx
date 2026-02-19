// client/src/features/supportApiSlice.ts
import { apiSlice } from '../../app/api/apiSlice';

interface SupportEmailRequest {
  subject: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

interface SupportEmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

export const supportApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    sendSupportEmail: builder.mutation<SupportEmailResponse, SupportEmailRequest>({
      query: ({ subject, message, priority }) => ({
        url: '/support/contact',
        method: 'POST',
        body: { subject, message, priority }
      })
    })
  })
});

export const {
  useSendSupportEmailMutation
} = supportApiSlice;