import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getElevenLabsVoices } from "@/services/integrations.service";
import {
  PhoneOutgoing,
  Save,
  TestTube2,
  Loader2,
  Rocket,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

const DEFAULT_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

const DEFAULT_OUTBOUND_PROMPT = `You are Alex, a friendly outreach assistant for our medical clinic. You are calling the patient on behalf of the clinic after they completed their online registration. Help the patient book their first appointment. Keep the call short and focused. Confirm identity briefly (name and DOB) then move to booking. Use get_current_datetime when discussing dates. Use find_patient, verify_insurance, check_availability, and book_appointment as needed. Do not send a registration form. Be warm and concise.`;

const DEFAULT_OUTBOUND_FIRST_MESSAGE =
  "Hi, this is Alex from the clinic. You recently completed your registration with us—thank you. We're calling to see if you'd like to book your first appointment now. Do you have a couple of minutes?";

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
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

interface OutboundAgentSettings {
  id: string | null;
  isEnabled: boolean;
  maxItemsPerRun: number;
  maxAttempts: number;
  retryIntervals: string; // comma-separated hours, e.g. "4,24"
  workingHoursStart: string;
  workingHoursEnd: string;
}

interface OutboundAgentConfig {
  elevenlabsAgentId: string;
  agentName: string;
  systemPrompt: string;
  firstMessage: string;
  elevenlabsVoiceId: string;
  elevenlabsModel: string;
  llmModel: string;
  stability: number;
  similarityBoost: number;
  style: number;
  language: string;
}

export function OutboundAgentConfigTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingAgentConfig, setSavingAgentConfig] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [llmModels, setLlmModels] = useState<LLMModel[]>(FALLBACK_LLM_OPTIONS);
  const [apiKeyStatus, setApiKeyStatus] = useState<"checking" | "connected" | "missing">("checking");
  const [settings, setSettings] = useState<OutboundAgentSettings>({
    id: null,
    isEnabled: false,
    maxItemsPerRun: 10,
    maxAttempts: 3,
    retryIntervals: "4,24",
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
  });
  const [agentConfig, setAgentConfig] = useState<OutboundAgentConfig>({
    elevenlabsAgentId: "",
    agentName: "Alex",
    systemPrompt: DEFAULT_OUTBOUND_PROMPT,
    firstMessage: DEFAULT_OUTBOUND_FIRST_MESSAGE,
    elevenlabsVoiceId: "",
    elevenlabsModel: "eleven_turbo_v2",
    llmModel: "gpt-4o",
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0,
    language: "en",
  });
  const [testPhone, setTestPhone] = useState("");

  const llmOptions = useMemo(() => {
    const base = [...llmModels];
    if (agentConfig.llmModel && !base.some((o) => o.value === agentConfig.llmModel)) {
      base.push({ value: agentConfig.llmModel, label: agentConfig.llmModel, provider: "Current" });
    }
    const providers = Array.from(new Set(base.map((m) => m.provider)));
    return { models: base, providers };
  }, [llmModels, agentConfig.llmModel]);

  const loadVoices = async () => {
    try {
      const voicesData = await getElevenLabsVoices();
      const voicesList = Array.isArray(voicesData) ? voicesData : (voicesData?.voices || []);
      setVoices(
        voicesList.map((v: any) => ({ voice_id: v.id || v.voice_id, name: v.name, category: v.category }))
      );
    } catch (err) {
      console.error("Failed to load voices:", err);
    }
  };

  const loadLLMModels = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-elevenlabs-llm-models");
      if (!error && data?.models?.length) setLlmModels(data.models);
    } catch (err) {
      console.error("Failed to load LLM models:", err);
    }
  };

  const checkApiKeyStatus = async () => {
    try {
      const { data } = await supabase
        .from("integration_settings")
        .select("settings, is_enabled")
        .eq("integration_name", "elevenlabs")
        .maybeSingle();
      const hasKey = data?.is_enabled && !!(data?.settings as any)?.api_key;
      setApiKeyStatus(hasKey ? "connected" : "missing");
    } catch {
      setApiKeyStatus("missing");
    }
  };

  useEffect(() => {
    loadVoices();
    loadLLMModels();
    checkApiKeyStatus();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("outbound_agent_settings")
          .select("*")
          .eq("clinic_id", DEFAULT_CLINIC_ID)
          .eq("agent_type", "outbound_call")
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            id: data.id,
            isEnabled: data.is_enabled ?? false,
            maxItemsPerRun: data.max_items_per_run ?? 10,
            maxAttempts: data.max_attempts ?? 3,
            retryIntervals: Array.isArray(data.retry_interval_hours)
              ? (data.retry_interval_hours as number[]).join(",")
              : typeof data.retry_interval_hours === "string"
              ? data.retry_interval_hours
              : "4,24",
            workingHoursStart: data.working_hours_start ?? "09:00",
            workingHoursEnd: data.working_hours_end ?? "18:00",
          });
          const s = (data.settings as Record<string, unknown>) || {};
          setAgentConfig({
            elevenlabsAgentId: (s.elevenlabs_agent_id as string) || "",
            agentName: (s.agent_name as string) || "Alex",
            systemPrompt: (s.system_prompt as string) || DEFAULT_OUTBOUND_PROMPT,
            firstMessage: (s.first_message as string) || DEFAULT_OUTBOUND_FIRST_MESSAGE,
            elevenlabsVoiceId: (s.elevenlabs_voice_id as string) || "",
            elevenlabsModel: (s.elevenlabs_model as string) || "eleven_turbo_v2",
            llmModel: (s.llm_model as string) || "gpt-4o",
            stability: typeof s.stability === "number" ? s.stability : 0.5,
            similarityBoost: typeof s.similarity_boost === "number" ? s.similarity_boost : 0.8,
            style: typeof s.style === "number" ? s.style : 0,
            language: (s.language as string) || "en",
          });
        }
      } catch (err) {
        console.error("Failed to load outbound agent settings:", err);
        toast({
          title: "Error",
          description: "Failed to load outbound agent settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const retryIntervals = settings.retryIntervals
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n > 0);

      const payload: any = {
        clinic_id: DEFAULT_CLINIC_ID,
        agent_type: "outbound_call",
        is_enabled: settings.isEnabled,
        max_items_per_run: settings.maxItemsPerRun,
        max_attempts: settings.maxAttempts,
        retry_interval_hours: retryIntervals.length > 0 ? retryIntervals : [4, 24],
        working_hours_start: settings.workingHoursStart,
        working_hours_end: settings.workingHoursEnd,
        elevenlabs_agent_id: agentConfig.elevenlabsAgentId || null,
        settings: {
          agent_name: agentConfig.agentName,
          system_prompt: agentConfig.systemPrompt,
          first_message: agentConfig.firstMessage,
          elevenlabs_voice_id: agentConfig.elevenlabsVoiceId,
          elevenlabs_model: agentConfig.elevenlabsModel,
          llm_model: agentConfig.llmModel,
          stability: agentConfig.stability,
          similarity_boost: agentConfig.similarityBoost,
          style: agentConfig.style,
          language: agentConfig.language,
        },
      };

      if (settings.id) {
        payload.id = settings.id;
      }

      const { error } = await supabase.from("outbound_agent_settings").upsert(payload);
      if (error) throw error;

      toast({ title: "Saved", description: "Outbound agent settings updated successfully." });
    } catch (err) {
      console.error("Failed to save outbound agent settings:", err);
      toast({
        title: "Error",
        description: "Failed to save outbound agent settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAgentConfig = async () => {
    setSavingAgentConfig(true);
    try {
      const payload: any = {
        clinic_id: DEFAULT_CLINIC_ID,
        agent_type: "outbound_call",
        is_enabled: settings.isEnabled,
        max_items_per_run: settings.maxItemsPerRun,
        max_attempts: settings.maxAttempts,
        retry_interval_hours: settings.retryIntervals
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n) && n > 0) || [4, 24],
        working_hours_start: settings.workingHoursStart,
        working_hours_end: settings.workingHoursEnd,
        elevenlabs_agent_id: agentConfig.elevenlabsAgentId || null,
        settings: {
          agent_name: agentConfig.agentName,
          system_prompt: agentConfig.systemPrompt,
          first_message: agentConfig.firstMessage,
          elevenlabs_voice_id: agentConfig.elevenlabsVoiceId,
          elevenlabs_model: agentConfig.elevenlabsModel,
          llm_model: agentConfig.llmModel,
          stability: agentConfig.stability,
          similarity_boost: agentConfig.similarityBoost,
          style: agentConfig.style,
          language: agentConfig.language,
        },
      };
      if (settings.id) payload.id = settings.id;
      const { error } = await supabase.from("outbound_agent_settings").upsert(payload);
      if (error) throw error;
      toast({ title: "Saved", description: "Outbound voice agent configuration saved." });
    } catch (err) {
      console.error("Failed to save outbound agent config:", err);
      toast({ title: "Error", description: "Failed to save agent configuration.", variant: "destructive" });
    } finally {
      setSavingAgentConfig(false);
    }
  };

  const handleDeployOutboundAgent = async () => {
    if (apiKeyStatus !== "connected") {
      toast({
        title: "Error",
        description: "ElevenLabs API key not configured. Go to Integrations > ElevenLabs to set it up.",
        variant: "destructive",
      });
      return;
    }
    if (!agentConfig.elevenlabsVoiceId) {
      toast({ title: "Error", description: "Please select a voice before deploying.", variant: "destructive" });
      return;
    }
    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-elevenlabs-agent", {
        body: {
          name: agentConfig.agentName || "Outbound Appointment Agent",
          voice_id: agentConfig.elevenlabsVoiceId,
          model: agentConfig.elevenlabsModel,
          first_message: agentConfig.firstMessage,
          system_prompt: agentConfig.systemPrompt,
          language: agentConfig.language,
          llm_model: agentConfig.llmModel,
          voice_settings: {
            stability: agentConfig.stability,
            similarity_boost: agentConfig.similarityBoost,
            style: agentConfig.style,
          },
          ...(agentConfig.elevenlabsAgentId ? { agent_id: agentConfig.elevenlabsAgentId } : {}),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const agentId = data.agent_id;
      setAgentConfig((prev) => ({ ...prev, elevenlabsAgentId: agentId }));
      const payload: any = {
        clinic_id: DEFAULT_CLINIC_ID,
        agent_type: "outbound_call",
        is_enabled: settings.isEnabled,
        max_items_per_run: settings.maxItemsPerRun,
        max_attempts: settings.maxAttempts,
        retry_interval_hours: [4, 24],
        working_hours_start: settings.workingHoursStart,
        working_hours_end: settings.workingHoursEnd,
        elevenlabs_agent_id: agentId,
        settings: {
          agent_name: agentConfig.agentName,
          system_prompt: agentConfig.systemPrompt,
          first_message: agentConfig.firstMessage,
          elevenlabs_voice_id: agentConfig.elevenlabsVoiceId,
          elevenlabs_model: agentConfig.elevenlabsModel,
          llm_model: agentConfig.llmModel,
          stability: agentConfig.stability,
          similarity_boost: agentConfig.similarityBoost,
          style: agentConfig.style,
          language: agentConfig.language,
        },
      };
      if (settings.id) payload.id = settings.id;
      await supabase.from("outbound_agent_settings").upsert(payload);
      toast({
        title: data.updated ? "Agent Updated" : "Agent Deployed",
        description: `ElevenLabs Agent ID: ${agentId}`,
      });
    } catch (err: any) {
      console.error("Deploy error:", err);
      toast({
        title: "Deployment Failed",
        description: err?.message || "Failed to deploy outbound agent to ElevenLabs",
        variant: "destructive",
      });
    } finally {
      setDeploying(false);
    }
  };

  const handleSyncFromElevenLabs = async () => {
    if (!agentConfig.elevenlabsAgentId) {
      toast({ title: "Error", description: "No outbound agent ID to sync from.", variant: "destructive" });
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-elevenlabs-agent", {
        body: { agent_id: agentConfig.elevenlabsAgentId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAgentConfig((prev) => ({
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
      const fullPayload: any = {
        clinic_id: DEFAULT_CLINIC_ID,
        agent_type: "outbound_call",
        is_enabled: settings.isEnabled,
        max_items_per_run: settings.maxItemsPerRun,
        max_attempts: settings.maxAttempts,
        retry_interval_hours: [4, 24],
        working_hours_start: settings.workingHoursStart,
        working_hours_end: settings.workingHoursEnd,
        elevenlabs_agent_id: agentConfig.elevenlabsAgentId,
        settings: {
          agent_name: data.name,
          system_prompt: data.system_prompt,
          first_message: data.first_message,
          elevenlabs_voice_id: data.voice_id,
          elevenlabs_model: data.model_id,
          llm_model: data.llm_model,
          language: data.language,
          stability: data.stability,
          similarity_boost: data.similarity_boost,
          style: data.style,
        },
      };
      if (settings.id) fullPayload.id = settings.id;
      await supabase.from("outbound_agent_settings").upsert(fullPayload);
      toast({ title: "Synced", description: "Outbound agent configuration synced from ElevenLabs." });
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err?.message || "Failed to sync from ElevenLabs",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleResetAgentConfig = () => {
    setAgentConfig({
      elevenlabsAgentId: agentConfig.elevenlabsAgentId,
      agentName: "Alex",
      systemPrompt: DEFAULT_OUTBOUND_PROMPT,
      firstMessage: DEFAULT_OUTBOUND_FIRST_MESSAGE,
      elevenlabsVoiceId: "",
      elevenlabsModel: "eleven_turbo_v2",
      llmModel: "gpt-4o",
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0,
      language: "en",
    });
  };

  const handleTestCall = async () => {
    const phone = testPhone.trim();
    if (!phone) {
      toast({
        title: "Phone number required",
        description: "Enter a phone number to start a test call.",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);
    try {
      // Directly start a single outbound test call without using the campaign/queue processor
      const { data: result, error } = await supabase.functions.invoke("start-outbound-appointment-call", {
        body: {
          phone_number: phone,
        },
      });

      if (error) throw error;
      if (!result?.success) {
        throw new Error(result?.error || "Failed to start outbound test call.");
      }

      toast({
        title: "Test call started",
        description: "A single outbound test call has been initiated to the provided number.",
      });
    } catch (err) {
      console.error("Failed to trigger test outbound call:", err);
      toast({
        title: "Error",
        description: "Failed to start outbound test call.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 mt-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PhoneOutgoing className="h-5 w-5 text-primary" />
              Outbound Appointment Agent
            </CardTitle>
            <CardDescription>
              Configure the autonomous outbound call agent that follows up with new patients after they complete registration.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable outbound appointment agent</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, the outbound-call-agent will process the queue and start ElevenLabs-powered calls.
              </p>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(checked) => setSettings((s) => ({ ...s, isEnabled: checked }))}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="maxItemsPerRun">Max items per run</Label>
              <Input
                id="maxItemsPerRun"
                type="number"
                min={1}
                value={settings.maxItemsPerRun}
                onChange={(e) => setSettings((s) => ({ ...s, maxItemsPerRun: Number(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxAttempts">Max attempts per number</Label>
              <Input
                id="maxAttempts"
                type="number"
                min={1}
                value={settings.maxAttempts}
                onChange={(e) => setSettings((s) => ({ ...s, maxAttempts: Number(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="retryIntervals">Retry intervals (hours)</Label>
              <Input
                id="retryIntervals"
                placeholder="4,24"
                value={settings.retryIntervals}
                onChange={(e) => setSettings((s) => ({ ...s, retryIntervals: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Comma-separated hours between attempts (e.g. 4,24).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="workingHoursStart">Working hours start</Label>
              <Input
                id="workingHoursStart"
                type="time"
                value={settings.workingHoursStart}
                onChange={(e) => setSettings((s) => ({ ...s, workingHoursStart: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="workingHoursEnd">Working hours end</Label>
              <Input
                id="workingHoursEnd"
                type="time"
                value={settings.workingHoursEnd}
                onChange={(e) => setSettings((s) => ({ ...s, workingHoursEnd: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Outbound Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Outbound Voice Agent (ElevenLabs)</CardTitle>
          <CardDescription>
            Configure the separate ElevenLabs agent used for outbound calls. Deploy to create or update the agent in ElevenLabs; attach tools get_current_datetime, find_patient, verify_insurance, check_availability, book_appointment (no send_registration_form).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              {apiKeyStatus === "checking" ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : apiKeyStatus === "connected" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <div>
                <p className="text-sm font-medium">ElevenLabs API Key</p>
                <p className="text-xs text-muted-foreground">
                  {apiKeyStatus === "connected" ? "Configured" : apiKeyStatus === "checking" ? "Checking..." : "Not configured"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              {agentConfig.elevenlabsAgentId ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium">Outbound Agent ID</p>
                <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                  {agentConfig.elevenlabsAgentId || "Not deployed"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outboundAgentName">Agent name</Label>
              <Input
                id="outboundAgentName"
                value={agentConfig.agentName}
                onChange={(e) => setAgentConfig((c) => ({ ...c, agentName: e.target.value }))}
                placeholder="Alex"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outboundVoice">Voice</Label>
              <Select
                value={agentConfig.elevenlabsVoiceId}
                onValueChange={(v) => setAgentConfig((c) => ({ ...c, elevenlabsVoiceId: v }))}
              >
                <SelectTrigger id="outboundVoice">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} {voice.category ? `(${voice.category})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>TTS model</Label>
              <Select
                value={agentConfig.elevenlabsModel}
                onValueChange={(v) => setAgentConfig((c) => ({ ...c, elevenlabsModel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eleven_flash_v2">Eleven Flash v2 (Ultra fast, English)</SelectItem>
                  <SelectItem value="eleven_turbo_v2">Eleven Turbo v2 (High quality, English)</SelectItem>
                  <SelectItem value="eleven_multilingual_v2">Eleven Multilingual v2 (Multi-language)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>LLM model</Label>
              <Select
                value={agentConfig.llmModel}
                onValueChange={(v) => setAgentConfig((c) => ({ ...c, llmModel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {llmOptions.providers.map((provider) => (
                    <div key={provider}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{provider}</div>
                      {llmOptions.models
                        .filter((m) => m.provider === provider)
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Stability</Label>
                <span className="text-sm text-muted-foreground">{agentConfig.stability}</span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={[agentConfig.stability]}
                onValueChange={([v]) => setAgentConfig((c) => ({ ...c, stability: v }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Similarity boost</Label>
                <span className="text-sm text-muted-foreground">{agentConfig.similarityBoost}</span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={[agentConfig.similarityBoost]}
                onValueChange={([v]) => setAgentConfig((c) => ({ ...c, similarityBoost: v }))}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Style</Label>
                <span className="text-sm text-muted-foreground">{agentConfig.style}</span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={[agentConfig.style]}
                onValueChange={([v]) => setAgentConfig((c) => ({ ...c, style: v }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outboundFirstMessage">First message</Label>
            <Textarea
              id="outboundFirstMessage"
              value={agentConfig.firstMessage}
              onChange={(e) => setAgentConfig((c) => ({ ...c, firstMessage: e.target.value }))}
              placeholder="Opening line when the patient answers..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outboundSystemPrompt">System prompt</Label>
            <Textarea
              id="outboundSystemPrompt"
              value={agentConfig.systemPrompt}
              onChange={(e) => setAgentConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
              placeholder="Instructions for the outbound agent..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSaveAgentConfig} disabled={savingAgentConfig || loading}>
              {savingAgentConfig ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {savingAgentConfig ? "Saving..." : "Save configuration"}
            </Button>
            <Button
              onClick={handleDeployOutboundAgent}
              disabled={deploying || apiKeyStatus !== "connected" || !agentConfig.elevenlabsVoiceId}
            >
              {deploying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
              {deploying ? "Deploying..." : agentConfig.elevenlabsAgentId ? "Update on ElevenLabs" : "Deploy to ElevenLabs"}
            </Button>
            {agentConfig.elevenlabsAgentId && (
              <Button variant="outline" onClick={handleSyncFromElevenLabs} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                {syncing ? "Syncing..." : "Sync from ElevenLabs"}
              </Button>
            )}
            <Button variant="outline" onClick={handleResetAgentConfig}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5 text-primary" />
            Quick Test Call
          </CardTitle>
          <CardDescription>
            Trigger a single outbound call using the current settings. This will enqueue one test item and run the outbound-call-agent
            immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="testPhone">Test phone number</Label>
            <Input
              id="testPhone"
              placeholder="+1XXXYYYZZZZ"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleTestCall} disabled={testing}>
              <TestTube2 className="h-4 w-4 mr-2" />
              {testing ? "Starting test call..." : "Start Test Call"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

