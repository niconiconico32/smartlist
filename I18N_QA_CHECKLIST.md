# i18n QA Checklist

All language detection is **device-based** — no in-app toggle. Change device language in Settings to test each scenario.

---

## Setup

- [ ] Set device language to **English** and cold-start the app
- [ ] Set device language to **Spanish** and cold-start the app
- [ ] Set device language to **French** (unsupported) — confirm app falls back to **English**

---

## Onboarding

| Screen                                                   | EN check | ES check |
| -------------------------------------------------------- | -------- | -------- |
| Welcome screen title & subtitle                          | [X]      | [ ]      |
| Brainy dialogue bubbles (all steps)                      | [X]      | [ ]      |
| Name / age / ADHD / goal step labels                     | [X]      | [ ]      |
| Option pills (diagnosis, life area, symptoms)            | [X]      | [ ]      |
| Continue / Generate buttons                              | [X]      | [ ]      |
| No language-toggle buttons visible (dev buttons removed) | [X]      | [ ]      |

---

## Login Screen (`app/login.tsx`)

- [ ] **EN**: Subtitle shows "Connect your account" or "Personalize your experience" (depending on `isUpgrading` flag)
- [ ] **ES**: Subtitle shows correct Spanish variant
- [ ] "Continue with Google" button label
- [ ] "or" divider
- [ ] "Start without an account" / "Back to app" button
- [ ] Disclaimer / Terms text at bottom

---

## Benefits Screen (`app/benefits.tsx`)

- [ ] Header title ("Benefits" / "Beneficios")
- [ ] Main title text
- [ ] Each benefit card: title and description translated
- [ ] Back button
- [ ] Next / Continue button

---

## Hamburger Menu (`src/components/HamburgerMenu.tsx`)

- [x] All MenuRow labels and sublabels
- [x] Google sign-in button text
- [x] "Unlock Pro" text
- [x] Sheet title
- [x] Delete account Alert: title, message, Cancel, Delete buttons
- [x] Restore purchases Alert: success/failure messages
- [x] Contact email: subject and body pre-filled in correct language

---

## Force Update Screen (`src/components/ForceUpdateScreen.tsx`)

- [ ] **iOS**: "Go to App Store" label
- [ ] **Android**: "Go to Play Store" label
- [ ] Version info text

---

## Review Request Modal (`src/components/ReviewRequestModal.tsx`)

- [x] Title
- [x] Body text
- [x] "Leave a Review" button
- [x] "Not now" button

---

## Streak Shield Modal (`src/components/StreakShieldModal.tsx`)

- [ ] Title
- [ ] Description with `{{streak}}` count interpolated correctly (e.g. "3-day streak" / "racha de 3 días")
- [ ] Shields remaining with plural count (e.g. "2 shields left" / "2 escudos restantes")
- [ ] "Use Shield" button
- [ ] "Lose Streak" button with `{{streak}}` interpolated

---

## Redeem Code Modal (`src/components/RedeemCodeModal.tsx`)

- [x] Title and subtitle
- [x] Placeholder text in input field
- [x] "Redeem" button
- [x] Success title and subtitle with `{{coins}}` interpolated
- [x] "Done" button on success state

---

## Routine Celebration (`src/components/RoutineCelebration.tsx`)

- [x] Title ("Routine completed!" / "¡Rutina completada!")
- [x] Subtitle
- [x] "Continue" button

---

## Task Celebration (`src/components/TaskCelebration.tsx`)

- [x] Title ("Task completed!" / "¡Tarea completada!")
- [x] Subtitle
- [x] "Continue" button

---

## Notification Card (`src/components/NotificationCard.tsx`)

- [x] Day period: "{{count}} tasks completed today"
- [x] Week period: "{{count}} tasks completed this week"
- [x] Month period: "{{count}} tasks completed this month"
- [x] Count value interpolated correctly in all periods

---

## Streak Success Screen (`src/components/StreakSuccessScreen.tsx`)

