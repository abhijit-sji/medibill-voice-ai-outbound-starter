# UI Layout — Voice AI Outbound Module

This document describes the layout, routing, responsive behaviour, and key components for the voice-ai-outbound module's user interface.

---

## Routes

| Route                        | Page Component                          | Auth Required | Layout          | Description                                        |
|-----------------------------|----------------------------------------|---------------|-----------------|-----------------------------------------------------|
| `/admin/conversational-agent`| `src/pages/ConversationalAgent.tsx`    | yes           | `<AdminLayout>` | Primary outbound agent management hub              |
| `/admin/elevenlabs`          | `src/pages/ElevenLabsConfiguration.tsx`| yes           | `<AdminLayout>` | ElevenLabs API key and global settings             |
| `/admin/outbound-agent`      | `src/pages/OutboundAgent.tsx`          | yes           | `<AdminLayout>` | Outbound call queue processor / run monitor        |
| `/outbound-calls`            | `src/pages/OutboundCalls.tsx`          | yes           | `<Layout>`      | Manual call launcher and call queue view           |

All admin routes require authentication via `AuthContext`. Access is controlled by `canAccessPage()` — users without the `admin` role are redirected.

---

## Primary Page: `/admin/conversational-agent`

**Component:** `src/pages/ConversationalAgent.tsx`

The page is a two-panel layout: a collapsible **Agent List Sidebar** on the left and a **tabbed detail panel** on the right.

