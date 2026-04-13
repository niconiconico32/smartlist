<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Brainy, an Expo/React Native ADHD productivity app. The integration covers the full user lifecycle — from onboarding and authentication through daily task engagement, Focus Mode sessions, gamification milestones, and subscription revenue.

## What was set up

**New files created:**
- `app.config.js` — Dynamic Expo config that reads `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` from `.env` and exposes them via `expo-constants` extras.
- `src/config/posthog.ts` — PostHog client singleton, configured with batching, lifecycle events, and feature flags.

**Files modified:**

| File | Changes |
|---|---|
| `app/_layout.tsx` | Added `PostHogProvider` wrapping the app tree; added manual screen tracking via `usePathname` + `useGlobalSearchParams` for Expo Router |
| `src/contexts/AuthContext.tsx` | Added `posthog.identify()` on successful OAuth sign-in; `posthog.capture('user_signed_in')`; `posthog.reset()` on sign-out |
| `app/login.tsx` | Added `posthog.capture('user_signed_in_anonymously')` when user skips registration |
| `src/features/onboarding/OnboardingV3Screen.tsx` | Added `posthog.capture('onboarding_completed')` with goal and symptom properties |
| `src/features/onboarding/components/custom/ReverseTrialSlide.tsx` | Added `posthog.capture('trial_started')` on successful trial purchase |
| `app/(tabs)/index.tsx` | Added `posthog` import; `task_created` after activity creation; `task_completed` in toggle handler; `focus_session_started` via useEffect on `showFocusMode` |
| `src/components/FocusModeScreen.tsx` | Added `focus_session_completed` when last subtask is swiped; `focus_session_exited` when user confirms early exit |
| `src/components/PaywallModal.tsx` | Added `paywall_viewed` via useEffect on `visible`; `purchase_restored` on successful restore |
| `src/hooks/useRevenueCat.ts` | Added `subscription_purchased` with package identifier and price |
| `src/store/achievementsStore.ts` | Added `achievement_unlocked` in `updateAchievement` when newly completed; `shop_item_purchased` in `onPurchaseMade` |
| `src/store/proStore.ts` | Added `streak_shield_used` in `consumeShield` with remaining shield count |

## Events tracked

| Event | Description | File |
|---|---|---|
| `user_signed_in` | User completes OAuth sign-in (Google or Apple) | `src/contexts/AuthContext.tsx` |
| `user_signed_in_anonymously` | User continues without an account | `app/login.tsx` |
| `onboarding_completed` | User finishes all onboarding slides | `src/features/onboarding/OnboardingV3Screen.tsx` |
| `trial_started` | User starts the 7-day free trial | `src/features/onboarding/components/custom/ReverseTrialSlide.tsx` |
| `task_created` | User creates a new task/activity | `app/(tabs)/index.tsx` |
| `task_completed` | User marks a task as done (outside Focus Mode) | `app/(tabs)/index.tsx` |
| `focus_session_started` | User opens Focus Mode | `app/(tabs)/index.tsx` |
| `focus_session_completed` | User swipes through all subtasks | `src/components/FocusModeScreen.tsx` |
| `focus_session_exited` | User exits Focus Mode early | `src/components/FocusModeScreen.tsx` |
| `paywall_viewed` | PaywallModal becomes visible | `src/components/PaywallModal.tsx` |
| `subscription_purchased` | User completes Pro subscription purchase | `src/hooks/useRevenueCat.ts` |
| `purchase_restored` | User successfully restores a prior purchase | `src/components/PaywallModal.tsx` |
| `achievement_unlocked` | User earns an achievement for the first time | `src/store/achievementsStore.ts` |
| `shop_item_purchased` | User spends coins on outfit or background | `src/store/achievementsStore.ts` |
| `streak_shield_used` | User consumes a streak shield | `src/store/proStore.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/374426/dashboard/1445429
- **Onboarding → First Task Funnel:** https://us.posthog.com/project/374426/insights/S6qVURNC
- **Paywall → Subscription Conversion:** https://us.posthog.com/project/374426/insights/T40BINGj
- **Focus Session Completion Rate:** https://us.posthog.com/project/374426/insights/zUclVvdv
- **Tasks Created vs Completed:** https://us.posthog.com/project/374426/insights/CRAMKsvV
- **Revenue Activity: Trials & Subscriptions:** https://us.posthog.com/project/374426/insights/8XorLWiW

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
