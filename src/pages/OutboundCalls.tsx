import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import {
  Phone,
  PhoneOutgoing,
  PhoneMissed,
  PhoneCall,
  Clock,
  CheckCircle,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type RegistrationCall = {
  id: string;
  patient_id: string | null;
  phone_number: string;
  contact_name: string | null;
  status: string;
  outcome: string | null;
  outcome_notes: string | null;
  attempt_count: number;
  max_attempts: number;
  call_sid: string | null;
  last_attempt_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  patients: { id: string; first_name: string; last_name: string } | null;
  lead?: { id: string; status: string; last_contacted_at: string | null } | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
};

const OUTCOME_COLORS: Record<string, string> = {
  booked: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  call_initiated: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  no_answer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  voicemail: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  call_failed: "bg-destructive/10 text-destructive",
  not_interested: "bg-muted text-muted-foreground",
};

const OUTCOME_LABELS: Record<string, string> = {
  call_initiated: "Call Initiated",
  booked: "Booked",
  no_answer: "No Answer",
  voicemail: "Voicemail",
  call_failed: "Call Failed",
  not_interested: "Not Interested",
  callback_requested: "Callback Requested",
};

// Mirror the pipeline stages from LeadManagement so statuses stay consistent.
const LEAD_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  new: {
    label: "New",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  contacted: {
    label: "Contacted",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  follow_up: {
    label: "Follow Up",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  },
  qualified: {
    label: "Registered",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  booked: {
    label: "Booked",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  lost: {
    label: "Lost",
    color: "bg-muted text-muted-foreground",
  },
};

const PAGE_SIZE = 15;

export default function OutboundCalls() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: calls = [], isLoading, refetch } = useQuery({
    queryKey: ["registration-calls"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("outbound_call_queue" as any)
        .select(
          "*, patients(id, first_name, last_name), lead:leads!outbound_call_queue_lead_id_fkey(id, status, last_contacted_at)",
        )
        .eq("call_type", "new_patient_registration_follow_up")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as RegistrationCall[];
    },
    refetchInterval: 30_000,
  });

  // Realtime subscription — invalidate query whenever any registration call row changes
  useEffect(() => {
    const channel = supabase
      .channel("registration-calls-realtime")
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "outbound_call_queue",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["registration-calls"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const callAgain = useMutation({
    mutationFn: async (call: RegistrationCall) => {
      const { data, error } = await supabase.functions.invoke("start-outbound-appointment-call", {
        body: {
          phone_number: call.phone_number,
          patient_id: call.patient_id,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Call failed to start");
      return data;
    },
    onSuccess: (_, call) => {
      toast({
        title: "Call initiated",
        description: `Calling ${call.contact_name || call.phone_number}…`,
      });
      queryClient.invalidateQueries({ queryKey: ["registration-calls"] });
    },
    onError: (err: Error) =>
      toast({ title: "Could not place call", description: err.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    let items = calls;
    if (statusFilter !== "all") {
      items = items.filter((c) => (c.lead?.status || "new") === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) =>
          (c.contact_name || "").toLowerCase().includes(q) ||
          c.phone_number.includes(q) ||
          `${c.patients?.first_name ?? ""} ${c.patients?.last_name ?? ""}`.toLowerCase().includes(q),
      );
    }
    return items;
  }, [calls, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Stats
  const total = calls.length;
  const connected = calls.filter((c) => c.status === "completed").length;
  const missed = calls.filter(
    (c) =>
      c.status === "failed" ||
      ["no_answer", "call_failed", "voicemail"].includes(c.outcome || ""),
  ).length;
  const bookedCount = calls.filter((c) => c.outcome === "booked").length;
  const pendingCount = calls.filter((c) => (c.lead?.status || "new") === "new").length;

  const displayName = (c: RegistrationCall) => {
    if (c.patients) return `${c.patients.first_name} ${c.patients.last_name}`;
    return c.contact_name || c.phone_number;
  };

  const callTime = (c: RegistrationCall) =>
    c.last_attempt_at ? new Date(c.last_attempt_at) : new Date(c.created_at);

  const formatAttemptLabel = (attemptCount: number, maxAttempts: number) => {
    if (!attemptCount || attemptCount <= 0) return null;
    const suffix =
      attemptCount === 1 ? "st" : attemptCount === 2 ? "nd" : attemptCount === 3 ? "rd" : "th";
    return `${attemptCount}${suffix} attempt of ${maxAttempts}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Registration Follow-up Calls</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Outbound calls placed to new patients after registration
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <PhoneOutgoing className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connected}</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <PhoneMissed className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{missed}</p>
                <p className="text-xs text-muted-foreground">Missed / Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <PhoneCall className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bookedCount}</p>
                <p className="text-xs text-muted-foreground">Appointments Booked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
            <SelectItem value="qualified">Registered</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Call List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading calls…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <PhoneOutgoing className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No registration calls found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Calls appear here automatically after a patient completes registration.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {paginated.map((call) => (
            <Card key={call.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Left: patient info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-full bg-primary/10 shrink-0">
                      <PhoneCall className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {call.patient_id ? (
                          <Link
                            to={`/patients/${call.patient_id}`}
                            className="font-medium hover:underline flex items-center gap-1 truncate"
                          >
                            {displayName(call)}
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                          </Link>
                        ) : (
                          <span className="font-medium flex items-center gap-1 truncate">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {displayName(call)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{call.phone_number}</p>
                    </div>
                  </div>

                  {/* Middle: badges + meta */}
                  <div className="hidden sm:flex items-center gap-2 flex-wrap">
                    <Badge
                      className={
                        LEAD_STATUS_CONFIG[call.lead?.status || "new"]?.color ??
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {LEAD_STATUS_CONFIG[call.lead?.status || "new"]?.label ??
                        (call.lead?.status || "New")}
                    </Badge>
                    {call.outcome && (
                      <Badge
                        className={
                          OUTCOME_COLORS[call.outcome] ?? "bg-muted text-muted-foreground"
                        }
                      >
                        {OUTCOME_LABELS[call.outcome] ?? call.outcome.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {call.attempt_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatAttemptLabel(call.attempt_count, call.max_attempts)}
                      </span>
                    )}
                  </div>

                  {/* Right: time + action */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden md:block text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(callTime(call), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(callTime(call), "MMM d, h:mm a")}
                      </p>
                      {call.lead?.last_contacted_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Last touched{" "}
                          {formatDistanceToNow(new Date(call.lead.last_contacted_at), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                    {call.outcome !== "booked" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => callAgain.mutate(call)}
                        disabled={callAgain.isPending}
                        className="gap-1.5"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call Again
                      </Button>
                    )}
                  </div>
                </div>

                {/* Notes (if any) */}
                {call.outcome_notes && (
                  <p className="text-xs text-muted-foreground mt-2 ml-11 truncate">
                    {call.outcome_notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span>
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filtered.length)}
                </span>{" "}
                of <span className="font-medium">{filtered.length}</span>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span>
                  Page <span className="font-medium">{currentPage}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
