/**
 * Realtime Calls Hook
 * Subscribes to call_logs table changes for real-time updates
 * Medibill Voice Sync Health - Phase 1
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to subscribe to real-time updates on the call_logs table
 * Invalidates React Query cache when INSERT, UPDATE, or DELETE events occur
 */
export function useRealtimeCalls() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to changes on the call_logs table
    const channel = supabase
      .channel('call_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'call_logs',
        },
        (payload) => {
          
          // Invalidate relevant query keys to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['active-calls'] });
          queryClient.invalidateQueries({ queryKey: ['recent-calls'] });
          queryClient.invalidateQueries({ queryKey: ['call-stats'] });
          
          // Also invalidate the specific call if it's an UPDATE or DELETE
          if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            const oldRecord = payload.old as Record<string, unknown> | null;
            const newRecord = payload.new as Record<string, unknown> | null;
            const callId = oldRecord?.id || newRecord?.id;
            if (callId) {
              queryClient.invalidateQueries({ queryKey: ['call', callId] });
            }
          }
          
          // If it's an INSERT or UPDATE, also invalidate the new call
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRecord = payload.new as Record<string, unknown> | null;
            const callId = newRecord?.id;
            if (callId) {
              queryClient.invalidateQueries({ queryKey: ['call', callId] });
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

