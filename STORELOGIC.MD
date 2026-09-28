# Store Logic Reference

> Reference guide for all Zustand stores, persistence layers, and how data flows through the app.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    UI Components                     │
│  (atomic selectors: useStore((s) => s.field))       │
├─────────────────────────────────────────────────────┤
│                   Zustand Stores                     │
│  achievementsStore · appStreakStore · proStore       │
│  eggStore · routinesStore (tasksSlice)               │
├─────────────────────────────────────────────────────┤
│              Persistence Layer                        │
│  AsyncStorage (primary)  ←→  Supabase (cloud)        │
│  Debounced cloud sync (3s) for achievements          │
│  Immediate local writes everywhere else              │
├─────────────────────────────────────────────────────┤
│                Background Sync                        │
│  syncService.ts — debounced activities upload (3s)   │
│  Widget sync (Android) — direct AsyncStorage writes   │
└─────────────────────────────────────────────────────┘
```

---

## 1. `achievementsStore` — Central game state

**File:** `src/store/achievementsStore.ts` (~1163 lines)

### State fields

| Field | Type | Description |
|---|---|---|
| `achievements` | `Record<AchievementId, AchievementProgress>` | 21 achievements with progress/completed/completedAt |
| `totalCoins` | `number` | Player's crown balance |
| `routineStreak` | `number` | Consecutive days with completed routines |
| `lastRoutineCompletedDate` | `string \| null` | Last day a routine was completed (YYYY-MM-DD) |
| `distinctWeeks` | `string[]` | ISO week keys the app was used (for weekly_4 achievement) |
| `purchasedOutfits` | `string[]` | IDs of bought outfits |
| `purchasedBackgrounds` | `string[]` | IDs of bought backgrounds |
| `activeBackground` | `string \| null` | Currently equipped background ID |
| `activeBackgroundUri` | `string \| null` | Supabase Storage URL for the active background |
| `activeOutfit` | `string \| null` | Currently equipped outfit ID |
| `activeOutfitUri` | `string \| null` | Supabase Storage URL for the active outfit |
| `rewardedRoutines` | `Record<string, string>` | Map of routineId → date last rewarded (prevents double-award) |
| `rewardedTasks` | `Record<string, string>` | Map of `task_X`/`subtask_X` → date last rewarded |
| `todaysRewardedTaskIds` | `string[]` | Task IDs rewarded today (for daily cap of 10) |
| `dailyTasksCompletedCount` | `number` | Tasks rewarded today |
| `dailyRoutinesCompletedCount` | `number` | Routines rewarded today |
| `lastRewardDate` | `string \| null` | Date of last task reward (triggers daily reset) |
| `_loaded` | `boolean` | True after first hydration — gates persistence |
| `isRoutineModalOpen` | `boolean` | UI flag for routine modal |

### Hydration (`loadAchievements`)

This is the most critical function. Called once from `swipeable-layout.tsx` via `useFocusEffect`.

```
loadAchievements() flow:
│
├─ Guard: if (_loaded) return  — no-op after first call
├─ Guard: if (loadPromise) return loadPromise  — prevents parallel runs
│
├─ Capture preLoadState = get()  — snapshot before async work
│
├─ Read localData from AsyncStorage (@smartlist_achievements)
│   ├─ If corrupted → try backup (@smartlist_achievements_backup)
│   ├─ If empty → try backup, restore to primary
│   └─ If still null → localData = null
│
├─ Read cloudData from Supabase (user_achievements table)
│   └─ If not logged in or error → cloudData = null
│
├─ mergeSnapshots(localData, cloudData)
│   ├─ Pick primary by updatedAt timestamp (newer wins)
│   ├─ Union purchasedOutfits and purchasedBackgrounds
│   ├─ Merge achievement maps (max progress, OR completed)
│   ├─ pickOwnedActive() for background/outfit (validates against purchased list)
│   └─ Merge URIs (primary || secondary || null)
│
├─ Persist merged result to AsyncStorage (primary + backup)
├─ Upsert to Supabase if different from cloud
│
├─ Race condition fix:
│   ├─ Compare current.activeBackground vs preLoadState.activeBackground
│   ├─ Compare current.activeOutfit vs preLoadState.activeOutfit
│   ├─ If user changed equip during hydration → keep user's in-memory value
│   └─ If user changed equip → call persist() to save their choice
│
└─ set({ _loaded: true, ...mergedState })
```

**Key rule:** `persist()` is a no-op while `_loaded` is false. This prevents default state from overwriting saved data before hydration completes.

### Persistence (`persist`)

- Serializes the full snapshot via `buildSnapshot()`
- Writes to AsyncStorage with a serialized queue (prevents concurrent overwrites)
- Writes to backup key after primary succeeds
- Schedules `scheduleCloudSync()` — debounced 3-second Supabase upsert
- Cloud sync skips if `_loaded` is false

### Cloud Sync (`scheduleCloudSync`)

- 3-second debounce — rapid local writes are batched into a single upsert
- Reads session to confirm logged in
- Builds snapshot and upserts to `user_achievements` table
- Non-blocking (fire-and-forget)

### Achievement Definitions

21 achievements ordered easiest → hardest:

| ID | Title | Total | Coins |
|---|---|---|---|
| `app_opened` | Abre la app por primera vez | 1 | 200 |
| `first_task` | Crea tu primera tarea | 1 | 50 |
| `two_routines` | Crea 2 rutinas | 2 | 75 |
| `first_routine` | Completa rutina al 100% | 1 | 150 |
| `streak_3` | Racha de 3 días | 3 | 100 |
| `edit_routine` | Cambia ícono o nombre | 1 | 50 |
| `first_reminder` | Activa primer recordatorio | 1 | 50 |
| `tasks_3` | Completa 3 tareas | 3 | 75 |
| `routine_streak_4` | Racha rutina de 4 días | 4 | 100 |
| `three_routines` | 3 rutinas activas | 3 | 100 |
| `first_outfit` | Compra primer outfit | 1 | 75 |
| `edit_old_routine` | Edita rutina >5 días | 1 | 100 |
| `streak_7` | Racha de 7 días | 7 | 150 |
| `routine_streak_9` | Racha rutina de 9 días | 9 | 150 |
| `tasks_12` | Completa 12 tareas | 12 | 150 |
| `first_skin` | Compra primer fondo | 1 | 100 |
| `streak_14` | Racha de 14 días | 14 | 200 |
| `tasks_25` | Completa 25 tareas | 25 | 200 |
| `three_skins` | Compra 3 fondos | 3 | 200 |
| `streak_21` | Racha de 21 días | 21 | 250 |
| `weekly_4` | Usa app en 4 semanas | 4 | 200 |
| `streak_30` | Racha de 30 días | 30 | 300 |

### Streak multiplier

When an achievement is completed, coins are multiplied by `useAppStreakStore.getState().getMultiplier()`. Formula: `1 + (streak * 0.15)` — Pro only.

### Achievement triggers

| Trigger | Called from | Achievements updated |
|---|---|---|
| `initializeAppOpened()` | App launch | `app_opened` |
| `checkAndUpdateAchievements(activities, streak)` | After loading activities | `first_task`, `tasks_3/12/25`, `streak_3/7/14/21/30` |
| `onRoutineCompleted()` | After marking routine done | `first_routine`, `routine_streak_4/9` + routine streak counter |
| `onRoutinesCountChanged(count)` | After creating/deleting routine | `two_routines`, `three_routines` |
| `onStreakChanged(streak)` | When task streak changes | `streak_3/7/14/21/30` |
| `onRoutineEdited(createdAt, nameChanged, iconChanged)` | After editing routine | `edit_routine`, `edit_old_routine` |
| `onReminderActivated()` | After enabling reminder | `first_reminder` |
| `trackWeeklyUsage()` | On app focus | `weekly_4` |
| `onPurchaseMade(type, itemId)` | After shop purchase | `first_outfit`, `first_skin`, `three_skins` |

### Coin actions

| Action | Description |
|---|---|
| `spendCoins(amount, purchase?)` | Deduct coins. If `purchase` provided, atomically adds item to purchased list. Returns false if insufficient. |
| `addCoins(amount)` | Add coins (pet rewards, bonuses). Persists + syncs. |
| `awardTaskCompletionCoins(taskId, difficulty, subtaskId?)` | Random 15-20 crowns per task, multiplied by streak bonus. Daily cap of 10 tasks. Uses `rewardedTasks` map to prevent re-awarding. |
| `redeemPromoCode(code)` | Server-side validation via `supabase.rpc('redeem_promo_code')`. Returns coins awarded or error. |

### Shop actions

| Action | Description |
|---|---|
| `setActiveBackground(id, uri?)` | Sets active background + URI, persists |
| `setActiveOutfit(id, uri?)` | Sets active outfit + URI, persists |

**Important:** Always pass the `uri` parameter when equipping. The FocusHeroCard uses URI as primary source (same pattern as backgrounds in swipeable-layout). If URI is missing, the outfit falls back to local `require()` which may not render on first equip.

### Snapshot type (`AchievementsSnapshot`)

All fields are optional — used for serialization/deserialization. The `mergeSnapshots` function handles merging local and cloud data with timestamp-based conflict resolution.

---

## 2. `appStreakStore` — App open streak

**File:** `src/store/appStreakStore.ts` (265 lines)

Tracks consecutive days the user opens the app. **Separate** from the routine completion streak.

### State

| Field | Type | Description |
|---|---|---|
| `streak` | `number` | Current consecutive days |
| `lastOpenDate` | `string \| null` | Last recorded open (YYYY-MM-DD) |
| `history` | `string[]` | Last 7 open dates |
| `shouldShowStreakScreen` | `boolean` | Whether to show streak celebration screen |
| `shieldUsedToday` | `boolean` | True if a shield protected the streak today |
| `maxStreak` | `number` | Highest streak ever achieved |
| `shieldDates` | `string[]` | Dates where shields were used |

### Persistence

Key: `@smartlist_app_streak` in AsyncStorage.

### `initializeAppStreak()` flow

```
├─ Load from AsyncStorage
├─ If opened today already → update state, cancel warning notification, return
├─ If first open today:
│   ├─ If lastOpenDate is yesterday → streak++
│   ├─ If gap detected:
│   │   ├─ If Pro + shields available → activate shield offer (keep streak suspended)
│   │   └─ Otherwise → streak lost
│   ├─ Update history (last 7 days)
│   └─ Track maxStreak
├─ Persist to AsyncStorage
├─ Set shouldShowStreakScreen = true (if streak > 1)
└─ Schedule streak warning notification for tomorrow
```

### Shield system (Pro feature)

- Pro users get 2 shields per week (refill on Mondays)
- When a gap is detected and shields > 0: `activateShieldOffer()` is called
- User can accept (consume shield, streak continues) or decline (streak resets to 1)
- `markShieldUsed()` persists the shield usage to AsyncStorage

### Coin multiplier

`getMultiplier()` — Pro only: `1 + (streak * 0.15)`
- 1 day → 1.15x
- 7 days → 2.05x
- Non-Pro users always get 1x

---

## 3. `proStore` — Subscription state

**File:** `src/store/proStore.ts` (203 lines)

### State

| Field | Type | Description |
|---|---|---|
| `isPro` | `boolean` | Whether user has Pro subscription |
| `streakShieldCount` | `number` | Shields available (0-2) |
| `lastShieldRefillDate` | `string \| null` | Last Monday refill date |
| `pendingShieldOffer` | `boolean` | Whether to show shield offer UI |
| `isLoaded` | `boolean` | True after hydration |

### Persistence

Key: `@smartlist_pro_store` in AsyncStorage. Only `isPro`, `streakShieldCount`, `lastShieldRefillDate`, and `pendingShieldOffer` are persisted.

### Shield refill

`rechargeShieldsIfNeeded()` — called on app focus. If today is Monday and we haven't refilled this week, reset shields to 2.

### Actions

- `activatePermanentPro()` — sets `isPro = true`
- `cancelPermanentPro()` — sets `isPro = false`
- `consumeShield()` — decrements `streakShieldCount`, clears `pendingShieldOffer`
- `activateShieldOffer()` — sets `pendingShieldOffer = true`

---

## 4. `eggStore` — Pet/egg system

**File:** `src/store/eggStore.ts` (327 lines)

Uses Zustand's `persist` middleware with AsyncStorage.

### Key concepts

- 18 eggs in catalog: 8 common (free), 6 rare (1500-5000 crowns), 4 legendary (5000 crowns)
- Each egg has an XP system (max 3 XP to evolve)
- XP is earned by completing tasks (1 XP per task, with streak multiplier)
- When an egg reaches max XP, it evolves into a pet
- Eggs can be hatched (bought) and equipped

### XP earning

`incrementXp()` — checks if the egg has reached max XP. If so, evolves the egg into a pet. Uses `useProStore` for streak multiplier.

---

## 5. `syncService` — Activities cloud sync

**File:** `src/lib/syncService.ts` (136 lines)

### `syncActivitiesToCloud(activities)`

- Immediate AsyncStorage write (snappy UI)
- Background Supabase upsert to `user_state` table

### `debouncedSyncToCloud(activities)`

- AsyncStorage: immediate write
- Supabase: 3-second debounce (batches rapid state changes)
- Used by task completion, routine tracking, etc.

### `fetchActivitiesFromCloud()`

- If logged in: fetch from Supabase, save locally
- If not logged in: return local AsyncStorage data
- If cloud empty but local exists: push local to cloud

---

## 6. How equip (background/outfit) rendering works

This is the data flow for equipping and displaying cosmetics.

### Equipping from shop (`achievements.tsx`)

```
handleApply(item)
├─ item.type === "background"
│   ├─ Toggle: if already active → setActiveBackground(null, null)
│   └─ Otherwise → setActiveBackground(item.id, item.imageUri)
├─ item.type === "outfit"
│   ├─ Toggle: if already active → setActiveOutfit(null, null)
│   └─ Otherwise → setActiveOutfit(item.id, item.imageUri)
└─ Android widget sync (AsyncStorage writes)
```

**Always pass `item.imageUri`** — the Supabase Storage URL. This is used as the primary image source.

### Rendering in `FocusHeroCard` (outfit)

```tsx
const outfitSource =
  activeOutfit && activeOutfitUri
    ? { uri: activeOutfitUri }           // 1. Remote URI (primary)
    : activeOutfit && OUTFIT_IMAGES[activeOutfit]
      ? OUTFIT_IMAGES[activeOutfit]     // 2. Local require() (fallback)
      : require(".../logomain.png");    // 3. Default mascot

