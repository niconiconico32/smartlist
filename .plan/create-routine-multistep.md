# Plan: Multi-step CreateRoutineModal

## Context
The `CreateRoutineModal` currently shows all form sections (name, days, tasks, reminder, egg picker) on a single scrollable screen. This makes it overwhelming. We need to split it into 5 sequential steps with navigation, animations, and a step indicator — while keeping all existing logic untouched.

## Steps

### 1. Add i18n keys for step subtitles and "Next" button
Add new keys to all 6 locale files (`en`, `es`, `de`, `fr`, `it`, `pt`) under `routine_form`:
- `step_name_subtitle` — short description for step 1
- `step_days_subtitle` — short description for step 2
- `step_tasks_subtitle` — short description for step 3
- `step_reminder_subtitle` — short description for step 4
- `step_egg_subtitle` — short description for step 5
- `next` — "Next" button label

### 2. Rewrite `CreateRoutineModal.tsx` — Multi-step UI

**New state:** `currentStep` (0–4), `slideDirection` ("left" | "right") for animation direction.

**Steps mapping (each step = one screen):**

| Step | Content | Validation to proceed |
|------|---------|----------------------|
| 0 | Routine name input | `routineName.trim().length > 0` |
| 1 | Day selector | `selectedDays.length > 0` (always true) |
| 2 | Task list (DraggableFlatList) | At least 1 task with `title.trim() !== ""` |
| 3 | Reminder toggle + time picker | None (optional) |
| 4 | Egg/Pet picker | None (optional) |

**Header changes:**
- Step 0: Title ("New Routine") + close (X) button
- Steps 1–4: Back button (chevron-left.svg via existing `ChevronLeftIcon` component) + close (X) button

**Step indicator:** 5 dots centered below header, active dot = `colors.primary`, inactive = `colors.textSecondary + "40"`.

**Subtitle:** Below the dots, show step-specific title + subtitle using existing i18n keys (`name_label`, `which_days`, `routine_tasks`, `reminder_question`, `choose_companion`) + new subtitle keys.

**Bottom button:**
- Steps 0–3: "Next" button (disabled until step validation passes)
- Step 4: "Create Routine" button (existing `isValid` logic)

**Animation:** Use `react-native-reanimated` `FadeInRight`/`FadeInLeft` (already used extensively in the project) on the step content container, keyed by `currentStep`. Direction depends on whether user is going forward or backward.

**Content structure per step:**
- Step 0: `<TextInput>` (existing `styles.input`)
- Step 1: Days `<Pressable>` grid (existing `styles.daysContainer`)
- Step 2: `<DraggableFlatList>` with task items (existing `renderTaskItem`)
- Step 3: Reminder card + time picker (existing reminder UI)
- Step 4: Horizontal egg picker scroll (existing egg picker UI)

**Key behavior:**
- `handleClose` logic stays the same (unsaved changes check)
- `handleCreateRoutine` only fires on step 4's create button
- Reset logic on modal open stays the same
- All existing state, refs, effects stay unchanged
- Keyboard dismiss on step change

### 3. Files to modify
- `src/components/CreateRoutineModal.tsx` — main rewrite
- `locals/en.json` — add step i18n keys
- `locals/es.json` — add step i18n keys
- `locals/de.json` — add step i18n keys
- `locals/fr.json` — add step i18n keys
- `locals/it.json` — add step i18n keys
- `locals/pt.json` — add step i18n keys

### 4. Existing components reused (no new files)
- `ChevronLeftIcon` from `src/features/onboarding/components/ChevronLeftIcon.tsx`
- `AppText` (Text), `LinearGradient`, `DraggableFlatList`, `DateTimePicker`, lucide icons — all already imported
- All existing styles — reused as-is

## Verification
- Open the modal → should show only step 0 (name input)
- Type a name → Next button enables → tap → slide to step 1
- Select days → Next → slide to step 2
- Add a task with title → Next → slide to step 3
- Toggle reminder (optional) → Next → slide to step 4
- Select egg (optional) → Create → routine created
- Back button on steps 1–4 returns to previous step with reverse animation
- Close (X) still triggers discard alert if changes made
- No logic changes — only UI/UX flow
