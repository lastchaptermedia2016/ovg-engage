import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  tenant_id: string;
  role: 'user' | 'ai';
  text: string;
  is_manual?: boolean;
  created_at: string;
}

interface UseRealtimeFeedProps {
  tenantId: string;
  enabled?: boolean;
}

export const useRealtimeFeed = ({ tenantId, enabled = true }: UseRealtimeFeedProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingMessagesRef = useRef<Map<string, Message>>(new Map());

  // Load initial messages
  useEffect(() => {
    if (!enabled || !tenantId) return;

    const loadInitialMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;
        setMessages((data || []) as unknown as Message[]);
      } catch (error) {
        console.error('Error loading initial messages:', error);
      }
    };

    loadInitialMessages();
  }, [tenantId, enabled]);

  // Set up realtime subscription
  useEffect(() => {
    if (!enabled || !tenantId) return;

    const channel = supabase
      .channel(`messages:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          const pendingKey = `${newMessage.text}-${newMessage.created_at}`;
          if (pendingMessagesRef.current.has(pendingKey)) {
            pendingMessagesRef.current.delete(pendingKey);
          }
          
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages(prev =>
            prev.map(m => m.id === updatedMessage.id ? updatedMessage : m)
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenantId, enabled]);

  // Optimistic message insertion
  const addMessageOptimistic = (message: Omit<Message, 'id' | 'created_at'>) => {
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      ...message,
      id: tempId,
      created_at: new Date().toISOString()
    };

    const pendingKey = `${message.text}-${tempMessage.created_at}`;
    pendingMessagesRef.current.set(pendingKey, tempMessage);

    setMessages(prev => [...prev, tempMessage]);

    const saveMessage = async () => {
      try {
        // Use a cast to bypass strict Supabase types
        const { error } = await (supabase.from('messages') as any)
          .insert({
            tenant_id: tenantId,
            role: message.role,
            text: message.text,
            is_manual: message.is_manual || false,
            created_at: tempMessage.created_at
          })
          .select()
          .single();

        if (error) throw error;
      } catch (error) {
        console.error('Error saving message:', error);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        pendingMessagesRef.current.delete(pendingKey);
      }
    };

    saveMessage();
  };

  return {
    messages,
    isConnected,
    addMessageOptimistic
  };
};