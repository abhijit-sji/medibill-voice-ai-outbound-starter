import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_CLINIC_ID = "00000000-0000-0000-0000-000000000001";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (agentId: string) => void;
  fixedAgentType?: "inbound" | "outbound";
}

export function CreateAgentDialog({ open, onOpenChange, onCreated, fixedAgentType }: CreateAgentDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [agentType, setAgentType] = useState<"inbound" | "outbound">(fixedAgentType || "inbound");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter an agent name.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const defaultPrompt = agentType === "inbound"
        ? `You are ${name}, an AI scheduling assistant for our medical clinic. First, ask whether the caller is an existing patient or a new patient.`
        : `You are ${name}, a friendly outreach assistant for our medical clinic. You are calling the patient on behalf of the clinic after they completed their online registration.`;

      const defaultFirstMessage = agentType === "inbound"
        ? `Hello! This is ${name} from the clinic. Are you an existing patient with us, or is this your first time calling?`
        : `Hi, this is ${name} from the clinic. You recently completed your registration with us—thank you. We're calling to see if you'd like to book your first appointment now.`;

      const { data, error } = await (supabase
        .from("ai_agent_configurations")
        .insert({
          clinic_id: DEFAULT_CLINIC_ID,
          agent_name: name.trim(),
          agent_type: agentType,
          is_active: true,
          use_elevenlabs: true,
          first_message: defaultFirstMessage,
          system_prompt: defaultPrompt,
          model: "gpt-4-turbo-preview",
          voice: "Polly.Joanna",
          elevenlabs_llm_model: "gpt-4o",
        } as any)
        .select("id")
        .single());

      if (error) throw error;

      toast({ title: "Agent Created", description: `${name} (${agentType}) has been created.` });
      onCreated(data.id);
      setName("");
      setAgentType("inbound");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to create agent:", err);
      toast({ title: "Error", description: err.message || "Failed to create agent.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New {fixedAgentType ? (fixedAgentType === "inbound" ? "Inbound" : "Outbound") : ""} Agent</DialogTitle>
          <DialogDescription>
            {fixedAgentType
              ? `Set up a new ${fixedAgentType} voice agent.`
              : "Set up a new inbound or outbound voice agent."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="agentName">Agent Name</Label>
            <Input
              id="agentName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah, Alex"
            />
          </div>
          {!fixedAgentType && (
            <div className="space-y-2">
              <Label htmlFor="agentType">Agent Type</Label>
              <Select value={agentType} onValueChange={(v) => setAgentType(v as "inbound" | "outbound")}>
                <SelectTrigger id="agentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbound">Inbound — answers incoming calls</SelectItem>
                  <SelectItem value="outbound">Outbound — places calls to patients</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
