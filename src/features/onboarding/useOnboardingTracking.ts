import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { posthog } from '@/src/config/posthog';
import { SLIDES_V3, TOTAL_SLIDES_V3 } from './slides-v3';
import type { OnboardingAnswers } from './types';

const FLOW_VERSION = 'v3';

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function sanitizeAnswer(
  answerKey: string | null,
  answers: OnboardingAnswers,
): string | string[] | boolean | null {
  if (!answerKey) return null;

  const value = answers[answerKey as keyof OnboardingAnswers];
  if (value === null || value === undefined) return null;

  if (answerKey === 'userName' || answerKey === 'taskText') {
    return typeof value === 'string' ? value.trim().length > 0 : false;
  }

  return value as string | string[] | null;
}

export function useOnboardingTracking() {
  const sessionIdRef = useRef<string>(generateSessionId());
  const startTimestampRef = useRef<number>(0);
  const stepTimestampRef = useRef<number>(0);
  const backCountRef = useRef<number>(0);
  const lastSlideIndexRef = useRef<number>(0);
  const stepsCompletedRef = useRef<number>(0);
  const isFinishedRef = useRef<boolean>(false);

  const getProgress = useCallback((stepIndex: number) => {
    return Math.round(((stepIndex + 1) / TOTAL_SLIDES_V3) * 100);
  }, []);

  const trackStart = useCallback(() => {
    const now = Date.now();
    startTimestampRef.current = now;
    stepTimestampRef.current = now;
    sessionIdRef.current = generateSessionId();

    posthog.capture('onboarding_started', {
      flow_version: FLOW_VERSION,
      session_id: sessionIdRef.current,
      is_anonymous: true,
      total_steps: TOTAL_SLIDES_V3,
    });
  }, []);

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
        session_id: sessionIdRef.current,
        total_steps: TOTAL_SLIDES_V3,
        progress_percentage: getProgress(stepIndex),
        direction,
      });
    },
    [getProgress],
  );

  const trackStepCompleted = useCallback(
    (stepIndex: number, answers: OnboardingAnswers) => {
      const config = SLIDES_V3[stepIndex];
      if (!config) return;

      const now = Date.now();
      const timeSpent = stepTimestampRef.current
        ? Math.round(((now - stepTimestampRef.current) / 1000) * 10) / 10
        : 0;

      stepsCompletedRef.current += 1;

      posthog.capture('onboarding_step_completed', {
        step_index: stepIndex,
        step_id: config.id,
        step_type: config.type,
        time_spent_seconds: timeSpent,
        flow_version: FLOW_VERSION,
        session_id: sessionIdRef.current,
        progress_percentage: getProgress(stepIndex),
        answer_key: config.answerKey ?? null,
        answer_value: sanitizeAnswer(config.answerKey, answers),
      });
    },
    [getProgress],
  );

  const trackStepBack = useCallback(
    (fromStepIndex: number, toStepIndex: number) => {
      const fromConfig = SLIDES_V3[fromStepIndex];
      const toConfig = SLIDES_V3[toStepIndex];
      backCountRef.current += 1;

      posthog.capture('onboarding_step_back', {
        from_step_index: fromStepIndex,
        from_step_id: fromConfig?.id ?? 'unknown',
        from_step_type: fromConfig?.type ?? 'unknown',
        to_step_index: toStepIndex,
        to_step_id: toConfig?.id ?? 'unknown',
        to_step_type: toConfig?.type ?? 'unknown',
        steps_completed_so_far: stepsCompletedRef.current,
        flow_version: FLOW_VERSION,
        session_id: sessionIdRef.current,
      });
    },
    [],
  );

  const trackCompleted = useCallback((answers: OnboardingAnswers) => {
    isFinishedRef.current = true;

    const totalTime = startTimestampRef.current
      ? Math.round((Date.now() - startTimestampRef.current) / 1000)
      : 0;

    posthog.capture('onboarding_completed', {
      flow_version: FLOW_VERSION,
      session_id: sessionIdRef.current,
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

  const trackTrialStarted = useCallback((source: string) => {
    posthog.capture('onboarding_trial_started', {
      flow_version: FLOW_VERSION,
      session_id: sessionIdRef.current,
      source,
      last_step_index: lastSlideIndexRef.current,
      last_step_id: SLIDES_V3[lastSlideIndexRef.current]?.id ?? 'unknown',
    });
  }, []);

  const trackAbandoned = useCallback((reason: 'background' | 'unmount') => {
    if (isFinishedRef.current || startTimestampRef.current === 0) return;

    const totalTime = Math.round((Date.now() - startTimestampRef.current) / 1000);
    const config = SLIDES_V3[lastSlideIndexRef.current];

    posthog.capture('onboarding_abandoned', {
      last_step_index: lastSlideIndexRef.current,
      last_step_id: config?.id ?? 'unknown',
      last_step_type: config?.type ?? 'unknown',
      time_spent_seconds: totalTime,
      steps_completed: stepsCompletedRef.current,
      flow_version: FLOW_VERSION,
      session_id: sessionIdRef.current,
      reason,
    });
  }, []);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        trackAbandoned('background');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [trackAbandoned]);

  return {
    trackStart,
    trackStepViewed,
    trackStepCompleted,
    trackStepBack,
    trackCompleted,
    trackTrialStarted,
    trackAbandoned,
  };
}