<Image key={activeOutfit} source={outfitSource} ... />
```

### Rendering in `swipeable-layout.tsx` (background)

```tsx
const bgSource =
  activeBackground && BG_IMAGES[activeBackground]
    ? BG_IMAGES[activeBackground]           // 1. Local require() map
    : activeBackground && activeBackgroundUri
      ? { uri: activeBackgroundUri }        // 2. Remote URI (fallback)
      : DEFAULT_BG;                         // 3. Default background

<ImageBackground source={bgSource} ...>
```

**Note:** The priority is reversed between background and outfit:
- **Backgrounds:** local map first → URI fallback (local images are preferred)
- **Outfits:** URI first → local map fallback (remote images are preferred)

The `key={activeOutfit}` on the outfit Image forces a full remount when the outfit changes, preventing React Native's Image component from caching stale `require()` sources.

### Image maps

`BG_IMAGES` and `OUTFIT_IMAGES` are `Record<string, any>` objects with `require()` calls. They map store IDs to local asset module IDs. These must be defined as static objects (React Native Metro bundler requires static `require()` calls).

Remote items from Supabase that don't have local entries will only render via their URI. The `useShopItems` hook merges local and remote catalogs, preserving local IDs.

---

## 7. Key gotchas and rules

### 1. Never call mutations before `_loaded`

`persist()` is a no-op before hydration. Actions called during the hydration window will update in-memory state but won't persist until after `loadAchievements` completes. This is intentional — it prevents default values from overwriting saved data.

### 2. Race condition protection

`loadAchievements` captures `preLoadState` before async work. After hydration, it compares current state to detect if the user changed equip selections during the hydration window. If they did, the user's in-memory choice is preserved and persisted.

### 3. Always use atomic selectors

```tsx
// Correct — re-renders only when this specific field changes
const activeOutfit = useAchievementsStore((s) => s.activeOutfit);

