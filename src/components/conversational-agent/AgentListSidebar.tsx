import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, PhoneIncoming, PhoneOutgoing, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateAgentDialog } from "./CreateAgentDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const DEFAULT_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

export interface AgentListItem {
  id: string;
  agent_name: string;
  agent_type: string;
  elevenlabs_agent_id: string | null;
  is_active: boolean;
}

interface AgentListSidebarProps {
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  agents: AgentListItem[];
  loading: boolean;
  onRefresh: () => void;
  agentType?: "inbound" | "outbound";
}

export function AgentListSidebar({
  selectedAgentId,
  onSelectAgent,
  agents,
  loading,
  onRefresh,
  agentType,
}: AgentListSidebarProps) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreated = (newId: string) => {
    onRefresh();
    onSelectAgent(newId);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await (supabase
        .from("ai_agent_configurations")
        .delete()
        .eq("id", deleteTarget.id) as any);
      if (error) throw error;
      toast({ title: "Deleted", description: `${deleteTarget.agent_name} has been removed.` });
      if (selectedAgentId === deleteTarget.id) {
        const remaining = agents.filter((a) => a.id !== deleteTarget.id);
        if (remaining.length > 0) onSelectAgent(remaining[0].id);
      }
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete agent.", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="w-64 shrink-0 border-r bg-muted/20 flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={() => setCreateOpen(true)} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Agent
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No agents yet. Create one to get started.
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={cn(
                  "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
                  selectedAgentId === agent.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                )}
                onClick={() => onSelectAgent(agent.id)}
              >
                <div className="shrink-0">
                  {agent.agent_type === "outbound" ? (
                    <PhoneOutgoing className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{agent.agent_name}</span>
                    {agent.elevenlabs_agent_id && (
                      <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" title="Deployed" />
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">
                    {agent.agent_type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(agent);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <CreateAgentDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleCreated} fixedAgentType={agentType} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.agent_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the agent configuration. The ElevenLabs agent (if deployed) will not be deleted from ElevenLabs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
