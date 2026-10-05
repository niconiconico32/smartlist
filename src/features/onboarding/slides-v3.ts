import { colors } from '@/constants/theme';
import { LIGHT_BACKGROUND } from './constants';
import type { SlideConfig } from './types';

/**
 * Onboarding V3 — Full flow based on onboarding-new + closing screens from onboardingfinal.
 *
 * Authentication is NOT part of this flow anymore: the /login funnel owns it.
 * The legacy "welcome" slide (which rendered its own social/email buttons) was
 * removed so no entry point can reach it.
 *
 * Slide order:
 *  0  dialogue
 *  1  situation (single-select)
 *  2  diagnosis (single-select)
 *  3  adhd-symptoms (multi-select)
 *  4  life-area (single-select)
 *  5  main-goal (multi-select)
 *  6  dialogue-2
 *  7  statement1 (agreement)
 *  8  statement2 (agreement)
 *  9  statement3 (agreement)
 * 10  statement4 (agreement)
 * 11  dialogue-3
 * 12  task-demo
 * 13  dialogue-4
 * 14  results
 * 15  success-chart
 * 16  routine-egg-flow
 * 17  paywall
 * 18  trial-reminder
 * 19  paywall-onboarding
 * 20  commitment
 * 21  all-done
 */
export const SLIDES_V3: SlideConfig[] = [
  // === 0: Dialogue ===
  {
    type: 'dialogue',
    id: 'dialogue',
    answerKey: null,
    showNavButton: false,
    messages: [
      'onboarding.dialogue_intro_1',
      'onboarding.dialogue_intro_2',
      'onboarding.dialogue_intro_3'
    ],
    backgroundColor: '#f2f2f2',
  },

  // === 2: User Situation ===
  {
    type: 'single-select',
    id: 'situation',
    answerKey: 'ageRange',
    showNavButton: true,
    title: 'onboarding.v3.situation_title',
    subtitle: 'onboarding.v3.situation_subtitle',
    options: 'USER_SITUATIONS',
    backgroundColor: LIGHT_BACKGROUND,
    canContinue: (answers) => !!answers.ageRange,
    buttonText: 'onboarding.continue',
  },

  // === 3: ADHD Diagnosis ===
  {
    type: 'single-select',
    id: 'diagnosis',
    answerKey: 'diagnosis',
    showNavButton: true,
    title: 'onboarding.v3.diagnosis_title',
    subtitle: 'onboarding.v3.diagnosis_subtitle',
    options: 'ADHD_DIAGNOSIS',
    backgroundColor: LIGHT_BACKGROUND,
    canContinue: (answers) => !!answers.diagnosis,
    buttonText: 'onboarding.continue',
  },

  // === 5: ADHD Symptoms ===
  {
    type: 'multi-select',
    id: 'adhd-symptoms',
    answerKey: 'adhdSymptoms',
    showNavButton: true,
    title: 'onboarding.v3.adhd_symptoms_title',
    subtitle: 'onboarding.v3.adhd_symptoms_subtitle',
    options: 'ADHD_SYMPTOMS',
    backgroundColor: LIGHT_BACKGROUND,
    canContinue: (answers) => answers.adhdSymptoms.length > 0,
    buttonText: 'onboarding.continue',
  },

  // === 5: Life Area ===
  {
    type: 'single-select',
    id: 'life-area',
    answerKey: 'lifeArea',
    showNavButton: true,
    title: 'onboarding.v3.life_area_title',
    subtitle: 'onboarding.v3.life_area_subtitle',
    options: 'LIFE_AREAS',
    backgroundColor: LIGHT_BACKGROUND,
    canContinue: (answers) => !!answers.lifeArea,
    buttonText: 'onboarding.continue',
  },

  // === 7: Main Goal ===
  {
    type: 'multi-select',
    id: 'main-goal',
    answerKey: 'mainGoal',
    showNavButton: true,
    title: 'onboarding.v3.main_goal_title',
    subtitle: 'onboarding.v3.main_goal_subtitle',
    options: 'MAIN_GOAL',
    backgroundColor: LIGHT_BACKGROUND,
    canContinue: (answers) => answers.mainGoal.length > 0,
    buttonText: 'onboarding.continue',
  },

  // === 8: Dialogue 2 ===
  {
    type: 'dialogue',
    id: 'dialogue-2',
    answerKey: null,
    showNavButton: false,
    messages: [
      'onboarding.dialogue_mid_1',
      'onboarding.dialogue_mid_2'
    ],
    backgroundColor: '#f2f2f2',
    autoAdvanceAtEnd: true,
  },

  // === 8: Statement 1 ===
  {
    type: 'agreement',
    id: 'statement1',
    answerKey: 'statement1',
    showNavButton: false,
    statementIndex: 0,
    autoAdvance: true,
    backgroundColor: LIGHT_BACKGROUND,
  },

  // === 9: Statement 2 ===
  {
    type: 'agreement',
    id: 'statement2',
    answerKey: 'statement2',
    showNavButton: false,
    statementIndex: 1,
    autoAdvance: true,
    backgroundColor: LIGHT_BACKGROUND,
  },

  // === 10: Statement 3 ===
  {
    type: 'agreement',
    id: 'statement3',
    answerKey: 'statement3',
    showNavButton: false,
    statementIndex: 2,
    autoAdvance: true,
    backgroundColor: LIGHT_BACKGROUND,
  },


  {
    type: 'agreement',
    id: 'statement4',
    answerKey: 'statement4',
    showNavButton: false,
    statementIndex: 3,
    autoAdvance: true,
    backgroundColor: LIGHT_BACKGROUND,
  },

  // === 11: Dialogue 3 ===
  {
    type: 'dialogue',
    id: 'dialogue-3',
    answerKey: null,
    showNavButton: false,
    messages: [
      'onboarding.dialogue_support_1',
      'onboarding.dialogue_support_2',
      'onboarding.dialogue_support_3'
    ],
    backgroundColor: '#f2f2f2',
    autoAdvanceAtEnd: true,
  },

  // === 12: Task Demo ===
  {
    type: 'task-demo',
    id: 'task-demo',
    answerKey: 'taskText',
    showNavButton: false,
    canContinue: (answers) => !!answers.taskText.trim(),
    buttonText: 'onboarding.generate',
    backgroundColor: '#f2f2f2',
  },

  // === 13: Dialogue 4 ===
  {
    type: 'dialogue',
    id: 'dialogue-4',
    answerKey: null,
    showNavButton: false,
    messages: [
      'onboarding.dialogue_progress_0',
      'onboarding.dialogue_progress_1',
      'onboarding.dialogue_progress_2'
    ],
    backgroundColor: '#f2f2f2',
    autoAdvanceAtEnd: true,
  },

  // ─── NEW: Closing funnel slides ───

  // === 15: Results ===
  {
    type: 'results',
    id: 'results',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
  },

  // === 16: Success Chart ===
  {
    type: 'success-chart',
    id: 'success-chart',
    answerKey: null,
    showNavButton: false,
    backgroundColor: colors.surface,
  },
// === 19: Routine Picker ===
  {
    type: 'onboarding-routine-egg-flow',
    id: 'routine-egg-flow',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
  },

  // === Video Intro (fullscreen) ===

  // === Paywall Slide ===
  {
    type: 'paywall',
    id: 'paywall',
    answerKey: null,
    showNavButton: false,
    backgroundColor: colors.background,
  },

  // === Trial Reminder ===
  {
    type: 'trial-reminder',
    id: 'trial-reminder',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
  },

  // === RevenueCat Paywall (Onboarding) ===
  {
    type: 'paywall-onboarding',
    id: 'paywall-onboarding',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
  },

  // === Commitment ===
  {
    type: 'commitment',
    id: 'commitment',
    answerKey: null,
    showNavButton: false,
    backgroundColor: colors.surface,
  },

  // === All Done ===
  {
    type: 'all-done',
    id: 'all-done',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
  },
  /* 
  --- DRAFTED SLIDES FOR LATER ---
  
  // === 18: Testimonial ===
  {
    type: 'testimonial',
    id: 'testimonial',
    answerKey: null,
    showNavButton: false,
  },

  // === 19: Notifications ===
  {
    type: 'notifications',
    id: 'notifications',
    answerKey: null,
    showNavButton: false,
  },

  // === 20: Premium Benefits ===
  {
    type: 'premium-benefits',
    id: 'premium-benefits',
    answerKey: null,
    showNavButton: false,
  },

  // === 21: Trial Reminder ===
  {
    type: 'trial-reminder',
    id: 'trial-reminder',
    answerKey: null,
    showNavButton: false,
  },

  // === 22: Plan Selector ===
  {
    type: 'plan-selector',
    id: 'plan-selector',
    answerKey: null,
    showNavButton: false,
  },
  */
];

export const TOTAL_SLIDES_V3 = SLIDES_V3.length;
