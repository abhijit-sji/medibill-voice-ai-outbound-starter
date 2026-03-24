/**
 * Live Monitoring Tab
 * Real-time call monitoring with animated workflows
 * Data sourced from database subscriptions (no parent props needed)
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle, Circle, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ActiveCall {
  id: string;
  call_sid: string;
  status: string;
  created_at: string;
  workflow_status: any;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  activity_name: string;
  activity_status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  sequence_number: number;
}

const workflowSteps = [
  { key: 'greeting', label: 'Greeting Patient', icon: Activity },
  { key: 'validation', label: 'Validating Patient', icon: CheckCircle },
  { key: 'insurance', label: 'Verifying Insurance', icon: CheckCircle },
  { key: 'availability', label: 'Checking Availability', icon: Clock },
  { key: 'booking', label: 'Booking Appointment', icon: CheckCircle },
  { key: 'confirmation', label: 'Confirming Details', icon: CheckCircle },
];

interface LiveMonitoringTabProps {
  direction?: "inbound" | "outbound";
}

export function LiveMonitoringTab({ direction }: LiveMonitoringTabProps) {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<ActiveCall | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadActiveCalls();

    const callsSubscription = supabase
      .channel('active-calls')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'call_logs', filter: 'status=eq.in-progress' },
        () => { loadActiveCalls(); }
      )
      .subscribe();

    return () => { callsSubscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (selectedCall) {
      loadActivityLogs(selectedCall.id);

      const activitySubscription = supabase
        .channel(`activity-logs-${selectedCall.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'agent_activity_logs', filter: `call_log_id=eq.${selectedCall.id}` },
          () => { loadActivityLogs(selectedCall.id); }
        )
        .subscribe();

      return () => { activitySubscription.unsubscribe(); };
    }
  }, [selectedCall]);

  const loadActiveCalls = async () => {
    try {
      let query = supabase
        .from("call_logs")
        .select("*")
        .in("status", ["in-progress", "initiated"])
        .eq("ai_provider", "elevenlabs");
      if (direction) {
        query = query.eq("direction", direction);
      }
      const { data, error } = await query
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActiveCalls(data || []);

      if (data && data.length > 0 && !selectedCall) {
        setSelectedCall(data[0]);
      }
    } catch (error) {
      console.error("Error loading active calls:", error);
    }
  };

  const loadActivityLogs = async (callLogId: string) => {
    try {
      const { data, error } = await supabase
        .from("agent_activity_logs")
        .select("*")
        .eq("call_log_id", callLogId)
        .order("sequence_number", { ascending: true });

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error("Error loading activity logs:", error);
    }
  };

  const getStepStatus = (stepKey: string) => {
    const log = activityLogs.find(log => log.activity_type.includes(stepKey));
    if (!log) return 'pending';
    return log.activity_status;
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Circle className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'failed': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Calls List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500 animate-pulse" />
              Active Calls
            </CardTitle>
            <CardDescription>
              {activeCalls.length} call{activeCalls.length !== 1 ? 's' : ''} in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No active calls</p>
                <p className="text-sm">Calls will appear here in real-time</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeCalls.map((call) => (
                  <div
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50",
                      selectedCall?.id === call.id && "bg-blue-50 border-blue-500"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-gray-600">
                        {call.call_sid?.substring(0, 15)}...
                      </span>
                      <Badge variant="default" className="bg-green-500">{call.status}</Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      Started {new Date(call.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow Visualization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Workflow</CardTitle>
            <CardDescription>
              {selectedCall
                ? `Monitoring call ${selectedCall.call_sid?.substring(0, 20)}...`
                : 'Select a call to monitor'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedCall ? (
              <div className="text-center py-12 text-gray-500">
                <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>Select an active call to view workflow</p>
              </div>
            ) : (
              <div className="space-y-4">
                {workflowSteps.map((step, index) => {
                  const status = getStepStatus(step.key);
                  const isActive = status === 'in_progress';
                  const isCompleted = status === 'completed';
                  const isFailed = status === 'failed';

                  return (
                    <div key={step.key} className="relative">
                      {index < workflowSteps.length - 1 && (
                        <div className={cn("absolute left-[1.375rem] top-10 w-0.5 h-8", isCompleted ? "bg-green-500" : "bg-gray-200")} />
                      )}
                      <div className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border transition-all",
                        isActive && "bg-blue-50 border-blue-500 shadow-md",
                        isCompleted && "bg-green-50 border-green-500",
                        isFailed && "bg-red-50 border-red-500"
                      )}>
                        <div className="relative">{getStepIcon(status)}</div>
                        <div className="flex-1">
                          <div className="font-medium">{step.label}</div>
                          {isActive && <div className="text-xs text-blue-600 mt-1">Processing...</div>}
                          {isCompleted && <div className="text-xs text-green-600 mt-1">Completed successfully</div>}
                          {isFailed && <div className="text-xs text-red-600 mt-1">Failed to complete</div>}
                        </div>
                        {isCompleted && <Badge variant="outline" className="bg-green-50">✓ Done</Badge>}
                        {isActive && <Badge variant="outline" className="bg-blue-50 animate-pulse">In Progress</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Logs */}
      {selectedCall && activityLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>Detailed step-by-step activity log</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-1">
                    {log.activity_status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : log.activity_status === 'in_progress' ? (
                      <Circle className="h-4 w-4 text-blue-500 animate-pulse" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{log.activity_name}</span>
                      <span className="text-xs text-gray-500">{new Date(log.started_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Type: {log.activity_type}</div>
                    {log.duration_ms && <div className="text-xs text-gray-500">Duration: {log.duration_ms}ms</div>}
                  </div>
                  <Badge variant={
                    log.activity_status === 'completed' ? 'default' :
                    log.activity_status === 'in_progress' ? 'secondary' : 'destructive'
                  }>
                    {log.activity_status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
