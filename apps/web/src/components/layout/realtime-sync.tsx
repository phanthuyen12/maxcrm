'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { playNotificationSound, unlockNotificationSound } from '@/lib/notification-sound';

export function RealtimeSync() {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const socket = getSocket();

    const unlock = () => unlockNotificationSound();
    const onMessageNew = (message?: { direction?: string }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      if (message?.direction === 'IN') playNotificationSound();
    };
    const onConversationUpdate = (conversation?: { customerId?: string; customer?: { id?: string } }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      const customerId = conversation?.customerId ?? conversation?.customer?.id;
      if (customerId) queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    };
    const onStatsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    socket.on('message:new', onMessageNew);
    socket.on('conversation:update', onConversationUpdate);
    socket.on('stats:update', onStatsUpdate);
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      socket.off('message:new', onMessageNew);
      socket.off('conversation:update', onConversationUpdate);
      socket.off('stats:update', onStatsUpdate);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [queryClient]);

  return null;
}
