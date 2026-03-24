/**
 * Call Audit Tab
 * View call recordings, transcripts, and activity logs
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileAudio, Download, Search, Play, Pause, XCircle, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getConversation, getConversationAudio } from "@/services/elevenlabs.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface CallLog {
  id: string;
  call_sid: string;
  created_at: string;
  duration: number;
  status: string;
  ai_provider: string;
  patient_validated: boolean;
  insurance_verified: boolean;
  appointment_booked: boolean;
   appointment_id?: string | null;
  recording_url?: string;
  transcript?: string;
  elevenlabs_conversation_id?: string | null;
  outcome?: string | null;
  from_number?: string | null;
  to_number?: string | null;
  direction?: string | null;
}

interface CallAuditTabProps {
  direction?: "inbound" | "outbound";
}

export function CallAuditTab({ direction }: CallAuditTabProps) {
  const { toast } = useToast();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [conversationTranscript, setConversationTranscript] = useState<string | null>(null);
  const [conversationAudioUrl, setConversationAudioUrl] = useState<string | null>(null);
  const [conversationTurns, setConversationTurns] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const [audioLoading, setAudioLoading] = useState(false);
  const [retrySyncing, setRetrySyncing] = useState(false);

  useEffect(() => {
    loadCalls();
  }, [direction]);

  // Real-time subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel(`call_audit_realtime_${direction || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: 'ai_provider=eq.elevenlabs',
        },
        () => {
          loadCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [direction]);

  // Helper: parse a transcript JSON string into chat turns
  const parseTranscriptToTurns = (transcript: string | undefined | null): { role: "user" | "agent"; text: string }[] => {
    if (!transcript) return [];
    try {
      const parsed = JSON.parse(transcript);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((msg: any) => {
          const role = msg.role || msg.sender || msg.source || (msg.is_user ? "user" : "agent");
          const text = (msg.message || msg.text || msg.content || msg.transcript || "").trim();
          if (!text) return null;
          const normalizedRole: "user" | "agent" = role === "user" ? "user" : "agent";
          return { role: normalizedRole, text };
        })
        .filter((t): t is { role: "user" | "agent"; text: string } => !!t);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (!selectedCall) {
      setDetailsLoading(false);
      setDetailsError(null);
      setConversationTranscript(null);
      setConversationAudioUrl(null);
      setConversationTurns([]);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        setPlayingAudio(false);
      }
      return;
    }

    // Immediately parse DB transcript into turns so bubbles show right away
    const dbTurns = parseTranscriptToTurns(selectedCall.transcript);
    if (dbTurns.length > 0) {
      setConversationTurns(dbTurns);
      setConversationTranscript(
        dbTurns.map((t) => `${t.role === "user" ? "Patient" : "Agent"}: ${t.text}`).join("\n")
      );
    } else {
      setConversationTurns([]);
      setConversationTranscript(selectedCall.transcript || null);
    }

    const conversationId = selectedCall.elevenlabs_conversation_id;

    if (!conversationId) {
      setDetailsLoading(false);
      setDetailsError(null);
      setConversationAudioUrl(selectedCall.recording_url || null);
      return;
    }

    setDetailsLoading(true);
    setDetailsError(null);
    setConversationAudioUrl(null);

    (async () => {
      try {
        const conversation = await getConversation(conversationId);
        const messages = conversation?.transcript || [];

        // Helper to detect if text is likely a JSON/blob payload
        const isLikelyJSONBlob = (text: string): boolean => {
          const trimmed = text.trim();
          if (!trimmed) return false;
          const startsWithJSON = trimmed.startsWith("{") || trimmed.startsWith("[");
          const hasJSONMarkers =
            text.includes('"tool_name"') ||
            text.includes('"request_id"') ||
            text.includes('"webhook"') ||
            text.includes('"agent_metadata"') ||
            text.includes('"tool_has_been_called"') ||
            text.includes('"params_as_j') ||
            text.includes('"type":') ||
            text.includes('"call_RTGE') ||
            (text.match(/"[a-z_]+":/g) || []).length > 5;
          const isVeryLong = text.length > 500;
          return (startsWithJSON && hasJSONMarkers) || (isVeryLong && hasJSONMarkers);
        };

        const turns = (messages || [])
          .map((msg: any) => {
            const role = msg.role || msg.sender || msg.source || (msg.is_user ? "user" : "agent");
            const text = (msg.text || msg.message || msg.content || msg.transcript || "").trim();
            if (!text) return null;
            if (isLikelyJSONBlob(text)) return null;
            const normalizedRole: "user" | "agent" = role === "user" ? "user" : "agent";
            return { role: normalizedRole, text };
          })
          .filter((turn): turn is { role: "user" | "agent"; text: string } => !!turn);

        if (turns.length > 0) {
          const fullText = turns.map((t) => `${t.role === "user" ? "Patient" : "Agent"}: ${t.text}`).join("\n");
          setConversationTranscript(fullText);
          setConversationTurns(turns);
        }
        // If ElevenLabs returned nothing, keep the already-set DB turns
      } catch (error) {
        console.error("Error loading ElevenLabs conversation:", error);
        // Only show error if we have NO DB transcript to fall back on
        const hasFallback = parseTranscriptToTurns(selectedCall.transcript).length > 0;
        if (!hasFallback) {
          setDetailsError("Failed to load conversation details. Transcript may still be processing.");
        }
      } finally {
        setDetailsLoading(false);
      }

      // Audio (best-effort): try ElevenLabs first, fallback to recording_url
      setAudioLoading(true);
      try {
        const audioUrl = await getConversationAudio(conversationId);
        setConversationAudioUrl(audioUrl || selectedCall.recording_url || null);
      } catch (err) {
        console.warn("No ElevenLabs audio, falling back to recording_url:", err);
        setConversationAudioUrl(selectedCall.recording_url || null);
      } finally {
        setAudioLoading(false);
      }
    })();
  }, [selectedCall]);

  const loadCalls = async () => {
    try {
      let query = supabase
        .from("call_logs")
        .select("*")
        .eq("ai_provider", "elevenlabs");
      if (direction) {
        query = query.eq("direction", direction);
      }
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error("Error loading calls:", error);
      toast({ variant: "destructive", title: "Failed to load calls" });
    } finally {
      setLoading(false);
    }
  };

  const forceEndCall = async (callId: string) => {
    try {
      await supabase
        .from("call_logs")
        .update({
          status: "failed",
          ended_at: new Date().toISOString(),
          outcome: "force_ended_by_admin",
        })
        .eq("id", callId);
      toast({ title: "Call ended", description: "Call marked as failed." });
      loadCalls();
    } catch (err) {
      console.error("Error force-ending call:", err);
      toast({ variant: "destructive", title: "Failed to end call" });
    }
  };

  const endAllStaleCalls = async () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    try {
      const { count } = await supabase
        .from("call_logs")
        .update({
          status: "failed",
          ended_at: new Date().toISOString(),
          outcome: "stale_call_auto_ended",
        })
        .eq("ai_provider", "elevenlabs")
        .eq("status", "in-progress")
        .lt("created_at", thirtyMinAgo);
      toast({ title: "Cleanup complete", description: `Ended ${count || 0} stale calls.` });
      loadCalls();
    } catch (err) {
      console.error("Error ending stale calls:", err);
      toast({ variant: "destructive", title: "Failed to end stale calls" });
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current || !conversationAudioUrl) return;

    if (playingAudio) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => {
        console.error("Playback failed:", e);
        toast({ variant: "destructive", title: "Could not play audio" });
      });
    }
    setPlayingAudio(!playingAudio);
  };

  const filteredCalls = calls.filter((call) =>
    call.call_sid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const staleCalls = calls.filter((c) => c.status === "in-progress");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Call Audit Trail</CardTitle>
          <CardDescription>View and manage ElevenLabs agent conversations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Call SID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={loadCalls}>
              Refresh
            </Button>
            {staleCalls.length > 0 && (
              <Button variant="destructive" size="sm" onClick={endAllStaleCalls}>
                <Trash2 className="h-4 w-4 mr-1.5" />
                End {staleCalls.length} stale
              </Button>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call SID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcomes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Loading calls...
                    </TableCell>
                  </TableRow>
                ) : filteredCalls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No matching calls found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCalls.map((call) => (
                    <TableRow key={call.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-sm">{call.call_sid}</TableCell>
                      <TableCell>{new Date(call.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                      <TableCell>
                        {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, "0")}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            call.status === "completed" ? "default" :
                            call.status === "in-progress" ? "secondary" :
                            "destructive"
                          }
                        >
                          {call.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {call.patient_validated ? (
                            <Badge variant="outline" className="text-xs">Validated</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground border-muted">Not Validated</Badge>
                          )}
                          {call.insurance_verified ? (
                            <Badge variant="outline" className="text-xs">Insured</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground border-muted">Not Insured</Badge>
                          )}
                          {(call.appointment_id != null || call.appointment_booked) ? (
                            <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">Booked</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground border-muted">Not Booked</Badge>
                          )}
                          {call.outcome && (
                            <Badge variant="outline" className="text-xs capitalize">{call.outcome.replace(/_/g, ' ')}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCall(call)}>
                          View
                        </Button>
                        {call.status === "in-progress" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => forceEndCall(call.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCall && (
            <>
              <DialogHeader className="pb-4 border-b">
                <DialogTitle>Call Details</DialogTitle>
                <DialogDescription className="font-mono text-sm">
                  {selectedCall.call_sid}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Recording */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recording</h4>
                  {detailsLoading || audioLoading ? (
                    <div className="text-sm text-muted-foreground">
                      Loading recording from ElevenLabs…
                    </div>
                  ) : conversationAudioUrl ? (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAudio}
                        className="min-w-[110px]"
                      >
                        {playingAudio ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Play
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={conversationAudioUrl} download={`call-${selectedCall.call_sid.slice(-8)}.mp3`}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic bg-muted/40 p-3 rounded-md border">
                      No recording available for this call
                    </div>
                  )}
                  {detailsError && conversationTurns.length === 0 && (
                    <p className="text-xs text-destructive">{detailsError}</p>
                  )}
                </div>

              {/* Transcript */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Transcript</h4>
                    {selectedCall.elevenlabs_conversation_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={retrySyncing}
                        onClick={async () => {
                          setRetrySyncing(true);
                          try {
                            const conversation = await getConversation(selectedCall.elevenlabs_conversation_id!);
                            const messages = conversation?.transcript || [];
                            if (messages.length > 0) {
                              const turns = messages
                                .map((msg: any) => {
                                  const r = msg.role || (msg.is_user ? "user" : "agent");
                                  const t = (msg.text || msg.message || "").trim();
                                  if (!t) return null;
                                  return { role: r === "user" ? "user" as const : "agent" as const, text: t };
                                })
                                .filter(Boolean) as { role: "user" | "agent"; text: string }[];
                              if (turns.length > 0) {
                                setConversationTurns(turns);
                                setConversationTranscript(turns.map(t => `${t.role === "user" ? "Patient" : "Agent"}: ${t.text}`).join("\n"));
                                toast({ title: "Transcript synced", description: `${turns.length} messages loaded.` });
                              } else {
                                toast({ variant: "destructive", title: "No transcript available yet" });
                              }
                            } else {
                              toast({ variant: "destructive", title: "Transcript not available yet", description: "ElevenLabs may still be processing. Try again later." });
                            }
                          } catch {
                            toast({ variant: "destructive", title: "Sync failed", description: "Transcript not available from ElevenLabs." });
                          } finally {
                            setRetrySyncing(false);
                          }
                        }}
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", retrySyncing && "animate-spin")} />
                        {retrySyncing ? "Syncing…" : "Retry Sync"}
                      </Button>
                    )}
                  </div>
                  {detailsLoading && conversationTurns.length === 0 && !selectedCall?.transcript ? (
                    <div className="text-sm text-muted-foreground">Loading transcript from ElevenLabs…</div>
                  ) : conversationTurns.length > 0 ? (
                    <div className="p-4 bg-muted/30 rounded-lg border h-[260px] max-h-[260px] overflow-y-auto overflow-x-hidden">
                      <div className="space-y-3">
                        {conversationTurns.map((turn, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex",
                              turn.role === "user" ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                                turn.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-gray-200 text-foreground"
                              )}
                            >
                              <div className="text-[11px] font-medium mb-1 opacity-70">
                                {turn.role === "user" ? "Patient" : "Agent"}
                              </div>
                              <div className="whitespace-pre-wrap break-words leading-relaxed">
                                {turn.text}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedCall?.transcript ? (
                    <div className="p-4 bg-muted/30 rounded-lg border h-[260px] max-h-[260px] overflow-y-auto overflow-x-hidden">
                      <pre className="text-sm whitespace-pre-wrap break-words font-sans leading-relaxed">
                        {selectedCall.transcript}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic bg-muted/40 p-3 rounded-md border">
                      No transcript recorded for this call.
                    </div>
                  )}
                </div>

                {/* Outcomes */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Call Outcomes</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: "Patient Validated", value: selectedCall.patient_validated },
                      { label: "Insurance Verified", value: selectedCall.insurance_verified },
                      { label: "Appointment Booked", value: selectedCall.appointment_id != null || selectedCall.appointment_booked },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-4 rounded-lg border text-center",
                          item.value ? "bg-green-50/50 border-green-200" : "bg-red-50/40 border-red-200/70"
                        )}
                      >
                        <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                        <div className={cn(
                          "text-lg font-semibold",
                          item.value ? "text-green-700" : "text-red-700"
                        )}>
                          {item.value ? "✓ Yes" : "✗ No"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Persistent audio element */}
      {conversationAudioUrl && (
        <audio
          ref={audioRef}
          src={conversationAudioUrl}
          onEnded={() => setPlayingAudio(false)}
          onError={() => {
            toast({ variant: "destructive", title: "Audio playback error" });
            setPlayingAudio(false);
          }}
        />
      )}
    </div>
  );
}