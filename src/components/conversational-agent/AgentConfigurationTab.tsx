/**
 * Agent Configuration Tab
 * Configure ElevenLabs Conversational Voice Agent — supports both inbound and outbound
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RefreshCw, Rocket, CheckCircle2, XCircle, AlertCircle, Download, Trash2, BookOpen, Search, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { getElevenLabsVoices } from "@/services/integrations.service";
import { cn } from "@/lib/utils";
import femaleAvatarImg from "@/assets/agent-avatar-female.png";
import maleAvatarImg from "@/assets/agent-avatar-male.png";
import { useKnowledgeBaseDocuments } from "@/hooks/useKnowledgeBase";
import { useDebounce } from "@/hooks/use-debounce";


const DEFAULT_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
}

interface ConnectionStatus {
  apiKey: "connected" | "missing" | "checking";
  agentId: string | null;
  twilioNumber: string | null;
}

interface LLMModel {
  value: string;
  label: string;
  provider: string;
}

const FALLBACK_LLM_OPTIONS: LLMModel[] = [
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google" },
];


interface AgentConfigurationTabProps {
  agentId: string;
  agentType: "inbound" | "outbound";
  onAgentUpdated?: () => void;
}

export function AgentConfigurationTab({ agentId, agentType, onAgentUpdated }: AgentConfigurationTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [forceDeleteLocal, setForceDeleteLocal] = useState(false);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [llmModels, setLlmModels] = useState<LLMModel[]>(FALLBACK_LLM_OPTIONS);
  // Only store IDs — names/types are resolved at render time from kbData (no race condition)
  const [selectedKbDocIds, setSelectedKbDocIds] = useState<string[]>([]);
  const [kbSearch, setKbSearch] = useState("");
  const debouncedKbSearch = useDebounce(kbSearch, 300);
  // staleTime: 0 so newly-uploaded files appear immediately without manual refresh
  const { data: kbData, isLoading: kbLoading, refetch: refetchKb } = useKnowledgeBaseDocuments({
    pageSize: 100,
    search: debouncedKbSearch || undefined,
  });

  // Live lookup from loaded KB documents — used for name/type display and deploy payload
  const kbDocLookup = useMemo(() => {
    const map: Record<string, { id: string; name: string; type: string; size_bytes: number }> = {};
    kbData?.documents?.forEach((d) => {
      map[d.id] = { id: d.id, name: d.name, type: d.type, size_bytes: d.size_bytes };
    });
    return map;
  }, [kbData]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    apiKey: "checking",
    agentId: null,
    twilioNumber: null,
  });
  const [config, setConfig] = useState({
    agentName: "",
    agentRole: "AI Scheduling Assistant",
    avatarGender: "female" as "male" | "female",
    useElevenLabs: true,
    elevenlabsVoiceId: "",
    elevenlabsModel: "eleven_turbo_v2",
    elevenlabsAgentId: "",
    llmModel: "gpt-4o",
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0.0,
    firstMessage: "",
    systemPrompt: "",
    language: "en",
    twilioPhoneNumber: "",
  });

  useEffect(() => {
    loadConfiguration();
    loadVoices();
    loadLLMModels();
    checkApiKeyStatus();
  }, [agentId, agentType]);

  const loadLLMModels = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-elevenlabs-llm-models");
      if (error) throw error;
      if (data?.models && Array.isArray(data.models) && data.models.length > 0) {
        setLlmModels(data.models);
      }
    } catch (err) {
      console.error("Failed to load LLM models, using fallback:", err);
    }
  };

  const llmOptions = useMemo(() => {
    const base = [...llmModels];
    if (config.llmModel && !base.some((o) => o.value === config.llmModel)) {
      base.push({ value: config.llmModel, label: config.llmModel, provider: "Current" });
    }
    const providers = Array.from(new Set(base.map((m) => m.provider)));
    return { models: base, providers };
  }, [llmModels, config.llmModel]);

  const checkApiKeyStatus = async () => {
    try {
      const { data } = await supabase
        .from("integration_settings")
        .select("settings, is_enabled")
        .eq("integration_name", "elevenlabs")
        .maybeSingle();
      const hasKey = data?.is_enabled && !!(data?.settings as any)?.api_key;
      setConnectionStatus((prev) => ({ ...prev, apiKey: hasKey ? "connected" : "missing" }));
    } catch {
      setConnectionStatus((prev) => ({ ...prev, apiKey: "missing" }));
    }
  };

  const loadConfiguration = async () => {
    try {
      const { data, error } = await (supabase
        .from("ai_agent_configurations")
        .select("*")
        .eq("id", agentId)
        .maybeSingle() as any);

      if (error) throw error;

      if (data) {
        setConfig({
          agentName: data.agent_name || "",
          agentRole: data.agent_role || "AI Scheduling Assistant",
          avatarGender: data.avatar_gender || "female",
          useElevenLabs: data.use_elevenlabs ?? true,
          elevenlabsVoiceId: data.elevenlabs_voice_id || "",
          elevenlabsModel: data.elevenlabs_model || "eleven_turbo_v2",
          elevenlabsAgentId: data.elevenlabs_agent_id || "",
          llmModel: data.elevenlabs_llm_model || "gpt-4o",
          stability: data.elevenlabs_stability || 0.5,
          similarityBoost: data.elevenlabs_similarity_boost || 0.8,
          style: data.elevenlabs_style || 0.0,
          firstMessage: data.first_message || "",
          systemPrompt: data.system_prompt || "",
          language: data.language || "en",
          twilioPhoneNumber: data.twilio_phone_number || "",
        });
        // Try to get the LIVE KB state from ElevenLabs; fall back to DB-stored IDs
        const elevenLabsAgentId = data.elevenlabs_agent_id;
        if (elevenLabsAgentId) {
          try {
            const { data: liveAgent } = await supabase.functions.invoke("get-elevenlabs-agent", {
              body: { agent_id: elevenLabsAgentId },
            });
            if (liveAgent?.knowledge_base?.length) {
              setSelectedKbDocIds(liveAgent.knowledge_base.map((kb: any) => kb.id));
            } else {
              // ElevenLabs has no KB attached — clear selection
              setSelectedKbDocIds([]);
            }
          } catch {
            // Fallback to DB state if live fetch fails
            const savedIds: string[] = data.knowledge_base_document_ids || [];
            setSelectedKbDocIds(savedIds);
          }
        } else {
          const savedIds: string[] = data.knowledge_base_document_ids || [];
          setSelectedKbDocIds(savedIds);
        }
        let twilioNum = data.twilio_phone_number || null;
        if (!twilioNum) {
          const { data: twilioSettings } = await supabase
            .from("integration_settings")
            .select("settings")
            .eq("integration_name", "twilio")
            .maybeSingle();
          twilioNum = (twilioSettings?.settings as any)?.phone_number || null;
        }
        setConnectionStatus((prev) => ({
          ...prev,
          agentId: data.elevenlabs_agent_id || null,
          twilioNumber: twilioNum,
        }));
      }
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast({ title: "Error", description: "Failed to load agent configuration", variant: "destructive" });
    }
  };

  const loadVoices = async () => {
    try {
      const voicesData = await getElevenLabsVoices();
      const voicesList = Array.isArray(voicesData) ? voicesData : (voicesData?.voices || []);
      setVoices(voicesList.map((v: any) => ({ voice_id: v.id || v.voice_id, name: v.name, category: v.category })));
    } catch (error) {
      console.error("Error loading voices:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const upsertData: any = {
        id: agentId,
        clinic_id: DEFAULT_CLINIC_ID,
        agent_name: config.agentName,
        avatar_gender: config.avatarGender,
        use_elevenlabs: config.useElevenLabs,
        elevenlabs_voice_id: config.elevenlabsVoiceId,
        elevenlabs_model: config.elevenlabsModel,
        elevenlabs_agent_id: config.elevenlabsAgentId || null,
        elevenlabs_llm_model: config.llmModel,
        elevenlabs_stability: config.stability,
        elevenlabs_similarity_boost: config.similarityBoost,
        elevenlabs_style: config.style,
        first_message: config.firstMessage,
        system_prompt: config.systemPrompt,
        language: config.language,
        twilio_phone_number: config.twilioPhoneNumber || null,
        is_active: true,
        agent_type: agentType,
        knowledge_base_document_ids: selectedKbDocIds,
      };

      const { error } = await (supabase
        .from("ai_agent_configurations")
        .upsert(upsertData) as any);

      if (error) throw error;

      onAgentUpdated?.();
      setConnectionStatus(prev => ({
        ...prev,
        twilioNumber: config.twilioPhoneNumber || prev.twilioNumber,
      }));
      toast({ title: "Success", description: "Agent configuration saved successfully" });
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({ title: "Error", description: "Failed to save agent configuration", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeployAgent = async () => {
    if (connectionStatus.apiKey !== "connected") {
      toast({ title: "Error", description: "ElevenLabs API key not configured.", variant: "destructive" });
      return;
    }
    if (!config.elevenlabsVoiceId) {
      toast({ title: "Error", description: "Please select a voice before deploying.", variant: "destructive" });
      return;
    }

    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-elevenlabs-agent", {
        body: {
          name: config.agentName || "Voice Agent",
          voice_id: config.elevenlabsVoiceId,
          model: config.elevenlabsModel,
          first_message: config.firstMessage,
          system_prompt: config.systemPrompt,
          language: config.language,
          llm_model: config.llmModel,
          voice_settings: {
            stability: config.stability,
            similarity_boost: config.similarityBoost,
            style: config.style,
          },
          ...(config.elevenlabsAgentId ? { agent_id: config.elevenlabsAgentId } : {}),
          knowledge_base_docs: selectedKbDocIds
            .filter((id) => kbDocLookup[id]?.type !== "folder")
            .map((id) => ({
              id,
              name: kbDocLookup[id]?.name || id,
              type: kbDocLookup[id]?.type || "file",
            })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newAgentId = data.agent_id;
      setConfig((prev) => ({ ...prev, elevenlabsAgentId: newAgentId }));
      setConnectionStatus((prev) => ({ ...prev, agentId: newAgentId }));

      // Save agent_id and KB IDs to database
      await (supabase
        .from("ai_agent_configurations")
        .update({
          elevenlabs_agent_id: newAgentId,
          knowledge_base_document_ids: selectedKbDocIds,
        } as any)
        .eq("id", agentId) as any);

      // Re-fetch live KB state from ElevenLabs to confirm what was actually applied
      try {
        const { data: liveAgent } = await supabase.functions.invoke("get-elevenlabs-agent", {
          body: { agent_id: newAgentId },
        });
        if (Array.isArray(liveAgent?.knowledge_base)) {
          setSelectedKbDocIds(liveAgent.knowledge_base.map((kb: any) => kb.id));
        }
      } catch { /* non-critical — ignore */ }

      // Also refresh the KB documents list so newly uploaded files appear
      refetchKb();

      onAgentUpdated?.();
      toast({
        title: data.updated ? "Agent Updated" : "Agent Deployed",
        description: `ElevenLabs Agent ID: ${newAgentId}`,
      });
    } catch (error: any) {
      console.error("Deploy error:", error);
      toast({ title: "Deployment Failed", description: error.message || "Failed to deploy agent", variant: "destructive" });
    } finally {
      setDeploying(false);
    }
  };

  const handleSyncFromElevenLabs = async () => {
    if (!config.elevenlabsAgentId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-elevenlabs-agent", {
        body: { agent_id: config.elevenlabsAgentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setConfig((prev) => ({
        ...prev,
        agentName: data.name || prev.agentName,
        elevenlabsVoiceId: data.voice_id || prev.elevenlabsVoiceId,
        elevenlabsModel: data.model_id || prev.elevenlabsModel,
        firstMessage: data.first_message || prev.firstMessage,
        systemPrompt: data.system_prompt || prev.systemPrompt,
        language: data.language || prev.language,
        llmModel: data.llm_model || prev.llmModel,
        stability: data.stability ?? prev.stability,
        similarityBoost: data.similarity_boost ?? prev.similarityBoost,
        style: data.style ?? prev.style,
      }));

      // Fetch live KB state from ElevenLabs using get-elevenlabs-agent (which returns knowledge_base)
      let liveKbIds: string[] = [];
      try {
        const { data: liveAgent } = await supabase.functions.invoke("get-elevenlabs-agent", {
          body: { agent_id: config.elevenlabsAgentId },
        });
        if (Array.isArray(liveAgent?.knowledge_base)) {
          liveKbIds = liveAgent.knowledge_base.map((kb: any) => kb.id);
          setSelectedKbDocIds(liveKbIds);
        }
      } catch { /* ignore KB sync errors */ }

      await (supabase
        .from("ai_agent_configurations")
        .update({
          agent_name: data.name,
          elevenlabs_voice_id: data.voice_id,
          elevenlabs_model: data.model_id,
          elevenlabs_llm_model: data.llm_model,
          first_message: data.first_message,
          system_prompt: data.system_prompt,
          language: data.language,
          elevenlabs_stability: data.stability,
          elevenlabs_similarity_boost: data.similarity_boost,
          elevenlabs_style: data.style,
          knowledge_base_document_ids: liveKbIds,
        } as any)
        .eq("id", agentId) as any);

      onAgentUpdated?.();
      toast({ title: "Synced", description: "Agent configuration synced from ElevenLabs" });
    } catch (error: any) {
      toast({ title: "Sync Failed", description: error.message || "Failed to sync", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteAgent = async (forceLocal = false) => {
    if (!config.elevenlabsAgentId) return;
    setDeleting(true);
    try {
      if (!forceLocal) {
        const { data, error } = await supabase.functions.invoke("create-elevenlabs-agent", {
          body: { agent_id: config.elevenlabsAgentId, delete: true },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      setConfig((prev) => ({ ...prev, elevenlabsAgentId: "" }));
      setConnectionStatus((prev) => ({ ...prev, agentId: null }));

      await (supabase
        .from("ai_agent_configurations")
        .update({ elevenlabs_agent_id: null } as any)
        .eq("id", agentId) as any);

      onAgentUpdated?.();
      toast({
        title: forceLocal ? "Agent Cleared" : "Agent Deleted",
        description: forceLocal ? "Local agent reference cleared." : "The ElevenLabs agent has been deleted.",
      });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setForceDeleteLocal(false);
    }
  };

  const StatusIcon = ({ status }: { status: "connected" | "missing" | "checking" }) => {
    if (status === "checking") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (status === "connected") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <StatusIcon status={connectionStatus.apiKey} />
              <div>
                <p className="text-sm font-medium">ElevenLabs API Key</p>
                <p className="text-xs text-muted-foreground">
                  {connectionStatus.apiKey === "connected" ? "Configured" : connectionStatus.apiKey === "checking" ? "Checking..." : "Not configured"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              {connectionStatus.agentId ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
              <div>
                <p className="text-sm font-medium">Agent ID</p>
                <p className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
                  {connectionStatus.agentId || "Not deployed"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              {connectionStatus.twilioNumber ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
              <div>
                <p className="text-sm font-medium">Twilio Number</p>
                <p className="text-xs text-muted-foreground">{connectionStatus.twilioNumber || "Not configured"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Settings</CardTitle>
          <CardDescription>
            Configure your {agentType} ElevenLabs Conversational Voice Agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Agent Identity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input id="agentName" value={config.agentName} onChange={(e) => setConfig({ ...config, agentName: e.target.value })} placeholder="Sarah" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentRole">Agent Role</Label>
              <Input id="agentRole" value={config.agentRole} onChange={(e) => setConfig({ ...config, agentRole: e.target.value })} placeholder="AI Scheduling Assistant" />
            </div>
            <div className="space-y-2">
              <Label>Agent Avatar</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, avatarGender: 'female' })}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors cursor-pointer',
                    config.avatarGender === 'female' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <img src={femaleAvatarImg} alt="Female" className="w-10 h-10 rounded-full object-cover" />
                  <span className="text-[10px] font-medium">Female</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, avatarGender: 'male' })}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors cursor-pointer',
                    config.avatarGender === 'male' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <img src={maleAvatarImg} alt="Male" className="w-10 h-10 rounded-full object-cover" />
                  <span className="text-[10px] font-medium">Male</span>
                </button>
              </div>
            </div>
          </div>

          {/* Twilio Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="twilioPhone">Twilio Phone Number</Label>
            <Input id="twilioPhone" value={config.twilioPhoneNumber} onChange={(e) => setConfig({ ...config, twilioPhoneNumber: e.target.value })} placeholder="+1234567890" />
            <p className="text-xs text-muted-foreground">
              The Twilio phone number linked to this agent for {agentType} calls
            </p>
          </div>

          {/* ElevenLabs Settings */}
          {config.useElevenLabs && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">ElevenLabs Settings</h3>
                {config.elevenlabsAgentId && (
                  <Badge variant="outline" className="font-mono text-xs">{config.elevenlabsAgentId}</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voice">Voice</Label>
                  <Select value={config.elevenlabsVoiceId} onValueChange={(value) => setConfig({ ...config, elevenlabsVoiceId: value })}>
                    <SelectTrigger id="voice"><SelectValue placeholder="Select a voice" /></SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          {voice.name} {voice.category && `(${voice.category})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">TTS Model</Label>
                  <Select value={config.elevenlabsModel} onValueChange={(value) => setConfig({ ...config, elevenlabsModel: value })}>
                    <SelectTrigger id="model"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eleven_flash_v2">Eleven Flash v2 (Ultra fast)</SelectItem>
                      <SelectItem value="eleven_turbo_v2">Eleven Turbo v2 (High quality)</SelectItem>
                      <SelectItem value="eleven_multilingual_v2">Eleven Multilingual v2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="llmModel">LLM Model</Label>
                  <Select value={config.llmModel} onValueChange={(value) => setConfig({ ...config, llmModel: value })}>
                    <SelectTrigger id="llmModel"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {llmOptions.providers.map((provider) => (
                        <div key={provider}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{provider}</div>
                          {llmOptions.models.filter((m) => m.provider === provider).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Voice Settings Sliders */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between"><Label>Stability</Label><span className="text-sm text-muted-foreground">{config.stability}</span></div>
                  <Slider min={0} max={1} step={0.1} value={[config.stability]} onValueChange={([v]) => setConfig({ ...config, stability: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><Label>Similarity Boost</Label><span className="text-sm text-muted-foreground">{config.similarityBoost}</span></div>
                  <Slider min={0} max={1} step={0.1} value={[config.similarityBoost]} onValueChange={([v]) => setConfig({ ...config, similarityBoost: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><Label>Style</Label><span className="text-sm text-muted-foreground">{config.style}</span></div>
                  <Slider min={0} max={1} step={0.1} value={[config.style]} onValueChange={([v]) => setConfig({ ...config, style: v })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={config.language} onValueChange={(value) => setConfig({ ...config, language: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* First Message */}
          <div className="space-y-2">
            <Label htmlFor="firstMessage">First Message</Label>
            <Textarea id="firstMessage" value={config.firstMessage} onChange={(e) => setConfig({ ...config, firstMessage: e.target.value })} placeholder="Initial greeting message..." rows={2} />
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea id="systemPrompt" value={config.systemPrompt} onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })} placeholder="System prompt for the agent..." rows={10} className="font-mono text-sm" />
          </div>

          {/* Knowledge Base */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Knowledge Base Documents</h3>
                {selectedKbDocIds.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{selectedKbDocIds.length} attached</Badge>
                )}
              </div>
              {selectedKbDocIds.length > 0 && (
                <button
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => setSelectedKbDocIds([])}
                >
                  Clear all
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Select documents to attach to this agent. They will be included when deploying or updating.
            </p>

            {connectionStatus.apiKey !== "connected" ? (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                ElevenLabs API key is not configured. Knowledge base documents will not be available.
              </p>
            ) : (
              <>
                {/* Currently attached docs — always visible */}
                {selectedKbDocIds.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Currently attached:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedKbDocIds.map((id) => {
                        const doc = kbDocLookup[id];
                        const displayName = doc?.name || id;
                        const docType = doc?.type;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium"
                          >
                            {docType === "url" ? "🔗" : docType === "text" ? "📝" : docType === "folder" ? "📁" : "📄"}
                            <span className="max-w-[140px] truncate" title={displayName}>{displayName}</span>
                            <button
                              className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                              onClick={() => setSelectedKbDocIds((prev) => prev.filter((d) => d !== id))}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search knowledge base..."
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                    className="pl-9 h-8 text-sm"
                  />
                </div>

                {/* Document checklist */}
                <div className="max-h-52 overflow-y-auto rounded-md border bg-background">
                  {kbLoading ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />Loading documents...
                    </div>
                  ) : !kbData?.documents?.length ? (
                    <div className="py-6 text-center text-muted-foreground text-sm">
                      {kbSearch ? `No documents matching "${kbSearch}"` : "No knowledge base documents found."}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {kbData.documents.map((doc) => {
                        const isChecked = selectedKbDocIds.includes(doc.id);
                        const typeIcon = doc.type === "url" ? "🔗" : doc.type === "text" ? "📝" : doc.type === "folder" ? "📁" : "📄";
                        return (
                          <label
                            key={doc.id}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors",
                              isChecked && "bg-emerald-50/60 dark:bg-emerald-900/10"
                            )}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedKbDocIds((prev) => [...prev, doc.id]);
                                } else {
                                  setSelectedKbDocIds((prev) => prev.filter((id) => id !== doc.id));
                                }
                              }}
                            />
                            <span className="text-sm leading-none shrink-0">{typeIcon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.type}{doc.size_bytes > 0 ? ` · ${(doc.size_bytes / 1024).toFixed(1)} KB` : ""}
                              </p>
                            </div>
                            {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Configuration</>}
            </Button>

            {config.useElevenLabs && (
              <>
                <Button variant="default" onClick={handleDeployAgent} disabled={deploying || connectionStatus.apiKey !== "connected"} className="bg-primary">
                  {deploying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{config.elevenlabsAgentId ? "Updating..." : "Deploying..."}</> : <><Rocket className="mr-2 h-4 w-4" />{config.elevenlabsAgentId ? "Update on ElevenLabs" : "Deploy to ElevenLabs"}</>}
                </Button>

                {config.elevenlabsAgentId && (
                  <Button variant="outline" onClick={handleSyncFromElevenLabs} disabled={syncing}>
                    {syncing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing...</> : <><Download className="mr-2 h-4 w-4" />Sync from ElevenLabs</>}
                  </Button>
                )}

                {config.elevenlabsAgentId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deleting}>
                        {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : <><Trash2 className="mr-2 h-4 w-4" />Delete Agent</>}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete ElevenLabs Agent?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the agent from ElevenLabs.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex items-center space-x-2 py-2">
                        <Checkbox id="forceDelete" checked={forceDeleteLocal} onCheckedChange={(checked) => setForceDeleteLocal(checked === true)} />
                        <label htmlFor="forceDelete" className="text-sm text-muted-foreground cursor-pointer">Force clear (skip ElevenLabs API)</label>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setForceDeleteLocal(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteAgent(forceDeleteLocal)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {forceDeleteLocal ? "Force Clear" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}

            <Button variant="outline" onClick={loadConfiguration}>
              <RefreshCw className="mr-2 h-4 w-4" />Reset
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