### Page Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Admin Layout — top nav + side nav]                                 │
├───────────────────┬──────────────────────────────────────────────────┤
│                   │  Stats Bar (4 KPI cards)                         │
│  Agent List       │  ─────────────────────────────────────────────── │
│  Sidebar          │  Tab Bar: Configuration │ Testing │ Call History │
│                   │           Live Monitoring                        │
│  ● Agent A        │                                                  │
│  ● Agent B        │  [Tab Content Area]                              │
│  + New Agent      │                                                  │
│                   │                                                  │
└───────────────────┴──────────────────────────────────────────────────┘
```

### Stats Bar (top of detail panel)

Four KPI cards displayed in a responsive grid (`grid-cols-2 lg:grid-cols-4`):

| Metric              | Source                                        |
|--------------------|-----------------------------------------------|
| Total Calls         | `COUNT(*)` from `call_logs` for this clinic   |
| Successful Bookings | `COUNT(*) WHERE appointment_booked = true`    |
| Avg Duration        | `AVG(duration)` formatted as `M:SS`           |
| Conversion Rate     | `(bookings / total_calls) * 100`              |

---

## Tab: Agent Configuration

**Component:** `src/components/conversational-agent/AgentConfigurationTab.tsx`

Displays and edits the configuration for the selected agent from `ai_agent_configurations`.

### Fields

| Field              | Input Type   | Maps To                                        |
|-------------------|--------------|------------------------------------------------|
| Agent Name         | Text input   | `ai_agent_configurations.agent_name`           |
| Voice              | Select       | `ai_agent_configurations.elevenlabs_voice_id`  |
| ElevenLabs Model   | Select       | `ai_agent_configurations.elevenlabs_model`     |
| First Message      | Textarea     | `ai_agent_configurations.first_message`        |
| System Prompt      | Textarea     | `ai_agent_configurations.system_prompt`        |
| Stability          | Slider (0–1) | `ai_agent_configurations.elevenlabs_stability` |
| Similarity Boost   | Slider (0–1) | `ai_agent_configurations.elevenlabs_similarity_boost` |
| Style              | Slider (0–1) | `ai_agent_configurations.elevenlabs_style`     |
| Language           | Select       | `ai_agent_configurations.language`             |
| Use ElevenLabs     | Toggle       | `ai_agent_configurations.use_elevenlabs`       |

### Actions

- **Save to DB**: Updates `ai_agent_configurations` via Supabase client.
- **Sync to ElevenLabs**: Calls `sync-elevenlabs-agent` to push changes to the ElevenLabs API.
- **Fetch from ElevenLabs**: Calls `get-elevenlabs-agent` to pull the live remote config.

---

## Tab: Agent Testing

**Component:** `src/components/conversational-agent/AgentTestingTab.tsx`

Provides a live, in-browser test conversation with the selected ElevenLabs agent using the ElevenLabs browser SDK and a signed conversation token.

### Flow

1. User clicks **Start Conversation**.
2. Frontend calls `elevenlabs-conversation-token` with the agent ID.
3. SDK uses the returned token to open a WebSocket to ElevenLabs.
4. Audio from the user's microphone is streamed to ElevenLabs; AI audio is played back.
5. Transcript appears in real time below the audio controls.

### UI Elements

- Microphone permission prompt
- Start / Stop conversation button
- Real-time transcript panel (scrollable, auto-scrolls to bottom)
- Status indicator: `Connecting...`, `Active`, `Ended`

---

## Tab: Call History

**Component:** `src/components/conversational-agent/CallAuditTab.tsx`

Displays a filterable, paginated table of past calls from `call_logs` where `ai_provider = 'elevenlabs'`.

### Columns

| Column          | Source                            |
|----------------|-----------------------------------|
| Date/Time       | `call_logs.started_at`            |
| Patient         | `patients.first_name last_name`   |
| Duration        | `call_logs.duration` (formatted)  |
| Outcome         | `call_logs.outcome` (badge)       |
| Status          | `call_logs.status` (badge)        |
| Booked          | `call_logs.appointment_booked`    |
| Cost            | `cost_logs.amount`                |
| Actions         | View transcript / Play recording  |

### Filters

- Date range picker
- Outcome filter (booked, no-booking, failed, abandoned)
- Patient name search

---

## Tab: Live Monitoring

**Component:** `src/components/conversational-agent/LiveMonitoringTab.tsx`

Shows real-time conversation activity for calls currently in progress. Uses a Supabase Realtime subscription to `agent_activity_logs` and `call_logs`.

### UI Elements

- Active calls list (auto-refreshes via `useRealtimeCalls`)
- Per-call workflow status tracker:
  ```
  [✓] Patient Validated  [✓] Insurance Checked  [●] Appointment Booking  [ ] Complete
  ```
- Live transcript feed (streaming from `log_transcript` tool calls)
- Call metadata: patient name, phone, duration counter, agent ID

---

## Responsive Breakpoints

The module uses Tailwind CSS breakpoints:

| Breakpoint | Behaviour                                                             |
|-----------|-----------------------------------------------------------------------|
| `< md`    | Sidebar hidden; agent list accessed via drawer / hamburger menu       |
| `md`      | Sidebar visible at 240px width; detail panel takes remaining space    |
| `lg`      | Stats bar switches from 2-column to 4-column grid                     |
| `xl`      | Tab content has increased max-width for readability                   |

---

## Supporting Pages

### `/admin/elevenlabs` — ElevenLabs Configuration

**Component:** `src/pages/ElevenLabsConfiguration.tsx`

Single-panel settings page with:
- API Key input (masked, with Show/Hide toggle)
- Test Connection button (calls `get-elevenlabs-agent` to verify key)
- Save button (writes to `integration_settings`)

### `/admin/outbound-agent` — Outbound Agent Monitor

**Component:** `src/pages/OutboundAgent.tsx`

Displays `agent_run_logs` in a table showing each automated run's processed/succeeded/failed counts. Includes a manual **Run Now** button to trigger `outbound-call-agent` immediately.

### `/outbound-calls` — Manual Call Launcher

**Component:** `src/pages/OutboundCalls.tsx`

Search for a patient by name or phone, select them, and click **Call Now** to immediately trigger `start-outbound-appointment-call`. Also displays the current `outbound_call_queue` with status badges.

---

## Key Components Summary

| Component                         | Location                                                              |
|----------------------------------|-----------------------------------------------------------------------|
| `ConversationalAgent` (page)      | `src/pages/ConversationalAgent.tsx`                                   |
| `AgentListSidebar`                | `src/components/conversational-agent/AgentListSidebar.tsx`            |
| `AgentConfigurationTab`           | `src/components/conversational-agent/AgentConfigurationTab.tsx`       |
| `OutboundAgentConfigTab`          | `src/components/conversational-agent/OutboundAgentConfigTab.tsx`      |
| `AgentTestingTab`                 | `src/components/conversational-agent/AgentTestingTab.tsx`             |
| `CallAuditTab`                    | `src/components/conversational-agent/CallAuditTab.tsx`                |
| `LiveMonitoringTab`               | `src/components/conversational-agent/LiveMonitoringTab.tsx`           |
| `CreateAgentDialog`               | `src/components/conversational-agent/CreateAgentDialog.tsx`           |
| `ElevenLabsConfiguration` (page)  | `src/pages/ElevenLabsConfiguration.tsx`                               |
| `OutboundCalls` (page)            | `src/pages/OutboundCalls.tsx`                                         |
| `OutboundAgent` (page)            | `src/pages/OutboundAgent.tsx`                                         |
