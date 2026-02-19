// client/src/views/support/useContactSupportLogic.tsx
import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { useSendSupportEmailMutation } from './supportApiSlice';

export type Priority = 'low' | 'normal' | 'high' | 'critical';

export interface FormData {
  subject: string;
  message: string;
  priority: Priority;
}

export const useContactSupportLogic = () => {
  const [formData, setFormData] = useState<FormData>({
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [errMsg, setErrMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const [sendSupportEmail, { isLoading }] = useSendSupportEmailMutation();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts typing
    if (errMsg) setErrMsg('');
    if (successMsg) setSuccessMsg('');
  };

  const handleTextAreaInput = (): void => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      setErrMsg('Please fill in all required fields');
      return;
    }

    try {
      await sendSupportEmail({
        subject: formData.subject,
        message: formData.message,
        priority: formData.priority
      }).unwrap();
      
      setSuccessMsg('Your support request has been sent successfully! We\'ll get back to you soon.');
      setFormData({
        subject: '',
        message: '',
        priority: 'normal'
      });
    } catch (err: any) {
      if (!err?.status) {
        setErrMsg('No Server Response');
      } else if (err.status === 400) {
        setErrMsg('Please check your input and try again');
      } else if (err.status === 500) {
        setErrMsg('Server error. Please try again later');
      } else {
        setErrMsg(err.data?.message || 'Failed to send support request');
      }
    }
  }; 

  return {
    formData,
    errMsg,
    successMsg,
    isLoading,
    textAreaRef,
    handleChange,
    handleTextAreaInput,
    handleSubmit
  };
};