- [x] First-day messages (3 variants) in correct language
- [x] Multi-day streak messages (6 variants) in correct language
- [x] Random selection still works (different message on repeat opens)
- [x] "Continue" button

---

## Pro Trial Offer Modal (`src/components/ProTrialOfferModal.tsx`)

- [x] Benefit cards: Widget, Crowns, Shield — title and subtitle
- [x] Store title and subtitle
- [x] All cards display in correct language

---

## Daily Streak Screen (`src/components/DailyStreakScreen.tsx`)

- [x] "CURRENT STREAK" / "RACHA ACTUAL" label
- [x] Day abbreviations in weekly calendar: Mon–Sun / Lun–Dom
- [x] Today's day highlighted correctly
- [x] Shield protected message (when `shieldUsedToday = true`)
- [x] Comeback motivational message (default)
- [x] Badge day counts: "7 days" / "7 días", "30 days" / "30 días", etc.
- [x] "My Badges" / "Mis Medallas" section header
- [x] Locked badge labels appear greyed out (no translation regression)

---

## Routines Screen (`app/(tabs)/two.tsx`)

- [x] Header title when routines exist for today: "X routine(s) for today" / "X rutina(s) para hoy" (singular and plural)
- [x] Header title when no routines for selected day: "No routines for Mon" / "Sin rutinas para Lun"
- [x] Header title with no routines at all: "Create your first routine" / "Crea tu primera rutina"
- [x] Empty state title (no routines for day) with translated day abbreviation
- [x] Empty state title (no routines at all)
- [x] Empty state subtitle for each case
- [x] Day selector in swipeable header still highlights correct day
- [x] Filtering routines still works correctly (data keys "Lun"/"Dom" unaffected by display translation)

---

## Create Routine Modal (`src/components/CreateRoutineModal.tsx`)

- [x] "Which days do you want to do it?" / "¿Qué días quieres hacerla?" section label
- [x] Day buttons display translated abbreviations (Mon–Sun / Lun–Dom)
- [x] Day selection stored correctly — after saving, routine appears on the correct day in routines screen
- [x] "Routine tasks" / "Tareas de la rutina" section label
- [x] "Hold to reorder" / "Mantén presionado para ordenar" hint
- [x] Icon picker: all 20 icon labels translated
- [x] Animated placeholder text cycles correctly

---

## Edit Routine Modal (`src/components/EditRoutineModal.tsx`)

- [x] Same checks as Create Routine Modal above
- [x] Existing routine days load and display correctly in translated form
- [x] Saving edited routine retains correct days in DB (data keys unchanged)

---

## Routine Detail Modal (`src/components/RoutineDetailModal.tsx`)

- [x] Calendar header day abbreviations: Mon–Sun / Lun–Dom
- [x] Correct days highlighted based on routine schedule
- [x] Day matching logic unaffected (stored "Lun" keys still match)
- [ ] Date formatting in next-scheduled banner

---

## Expo Notifications (`src/lib/notificationService.ts`, `src/utils/notifications.ts`)

- [x] Routine reminder channel name and description translated
- [x] Routine random reminder messages translated
- [x] Task reminder body translated with plural interpolation (`{{count}}`)
- [x] Streak milestone notifications translated (day 1, 7, 30, multiples of 7)
- [x] Trial expiration notification translated
- [x] Streak warning notification translated with plural interpolation (`{{count}}`)

---

## Edge Cases

- [ ] Switch device language while app is running → **require cold restart** to pick up new language (expo-localization reads language at startup)
- [ ] Unsupported language (e.g. French, German) → app displays in **English**
- [ ] Empty string keys → no key names leaked to UI (e.g. `"days.mon_abbr"` should never appear on screen)
- [ ] All Alert dialogs (delete account, restore purchases, streak shield) show correct language
- [ ] All interpolated values (`{{count}}`, `{{streak}}`, `{{coins}}`, `{{day}}`) render correctly with actual values, not the placeholder text
- [ ] No visible `[object Object]` or `undefined` values in any translated string
- [ ] Pro paywall / benefits screen loads with correct language without flash of wrong language