// Wrong — re-renders on ANY store change
const { activeOutfit, totalCoins, ... } = useAchievementsStore();
```

### 4. Sync functions order

In `swipeable-layout.tsx`, the load order on focus is:
1. `loadAchievements()` — must be first (other flows depend on purchased/equipped state)
2. `loadRoutines()`, `loadStreak()`, `proStore.load()` — in parallel
3. `initializeAppStreak()`, `trackWeeklyUsage()`, `rechargeShieldsIfNeeded()` — after hydration

### 5. Supabase tables

| Table | Key | Used by |
|---|---|---|
| `user_achievements` | `user_id` (PK) | achievementsStore — full state snapshot |
| `user_state` | `user_id` (PK) | syncService — activities array |
| `shop_items` | `id` (PK) | useShopItems — remote shop catalog |

### 6. AsyncStorage keys

| Key | Store | Contents |
|---|---|---|
| `@smartlist_achievements` | achievementsStore | Full snapshot JSON |
| `@smartlist_achievements_backup` | achievementsStore | Backup copy (corruption recovery) |
| `@smartlist_app_opened` | achievementsStore | Flag for app_opened achievement |
| `@smartlist_app_streak` | appStreakStore | Streak count, history, shield dates |
| `@smartlist_pro_store` | proStore | isPro, shield count |
| `@smartlist_activities` | syncService | Activities array |
| `@smartlist_egg_store` | eggStore | Pet/egg state (via zustand/persist) |

### 7. Widget sync (Android)

Background/outfit changes are synced to Android widgets via direct AsyncStorage writes:
- `WIDGET_BG_ID_KEY` / `WIDGET_BG_URI_KEY` / `WIDGET_BG_MODE_KEY`
- `WIDGET_OUTFIT_ID_KEY` / `WIDGET_OUTFIT_URI_KEY`
- Widget reads these keys on next render cycle via `requestWidgetUpdate`
