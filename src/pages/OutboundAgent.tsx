/**
 * Outbound Agent Page
 * Standalone management hub for outbound ElevenLabs voice agents
 */

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneOutgoing, Settings, TestTube, Activity, FileAudio } from "lucide-react";
import { AgentConfigurationTab } from "@/components/conversational-agent/AgentConfigurationTab";
import { AgentTestingTab } from "@/components/conversational-agent/AgentTestingTab";
import { CallAuditTab } from "@/components/conversational-agent/CallAuditTab";
import { LiveMonitoringTab } from "@/components/conversational-agent/LiveMonitoringTab";
import { AgentListSidebar, type AgentListItem } from "@/components/conversational-agent/AgentListSidebar";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

interface OutboundStats {
  totalCalls: number;
  successfulBookings: number;
  avgDuration: string;
  activeAgents: number;
  conversionRate: string;
}

export function OutboundAgent() {
  const [activeTab, setActiveTab] = useState("configuration");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("ai_agent_configurations")
        .select("id, agent_name, agent_type, elevenlabs_agent_id, is_active")
        .eq("clinic_id", DEFAULT_CLINIC_ID)
        .eq("is_active", true)
        .eq("agent_type", "outbound")
        .order("created_at", { ascending: true }) as any);

      if (error) throw error;
      const list: AgentListItem[] = (data || []).map((d: any) => ({
        id: d.id,
        agent_name: d.agent_name,
        agent_type: d.agent_type || "outbound",
        elevenlabs_agent_id: d.elevenlabs_agent_id,
        is_active: d.is_active,
      }));
      setAgents(list);

      if (list.length > 0 && (!selectedAgentId || !list.find((a) => a.id === selectedAgentId))) {
        setSelectedAgentId(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load outbound agents:", err);
    } finally {
      setAgentsLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    loadAgents();
  }, []);

  const [stats, setStats] = useState<OutboundStats>({
    totalCalls: 0,
    successfulBookings: 0,
    avgDuration: "0:00",
    activeAgents: 0,
    conversionRate: "0%",
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [callsRes, agentsRes] = await Promise.all([
          supabase
            .from("call_logs")
            .select("id, duration, appointment_id, appointment_booked, status")
            .eq("ai_provider", "elevenlabs")
            .eq("direction", "outbound")
            .gte("created_at", thirtyDaysAgo.toISOString()),
          supabase
            .from("ai_agent_configurations")
            .select("id")
            .eq("agent_type", "outbound")
            .not("elevenlabs_agent_id", "is", null)
            .eq("is_active", true),
        ]);

        const calls = callsRes.data || [];
        const totalCalls = calls.length;
        const successfulBookings = calls.filter((c) =>
          c.appointment_id != null || c.appointment_booked === true
        ).length;
        const completedCalls = calls.filter((c) => c.status === "completed" && c.duration);
        const avgSeconds =
          completedCalls.length > 0
            ? Math.round(completedCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / completedCalls.length)
            : 0;
        const mins = Math.floor(avgSeconds / 60);
        const secs = avgSeconds % 60;

        setStats({
          totalCalls,
          successfulBookings,
          avgDuration: `${mins}:${String(secs).padStart(2, "0")}`,
          activeAgents: agentsRes.data?.length || 0,
          conversionRate: totalCalls > 0 ? `${Math.round((successfulBookings / totalCalls) * 100)}%` : "0%",
        });
      } catch (err) {
        console.error("Failed to load outbound stats:", err);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
              <PhoneOutgoing className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Outbound Voice Agents
              </h1>
              <p className="text-gray-600 mt-1">
                Manage outbound ElevenLabs voice agents
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Outbound Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Successful Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successfulBookings}</div>
              <p className="text-xs text-muted-foreground mt-1">Conversion rate: {stats.conversionRate}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Call Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgDuration}</div>
              <p className="text-xs text-muted-foreground mt-1">Minutes:Seconds</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Outbound Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAgents}</div>
              <p className="text-xs text-muted-foreground mt-1">ElevenLabs agents</p>
            </CardContent>
          </Card>
        </div>

        {/* Agent Sidebar + Detail */}
        <div className="flex border rounded-xl bg-background shadow-sm overflow-hidden min-h-[600px]">
          <AgentListSidebar
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            agents={agents}
            loading={agentsLoading}
            onRefresh={loadAgents}
            agentType="outbound"
          />

          <div className="flex-1 p-6 overflow-auto">
            {!selectedAgent ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {agentsLoading ? "Loading agents..." : "Select or create an outbound agent to get started."}
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                  <TabsTrigger value="configuration" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Configuration
                  </TabsTrigger>
                  <TabsTrigger value="testing" className="gap-2">
                    <TestTube className="h-4 w-4" />
                    Testing
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="gap-2">
                    <FileAudio className="h-4 w-4" />
                    Call Audit
                  </TabsTrigger>
                  <TabsTrigger value="monitoring" className="gap-2">
                    <Activity className="h-4 w-4" />
                    Live Monitoring
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="configuration">
                  <AgentConfigurationTab
                    agentId={selectedAgentId!}
                    agentType="outbound"
                    onAgentUpdated={loadAgents}
                  />
                </TabsContent>

                <TabsContent value="testing" forceMount className={activeTab !== "testing" ? "hidden" : ""}>
                  <AgentTestingTab
                    agentId={selectedAgent.elevenlabs_agent_id || null}
                    agentType="outbound"
                    configLoading={agentsLoading}
                  />
                </TabsContent>

                <TabsContent value="audit">
                  <CallAuditTab direction="outbound" />
                </TabsContent>

                <TabsContent value="monitoring">
                  <LiveMonitoringTab direction="outbound" />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
