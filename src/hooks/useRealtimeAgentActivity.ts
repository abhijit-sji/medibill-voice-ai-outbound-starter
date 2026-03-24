/**
 * Real-time Agent Activity Hook
 * Tracks multiple simultaneous active calls with activity logs, agent names, and endCall support.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type CallLog = Database['public']['Tables']['call_logs']['Row'];
type ActivityLog = Database['public']['Tables']['agent_activity_logs']['Row'];

export interface MultiAgentState {
  activeCalls: CallLog[];
  inboundCall: CallLog | null;
  outboundCall: CallLog | null;
  activityLogsMap: Record<string, ActivityLog[]>;
  agentNames: Record<string, string>;
  agentAvatarGenders: Record<string, string>;
  isActive: boolean;
  endCall: (callId: string) => Promise<void>;
}

export function useRealtimeAgentActivity(): MultiAgentState {
  const [activeCalls, setActiveCalls] = useState<CallLog[]>([]);
  const [activityLogsMap, setActivityLogsMap] = useState<Record<string, ActivityLog[]>>({});
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [agentAvatarGenders, setAgentAvatarGenders] = useState<Record<string, string>>({});
  const activityChannelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const removalTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Fetch agent name for a call
  const fetchAgentName = useCallback(async (call: CallLog) => {
    if (!call.elevenlabs_agent_id) return;
    const { data } = await (supabase.from('ai_agent_configurations') as any)
      .select('agent_name, avatar_gender')
      .eq('elevenlabs_agent_id', call.elevenlabs_agent_id)
      .limit(1);
    if (data && data.length > 0) {
      setAgentNames(prev => ({ ...prev, [call.id]: data[0].agent_name }));
      setAgentAvatarGenders(prev => ({ ...prev, [call.id]: data[0].avatar_gender || 'female' }));
      return;
    }
    const { data: elData } = await supabase
      .from('el_conv_agents')
      .select('name')
      .eq('elevenlabs_agent_id', call.elevenlabs_agent_id)
      .limit(1);
    if (elData && elData.length > 0) {
      setAgentNames(prev => ({ ...prev, [call.id]: elData[0].name }));
    }
  }, []);

  // Fetch activity logs for a specific call
  const fetchActivityLogs = useCallback(async (callId: string) => {
    const { data, error } = await supabase
      .from('agent_activity_logs')
      .select('*')
      .eq('call_log_id', callId)
      .order('sequence_number', { ascending: true });
    if (error) {
      console.error('[AgentActivity] Failed to fetch activity logs:', error);
    }
    if (data) {
      setActivityLogsMap(prev => ({ ...prev, [callId]: data }));
    }
  }, []);

  // Subscribe to activity logs for one call
  const subscribeToActivityLogs = useCallback((callId: string) => {
    if (activityChannelsRef.current.has(callId)) return;
    fetchActivityLogs(callId);
    const channel = supabase
      .channel(`activity_logs_${callId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'agent_activity_logs',
        filter: `call_log_id=eq.${callId}`,
      }, () => fetchActivityLogs(callId))
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[AgentActivity] Activity channel error for ${callId}:`, status, err);
        }
      });
    activityChannelsRef.current.set(callId, channel);
  }, [fetchActivityLogs]);

  // Unsubscribe from activity logs for one call
  const unsubscribeActivityLogs = useCallback((callId: string) => {
    const ch = activityChannelsRef.current.get(callId);
    if (ch) {
      supabase.removeChannel(ch);
      activityChannelsRef.current.delete(callId);
    }
  }, []);

  // Add a call to active list
  const addCall = useCallback((call: CallLog) => {
    const timer = removalTimers.current.get(call.id);
    if (timer) { clearTimeout(timer); removalTimers.current.delete(call.id); }

    setActiveCalls(prev => {
      if (prev.some(c => c.id === call.id)) {
        return prev.map(c => c.id === call.id ? call : c);
      }
      return [...prev, call];
    });
    fetchAgentName(call);
    subscribeToActivityLogs(call.id);
  }, [fetchAgentName, subscribeToActivityLogs]);

  // Remove a call after delay
  const scheduleRemoval = useCallback((callId: string, updatedCall?: CallLog) => {
    if (updatedCall) {
      setActiveCalls(prev => prev.map(c => c.id === callId ? updatedCall : c));
    }
    if (removalTimers.current.has(callId)) return;
    const timer = setTimeout(() => {
      setActiveCalls(prev => prev.filter(c => c.id !== callId));
      setActivityLogsMap(prev => { const n = { ...prev }; delete n[callId]; return n; });
      setAgentNames(prev => { const n = { ...prev }; delete n[callId]; return n; });
      setAgentAvatarGenders(prev => { const n = { ...prev }; delete n[callId]; return n; });
      unsubscribeActivityLogs(callId);
      removalTimers.current.delete(callId);
    }, 5000);
    removalTimers.current.set(callId, timer);
  }, [unsubscribeActivityLogs]);

  // End a call
  const endCall = useCallback(async (callId: string) => {
    await supabase
      .from('call_logs')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('id', callId);
  }, []);

  // Stabilize refs for use inside realtime handler
  const addCallRef = useRef(addCall);
  addCallRef.current = addCall;
  const scheduleRemovalRef = useRef(scheduleRemoval);
  scheduleRemovalRef.current = scheduleRemoval;
  const unsubscribeActivityLogsRef = useRef(unsubscribeActivityLogs);
  unsubscribeActivityLogsRef.current = unsubscribeActivityLogs;

  // Fetch all in-progress calls
  const fetchActiveCalls = useCallback(async () => {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .eq('status', 'in-progress')
      .order('started_at', { ascending: false })
      .limit(20);
    if (error) {
      console.error('[AgentActivity] Failed to fetch active calls:', error);
      return;
    }
    if (data) {
      data.forEach(call => addCallRef.current(call));
    }
  }, []);

  // Subscribe to call_logs changes + polling fallback
  useEffect(() => {
    fetchActiveCalls();

    const channel = supabase
      .channel('agent_multi_calls')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'call_logs',
      }, (payload) => {
        const newRecord = payload.new as CallLog | null;
        const oldRecord = payload.old as Partial<CallLog> | null;

        if (payload.eventType === 'INSERT' && newRecord?.status === 'in-progress') {
          addCallRef.current(newRecord);
        } else if (payload.eventType === 'UPDATE') {
          if (newRecord?.status === 'in-progress') {
            addCallRef.current(newRecord);
          } else if (newRecord && newRecord.status !== 'in-progress') {
            scheduleRemovalRef.current(newRecord.id, newRecord);
          }
        } else if (payload.eventType === 'DELETE' && oldRecord?.id) {
          setActiveCalls(prev => prev.filter(c => c.id !== oldRecord.id));
          unsubscribeActivityLogsRef.current(oldRecord.id as string);
        }
      })
      .subscribe((status, err) => {
        console.log('[AgentActivity] Call channel status:', status);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[AgentActivity] Call channel error:', err);
        }
      });

    // Polling fallback every 10 seconds
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('call_logs')
        .select('*')
        .eq('status', 'in-progress')
        .order('started_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        data.forEach(call => addCallRef.current(call));
      }
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
      activityChannelsRef.current.forEach(ch => supabase.removeChannel(ch));
      activityChannelsRef.current.clear();
      removalTimers.current.forEach(t => clearTimeout(t));
      removalTimers.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const inboundCall = activeCalls.find(c => c.direction === 'inbound') || null;
  const outboundCall = activeCalls.find(c => c.direction === 'outbound') || null;

  return {
    activeCalls,
    inboundCall,
    outboundCall,
    activityLogsMap,
    agentNames,
    agentAvatarGenders,
    isActive: activeCalls.length > 0,
    endCall,
  };
}
