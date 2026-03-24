# Voice AI Outbound — API Reference

Supabase Edge Functions for outbound AI voice calls using ElevenLabs Conversational AI.

## Base URL

```
https://qdnpztafkuprifwwqcgj.supabase.co/functions/v1
```

---

## `POST /outbound-call-agent`

Initiates an outbound AI voice call to a patient via Twilio + ElevenLabs.

**Auth:** Bearer JWT required

**Request Body:**
```json
{
  "patient_id": "uuid",
  "appointment_id": "uuid",
  "clinic_id": "uuid",
  "purpose": "reminder" | "recall" | "follow-up"
}
```

**Response `200`:**
```json
{
  "success": true,
  "call_sid": "CA...",
  "call_log_id": "uuid"
}
```

---

## `POST /start-outbound-appointment-call`

Convenience wrapper to start an outbound appointment reminder call from the dashboard.

**Auth:** Bearer JWT required

**Request Body:**
```json
{
  "appointment_id": "uuid"
}
```

**Response `200`:**
```json
{ "success": true, "call_sid": "CA..." }
```

---

## `POST /elevenlabs-call-handler`

Twilio webhook for ElevenLabs-powered call legs. Connects Twilio to ElevenLabs Conversational AI agent.

**Auth:** `verify_jwt = false`

---

## `GET /elevenlabs-conversation-token`

Generates a short-lived token for a browser-based ElevenLabs Conversational AI session.

**Auth:** Bearer JWT required

**Response `200`:**
```json
{ "token": "...", "expires_at": "ISO8601" }
```

---

## `POST /elevenlabs-webhook`

Receives ElevenLabs conversation lifecycle events (started, ended, transcript).

**Auth:** `verify_jwt = false`

---

## `GET /get-elevenlabs-conversation`

Fetches metadata for a specific ElevenLabs conversation.

**Auth:** Bearer JWT required

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `conversation_id` | Yes | ElevenLabs conversation ID |

---

## `GET /get-elevenlabs-conversation-transcript`

Fetches the full transcript for a conversation.

**Auth:** Bearer JWT required

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `conversation_id` | Yes | ElevenLabs conversation ID |

---

## `GET /get-elevenlabs-conversation-audio`

Returns a signed URL to the conversation audio recording.

**Auth:** Bearer JWT required

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Missing required fields |
| `401` | Invalid or missing JWT |
| `404` | Conversation not found |
| `500` | Internal error |
