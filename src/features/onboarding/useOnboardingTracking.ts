import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { posthog } from '@/src/config/posthog';
import { SLIDES_V3, TOTAL_SLIDES_V3 } from './slides-v3';
import type { OnboardingAnswers } from './types';

const FLOW_VERSION = 'v3';

/**
 * Sanitize an answer value for PostHog.
 * - Free-text fields (userName, taskText) → boolean (provided or not)
 * - Everything else → pass through as-is (option IDs, not labels)
 */
function sanitizeAnswer(
  answerKey: string | null,
  answers: OnboardingAnswers,
): string | string[] | boolean | null {
  if (!answerKey) return null;

  const value = answers[answerKey as keyof OnboardingAnswers];
  if (value === null || value === undefined) return null;

  // Privacy: don't send raw text for free-form fields
  if (answerKey === 'userName' || answerKey === 'taskText') {
    return typeof value === 'string' ? value.trim().length > 0 : false;
  }

  return value as string | string[] | null;
}

export function useOnboardingTracking() {
  const startTimestampRef = useRef<number>(0);
  const stepTimestampRef = useRef<number>(0);
  const backCountRef = useRef<number>(0);
  const lastSlideIndexRef = useRef<number>(0);
  const stepsCompletedRef = useRef<number>(0);
  const isFinishedRef = useRef<boolean>(false);

  // ── Track: Onboarding Started ──
  const trackStart = useCallback(() => {
    const now = Date.now();
    startTimestampRef.current = now;
    stepTimestampRef.current = now;

    posthog.capture('onboarding_started', {
      flow_version: FLOW_VERSION,
      is_anonymous: true,
      total_steps: TOTAL_SLIDES_V3,
    });
  }, []);

  // ── Track: Step Viewed ──
  const trackStepViewed = useCallback(
    (stepIndex: number, direction: 'forward' | 'backward') => {
      const config = SLIDES_V3[stepIndex];
      if (!config) return;

      stepTimestampRef.current = Date.now();
      lastSlideIndexRef.current = stepIndex;

      posthog.capture('onboarding_step_viewed', {
        step_index: stepIndex,
        step_id: config.id,
        step_type: config.type,
        flow_version: FLOW_VERSION,
        total_steps: TOTAL_SLIDES_V3,
        direction,
      });
    },
    [],
  );

  // ── Track: Step Completed ──
  const trackStepCompleted = useCallback(
    (stepIndex: number, answers: OnboardingAnswers) => {
      const config = SLIDES_V3[stepIndex];
      if (!config) return;

      const now = Date.now();
      const timeSpent = stepTimestampRef.current
        ? Math.round((now - stepTimestampRef.current) / 1000 * 10) / 10
        : 0;

      stepsCompletedRef.current += 1;

      posthog.capture('onboarding_step_completed', {
        step_index: stepIndex,
        step_id: config.id,
        step_type: config.type,
        time_spent_seconds: timeSpent,
        flow_version: FLOW_VERSION,
        answer_key: config.answerKey ?? null,
        answer_value: sanitizeAnswer(config.answerKey, answers),
      });
    },
    [],
  );

  // ── Track: Onboarding Completed (enhanced) ──
  const trackCompleted = useCallback((answers: OnboardingAnswers) => {
    isFinishedRef.current = true;

    const totalTime = startTimestampRef.current
      ? Math.round((Date.now() - startTimestampRef.current) / 1000)
      : 0;

    posthog.capture('onboarding_completed', {
      flow_version: FLOW_VERSION,
      total_time_seconds: totalTime,
      steps_completed: stepsCompletedRef.current,
      back_count: backCountRef.current,
      main_goal: answers.goals.join(', '),
      adhd_symptoms: answers.adhdSymptoms,
      diagnosis: answers.diagnosis,
      age_range: answers.ageRange,
      life_area: answers.lifeArea,
      $set: {
        onboarding_completed_at: new Date().toISOString(),
        adhd_diagnosis: answers.diagnosis,
        age_range: answers.ageRange,
        primary_goals: answers.goals,
      },
    });
  }, []);

  // ── Track: Back Navigation ──
  const trackBack = useCallback(() => {
    backCountRef.current += 1;
  }, []);

  // ── Track: Abandoned (AppState) ──
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' && !isFinishedRef.current && startTimestampRef.current > 0) {
        const totalTime = Math.round((Date.now() - startTimestampRef.current) / 1000);
        const config = SLIDES_V3[lastSlideIndexRef.current];

        posthog.capture('onboarding_abandoned', {
          last_step_index: lastSlideIndexRef.current,
          last_step_id: config?.id ?? 'unknown',
          time_spent_seconds: totalTime,
          steps_completed: stepsCompletedRef.current,
          flow_version: FLOW_VERSION,
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, []);

  return {
    trackStart,
    trackStepViewed,
    trackStepCompleted,
    trackCompleted,
    trackBack,
  };
}
