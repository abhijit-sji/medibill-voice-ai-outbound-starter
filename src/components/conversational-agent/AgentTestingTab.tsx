/**
 * Agent Testing Tab
 * Comprehensive testing for both inbound and outbound agents
 * Browser WebRTC + Phone test call support
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
// No external debounce needed - using useRef-based approach
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Loader2, AlertCircle, Volume2, VolumeX, X, Phone, PhoneOutgoing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

interface AgentTestingTabProps {
  agentId: string | null;
  agentType: "inbound" | "outbound";
  configLoading: boolean;
}

export function AgentTestingTab({ agentId, agentType, configLoading }: AgentTestingTabProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // === Session state ===
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null);
  const disconnectReasonRef = useRef<string | null>(null);
  const callLogIdRef = useRef<string | null>(null);
  const callStartTime = useRef<Date | null>(null);

  // Phone test state
  const [testPhone, setTestPhone] = useState("");
  const [phoneTesting, setPhoneTesting] = useState(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist transcript to DB so AgentInActionWidget can pick it up
  const persistTranscript = useCallback((entries: TranscriptEntry[]) => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      if (!callLogIdRef.current || entries.length === 0) return;
      const jsonTranscript = JSON.stringify(
        entries.map(e => ({ role: e.role, message: e.text }))
      );
      await supabase
        .from("call_logs")
        .update({ transcript: jsonTranscript })
        .eq("id", callLogIdRef.current);
    }, 1000);
  }, []);

  // Watch transcript changes and persist
  useEffect(() => {
    if (transcript.length > 0) {
      persistTranscript(transcript);
    }
  }, [transcript, persistTranscript]);

  const appendOrUpdateTranscript = useCallback(
    (role: "user" | "agent", text: string, isFinal?: boolean) => {
      if (!text) return;
      setTranscript((prev) => {
        if (prev.length === 0) return [...prev, { role, text, timestamp: new Date() }];
        const last = prev[prev.length - 1];
        if (!isFinal && last.role === role) {
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, text };
          return updated;
        }
        return [...prev, { role, text, timestamp: new Date() }];
      });
    },
    []
  );

  // === Conversation hook ===
  const conversation = useConversation({
    onConnect: ({ conversationId }: { conversationId: string }) => {
      console.log("ElevenLabs conversation connected, id:", conversationId);
      toast({ title: "Connected", description: "Voice agent is ready. Start speaking!" });
      if (callLogIdRef.current) {
        supabase
          .from("call_logs")
          .update({ elevenlabs_conversation_id: conversationId })
          .eq("id", callLogIdRef.current)
          .then(({ error }) => { if (error) console.error("Failed to save conversation id:", error); });
      }
    },
    onDisconnect: (details: any) => {
      const reason = details?.reason;
      if (reason === "error" && !disconnectReasonRef.current) {
        const errorMsg = "The agent disconnected due to an error. This may be caused by insufficient ElevenLabs credits or a configuration issue.";
        disconnectReasonRef.current = errorMsg;
        setDisconnectReason(errorMsg);
      } else if (reason === "agent" && !disconnectReasonRef.current && callStartTime.current) {
        const duration = Math.round((Date.now() - callStartTime.current.getTime()) / 1000);
        if (duration < 5) {
          const msg = "The agent ended the conversation after less than 5 seconds. This may indicate insufficient credits.";
          disconnectReasonRef.current = msg;
          setDisconnectReason(msg);
        }
      }
      finalizeCallLog();
    },
    onMessage: (message: any) => {
      try {
        if (typeof message?.message === "string" && (message.role === "user" || message.role === "agent")) {
          appendOrUpdateTranscript(message.role, message.message, true);
          return;
        }
        if (message.type === "user_transcript") {
          const evt = message.user_transcription_event || message.user_transcript_event || message.user_transcript;
          const text = evt?.user_transcript ?? evt?.transcript ?? evt?.text;
          if (text) appendOrUpdateTranscript("user", text, evt?.is_final ?? evt?.final);
          return;
        }
        if (message.type === "agent_response" || message.type === "agent_response_completed") {
          const evt = message.agent_response_event || message.agent_response_completed_event || message.agent_response;
          const text = evt?.agent_response ?? evt?.transcript ?? evt?.text;
          if (text) appendOrUpdateTranscript("agent", text, evt?.is_final ?? evt?.final);
          return;
        }
        if (message.type === "agent_response_correction") {
          const correctedEvt = message.agent_response_correction_event || message.agent_response_correction;
          const corrected = correctedEvt?.corrected_agent_response ?? correctedEvt?.transcript ?? correctedEvt?.text;
          if (corrected) {
            setTranscript((prev) => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === "agent") { updated[i] = { ...updated[i], text: corrected }; break; }
              }
              return updated;
            });
          }
          return;
        }
        if (message.type === "input_transcript" || message.type === "output_transcript") {
          const evt = message.transcript_event || message.input_transcript_event || message.output_transcript_event || message;
          const text = evt?.transcript ?? evt?.text;
          const role = message.type === "input_transcript" ? "user" : "agent";
          if (text) appendOrUpdateTranscript(role, text, evt?.is_final ?? evt?.final);
        }
      } catch (e) {
        console.warn("Failed to parse transcript message", e);
      }
    },
    onError: (error: any) => {
      const errorMsg = typeof error === "string" ? error : error?.message || JSON.stringify(error) || "Unknown error";
      const reason = errorMsg.toLowerCase().includes("quota") || errorMsg.toLowerCase().includes("credit")
        ? `ElevenLabs quota exceeded: ${errorMsg}`
        : `Voice agent error: ${errorMsg}`;
      disconnectReasonRef.current = reason;
      setDisconnectReason(reason);
      toast({ title: "Connection Error", description: reason, variant: "destructive" });
    },
  });

  const isConnected = conversation.status === "connected";

  // Beforeunload handler
  useEffect(() => {
    const handler = () => {
      if (callLogIdRef.current && callStartTime.current) {
        const duration = Math.round((Date.now() - callStartTime.current.getTime()) / 1000);
        const body = JSON.stringify({ status: "completed", ended_at: new Date().toISOString(), duration, outcome: "test_call_ended_by_navigation" });
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/call_logs?id=eq.${callLogIdRef.current}`,
          new Blob([body], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const createCallLog = async () => {
    try {
      const { data, error } = await supabase
        .from("call_logs")
        .insert({
          call_type: "voice",
          direction: agentType === "outbound" ? "outbound" : "inbound",
          status: "in-progress",
          ai_provider: "elevenlabs",
          elevenlabs_agent_id: agentId,
          clinic_id: "00000000-0000-0000-0000-000000000001",
          call_sid: `test-${Date.now()}`,
          from_number: "browser",
          to_number: "elevenlabs-agent",
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (!error && data) {
        callLogIdRef.current = data.id;
        return data.id;
      }
    } catch (err) {
      console.error("Failed to create call log:", err);
    }
    return null;
  };

  const finalizeCallLog = async () => {
    if (!callLogIdRef.current || !callStartTime.current) return;
    const currentCallLogId = callLogIdRef.current;
    const duration = Math.round((Date.now() - callStartTime.current.getTime()) / 1000);
    try {
      await supabase
        .from("call_logs")
        .update({
          status: "completed",
          ended_at: new Date().toISOString(),
          duration,
          outcome: disconnectReasonRef.current ? `error: ${disconnectReasonRef.current}` : "test_call_completed",
        })
        .eq("id", currentCallLogId);
    } catch (err) {
      console.error("Failed to update call log:", err);
    }
    callLogIdRef.current = null;
    callStartTime.current = null;
  };

  const startConversation = useCallback(async () => {
    if (!agentId) {
      toast({ title: "No Agent Configured", description: "Deploy an agent first in the Configuration tab.", variant: "destructive" });
      return;
    }
    setIsConnecting(true);
    setTranscript([]);
    setDisconnectReason(null);
    disconnectReasonRef.current = null;

    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token", { body: { agent_id: agentId } });
      if (error || data?.success === false || !data?.token) {
        const errorMessage = data?.message || error?.message || "Failed to get conversation token";
        disconnectReasonRef.current = errorMessage;
        setDisconnectReason(errorMessage);
        throw new Error(errorMessage);
      }
      callStartTime.current = new Date();
      await createCallLog();
      await conversation.startSession({ conversationToken: data.token, connectionType: "webrtc" });
    } catch (error: any) {
      console.error("Failed to start conversation:", error);
      toast({ title: "Failed to Start", description: error.message || "Could not connect to voice agent.", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  }, [agentId, conversation, toast]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  // Phone test call
  const handlePhoneTest = async () => {
    const phone = testPhone.trim();
    if (!phone) {
      toast({ title: "Phone number required", description: "Enter a phone number to test.", variant: "destructive" });
      return;
    }
    setPhoneTesting(true);
    try {
      if (agentType === "outbound") {
        const { data, error } = await supabase.functions.invoke("start-outbound-appointment-call", { body: { phone_number: phone } });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Failed to start outbound call.");
        toast({ title: "Test call started", description: "Outbound call initiated to the provided number." });
      } else {
        const { data, error } = await supabase.functions.invoke("initiate-test-call", { body: { phone_number: phone, agent_id: agentId } });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Failed to start inbound test call.");
        toast({ title: "Test call started", description: "Inbound test call initiated — your phone should ring." });
      }
    } catch (err: any) {
      console.error("Phone test failed:", err);
      toast({ title: "Error", description: err.message || "Failed to start test call.", variant: "destructive" });
    } finally {
      setPhoneTesting(false);
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="browser" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browser" className="gap-2">
            <Mic className="h-4 w-4" />
            Browser Test
          </TabsTrigger>
          <TabsTrigger value="phone" className="gap-2">
            <Phone className="h-4 w-4" />
            Phone Test
          </TabsTrigger>
        </TabsList>

        {/* Browser WebRTC Test */}
        <TabsContent value="browser" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Voice Agent Test Console</CardTitle>
              <CardDescription>
                Talk to your {agentType} agent directly in the browser via WebRTC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!agentId && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No ElevenLabs Agent ID configured. Deploy an agent in the <strong>Configuration</strong> tab first.
                  </AlertDescription>
                </Alert>
              )}

              {agentId && !disconnectReason && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will start a real-time voice conversation using your microphone. Make sure your speakers/headphones are on.
                  </AlertDescription>
                </Alert>
              )}

              {disconnectReason && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-start justify-between gap-2">
                    <span>{disconnectReason}</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={() => { setDisconnectReason(null); disconnectReasonRef.current = null; }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center gap-4">
                {!isConnected ? (
                  <Button onClick={startConversation} disabled={isConnecting || !agentId} size="lg" className="min-w-[200px]">
                    {isConnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</> : <><Mic className="mr-2 h-4 w-4" />Start Conversation</>}
                  </Button>
                ) : (
                  <Button onClick={stopConversation} variant="destructive" size="lg" className="min-w-[200px]">
                    <MicOff className="mr-2 h-4 w-4" />End Conversation
                  </Button>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                  {isConnected && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      {conversation.isSpeaking ? <><Volume2 className="h-3 w-3 animate-pulse" />Agent Speaking</> : <><VolumeX className="h-3 w-3" />Listening</>}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Transcript */}
          <Card>
            <CardHeader>
              <CardTitle>Live Transcript</CardTitle>
              <CardDescription>
                {isConnected ? "Real-time conversation transcript" : transcript.length > 0 ? "Transcript from last conversation" : "Start a conversation to see the transcript"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] rounded-md border p-4">
                {transcript.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {isConnected ? "Waiting for conversation to begin..." : "No transcript yet. Start a conversation above."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {transcript.map((entry, i) => (
                      <div key={i} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${entry.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          <p className="text-xs font-medium mb-1 opacity-70">{entry.role === "user" ? "You" : "Agent"}</p>
                          {entry.text}
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phone Test */}
        <TabsContent value="phone">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {agentType === "outbound" ? <PhoneOutgoing className="h-5 w-5 text-primary" /> : <Phone className="h-5 w-5 text-primary" />}
                Phone Test Call
              </CardTitle>
              <CardDescription>
                {agentType === "outbound"
                  ? "Trigger an outbound call to a phone number using this agent"
                  : "Call a phone number to test the inbound agent — your phone will ring and the agent will answer"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!agentId && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Deploy an agent in the Configuration tab first.</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="testPhone">Phone Number</Label>
                <Input id="testPhone" placeholder="+1XXXYYYZZZZ" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              </div>
              <Button onClick={handlePhoneTest} disabled={phoneTesting || !agentId}>
                {phoneTesting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Calling...</> : <><Phone className="h-4 w-4 mr-2" />Start Test Call</>}
              </Button>
            </CardContent>
          </Card>

          {/* Test Scenarios */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Test Scenarios</CardTitle>
              <CardDescription>Common scenarios to test with your {agentType} agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {agentType === "inbound" ? (
                  <>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">1. New Patient Scheduling</h4>
                      <p className="text-sm text-muted-foreground">Test patient validation, insurance verification, and appointment booking</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">2. Existing Patient Rescheduling</h4>
                      <p className="text-sm text-muted-foreground">Test patient lookup, availability checking, and appointment modification</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">3. Insurance Verification</h4>
                      <p className="text-sm text-muted-foreground">Test insurance provider lookup and coverage verification</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">4. Provider Availability</h4>
                      <p className="text-sm text-muted-foreground">Test real-time provider schedule checking and slot availability</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">1. Post-Registration Follow-up</h4>
                      <p className="text-sm text-muted-foreground">Test identity confirmation and first appointment booking after registration</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">2. No-Answer Retry</h4>
                      <p className="text-sm text-muted-foreground">Test call queue retry logic when the patient doesn't answer</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">3. Appointment Booking</h4>
                      <p className="text-sm text-muted-foreground">Test availability check and booking flow during outbound call</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">4. Patient Declines</h4>
                      <p className="text-sm text-muted-foreground">Test graceful handling when patient isn't ready to book</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
