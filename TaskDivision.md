# Task Division System

## Overview

When a user creates a task in Smartlist, the app uses OpenAI's GPT-4o-mini to break it down into actionable subtasks with estimated durations. This happens via a Supabase Edge Function (`divide-task`).

## Complete Flow

```
User taps "+" FAB button
    ↓
TaskModalNew (full-screen modal with text input / voice)
    ↓
User types or speaks task → press submit
    ↓
generateSubtasks()   ← index.tsx:601
    ↓
supabase.functions.invoke("divide-task", { task, locale })
    ↓
divide-task Edge Function   ← supabase/functions/divide-task/index.ts
    ├─ Validate auth (JWT)
    ├─ Blocked content check (safety patterns)
    ├─ Call OpenAI GPT-4o-mini
    └─ Return { title, emoji, tasks[] }
    ↓
Client transforms subtasks → sets state → opens SubtaskListScreen
    ↓
User reviews → "Add to list" or "Start"
    ↓
addTaskToList()   ← index.tsx:682
    └─ setActivities() → useEffect → saveActivities() → syncActivitiesToCloud()
```

## Files Involved

| File | Role |
|------|------|
| `app/(tabs)/index.tsx` | Orchestrates task creation: `generateSubtasks()`, `addTaskToList()`, `saveActivities()` |
| `src/components/TaskModalNew.tsx` | Full-screen modal with text input, suggestion carousel, microphone button |
| `src/components/SubtaskListScreen.tsx` | Displays AI-generated subtasks for review & editing |
| `supabase/functions/divide-task/index.ts` | Supabase Edge Function that calls OpenAI |
| `src/lib/supabase.ts` | Supabase client (`supabase.functions.invoke`) |
| `src/lib/syncService.ts` | Persists activities to `user_state` table in Supabase |

## Edge Function: `divide-task`

**Location:** `supabase/functions/divide-task/index.ts`

### Request

```json
{
  "task": "string (max 500 chars)",
  "locale": "es | en"
}
```

The JWT is automatically injected by `supabase.functions.invoke()`.

### Steps

1. **CORS** — Handles OPTIONS preflight.
2. **Auth validation** — Requires `Authorization: Bearer <jwt>` header. Returns 401 if missing.
3. **Input validation** — Task must be non-empty, max 500 characters.
4. **Content filtering** — Checks against `BLOCKED_PATTERNS` (weapons, violence, drugs, self-harm, crime, prompt injection). Returns 422 if matched.
5. **Language detection** — `locale` determines response language. Spanish → response in Spanish, anything else → English.
6. **OpenAI API call** — Sends system prompt + user prompt to `gpt-4o-mini`.
7. **Response parsing** — Strips markdown fences, parses JSON, validates structure.
8. **Fallbacks** — Missing title → uses original task. Missing emoji → "✨". Missing duration → 5 min.

### OpenAI Configuration

| Parameter | Value |
|-----------|-------|
| Model | `gpt-4o-mini` |
| Temperature | `0.3` |
| Max tokens | `1000` |
| Response format | `json_object` |

### System Prompt Rules

1. Capture ALL details (numbers, specifications, requirements)
2. Convert each detail into a specific subtask
3. Keep numbers and specs in subtask titles
4. Estimate realistic duration in minutes
5. Generate 3–10 subtasks based on complexity
6. Summarize main title to max 50 characters
7. Select ONE emoji for the whole task
8. Respond in detected language
9. Safety policy: reject illegal/harmful content
10. Prompt injection protection

### Response Format

```json
{
  "title": "Short title (≤50 chars)",
  "emoji": "🎯",
  "tasks": [
    { "title": "Specific subtask with details", "duration": 10 }
  ]
}
```

### Error Responses

| Condition | Status | Response |
|-----------|--------|----------|
| No auth header | 401 | `{ error: "Unauthorized: Missing authorization header" }` |
| Task too long (>500) | 400 | `{ error: "Task too long (max 500 characters)", title: "", tasks: [] }` |
| Blocked content | 422 | `{ error: "Task rejected: contains prohibited content", title: "", tasks: [] }` |
| Missing OPENAI_API_KEY | 500 | `{ error: "Missing OPENAI_API_KEY environment variable" }` |
| OpenAI API error | 500 | `{ error: "OpenAI error: ..." }` |
| Invalid JSON from AI | 500 | `{ error: "La IA no devolvió JSON válido" }` |
| Invalid response structure | 500 | `{ error: "Formato de respuesta inválido" }` |
| Generic error | 500 | `{ error: "<message>", title: "Error al dividir tarea", tasks: [] }` |

## Client-Side: `generateSubtasks()` (index.tsx:601)

### Steps

1. Validates input is non-empty
2. Sets loading state (`setIsGenerating(true)`)
3. Detects device locale via `expo-localization`
4. Calls `supabase.functions.invoke("divide-task", { task, locale })`
5. Validates response: no error, data exists, `data.tasks` is non-empty array
6. Truncates title to 50 chars if needed
7. Transforms subtasks: adds `id` (`timestamp-index`), `isCompleted: false`
8. Closes task modal, opens subtask modal (with 300ms delay)
9. On error: shows alert "No se pudieron generar las subtareas. Intenta de nuevo."

## Blocked Content Patterns

Regex patterns checked against task input:

```
bomb, explosive, grenade, dynamite, napalm
poison, cyanide, anthrax, ricin, sarin, nerve agent
kill, murder, assassinate, shoot, stab
rape, molest, abuse, torture, kidnap, traffick
drugs, cocaine, heroin, methamphetamine, fentanyl, meth, crack
hack, exploit, phish, malware, ransomware, ddos, sql injection, xss
suicide, self harm, cut myself, overdose, hang myself
weapon, gun, rifle, pistol, ammunition, ammo, suppressor, silencer
illegal, commit crime, launder money, fraud, scam, steal, bribe, extort
"ignore previous/above/all instructions"
"act as unrestricted/dan/jailbreak/evil/malicious"
```

## Voice Task Division

Voice uses a separate path:

```
User holds mic → records audio → useVoiceTask hook
    ↓
supabase.functions.invoke("transcribe-task", { audio })
    ↓
Edge Function calls Whisper (Spanish) → GPT → { originalText, task: { title, duration } }
    ↓
Text fed back into TaskModalNew input → user submits → goes through generateSubtasks()
```

## Security

- **JWT verification**: Edge Function expects a valid Supabase auth token in the `Authorization` header.
- **Content filtering**: Both client (blocked patterns) and server-side safety prompt prevent misuse.
- **Prompt injection protection**: System prompt explicitly forbids following embedded instructions.
- **No database access**: The `divide-task` function never connects to the database — it only calls OpenAI.

## Environment Variables

| Variable | Used In | Required |
|----------|---------|----------|
| `OPENAI_API_KEY` | Edge Function (set in Supabase Dashboard) | Yes |
| `EXPO_PUBLIC_SUPABASE_URL` | Client (`supabase.ts`) | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client (`supabase.ts`) | Yes |

## Data Flow Summary

```
User Input (text/voice)
    → TaskModalNew.onSubmit(text)
    → index.tsx generateSubtasks()
    → supabase.functions.invoke("divide-task")
    → Edge Function: validate → filter → OpenAI GPT-4o-mini
    → JSON { title, emoji, tasks[] }
    → Client: transform → setState
    → SubtaskListScreen: review/edit
    → addTaskToList(): create Activity object → setActivities
    → useEffect → saveActivities()
    → syncService.syncActivitiesToCloud(): AsyncStorage + Supabase user_state.upsert()
```
