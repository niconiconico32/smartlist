import { colors } from '@/constants/theme';
import type { SlideConfig } from './types';

/**
 * Onboarding V3 — Full flow based on onboarding-new + closing screens from onboardingfinal.
 *
 * Slide order:
 *  0  welcome
 *  1  dialogue
 *  2  name (text-input)
 *  3  age (single-select)
 *  4  adhd-symptoms (multi-select)
 *  5  life-area (single-select)
 *  6  habit-days (custom animation)
 *  7  goals (multi-select goals)
 *  8  statement1 (agreement)
 *  9  statement2 (agreement)
 * 10  statement3 (agreement)
 * 11  task-demo
 * 12  growth-potential (custom)
 * 13  success-timeline (custom)
 * 14  neuroscience (custom)
 * 15  processing (animated analysis)
 * 16  results (bar chart profile)
 * 17  commitment (checkboxes)
 * 18  testimonial (social proof)
 * 19  notifications (permission request)
 * 20  premium-benefits (feature list)
 * 21  paywall (trial CTA)
 * 22  trial reminder
 * 23  commitment
 */
export const SLIDES_V3: SlideConfig[] = [
  // === 0: Welcome ===
  {
    type: 'welcome',
    id: 'welcome',
    answerKey: null,
    showNavButton: false,
  },

  // === 1: Dialogue ===
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

  // === 2: Name ===
  {
    type: 'text-input',
    id: 'name',
    answerKey: 'userName',
    showNavButton: true,
    title: 'onboarding.v3.name_title',
    subtitle: 'onboarding.v3.name_subtitle',
    placeholder: 'onboarding.name_placeholder',
    showLogo: false,
    canContinue: (answers) => !!answers.userName.trim(),
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
    canContinue: (answers) => !!answers.diagnosis,
    buttonText: 'onboarding.continue',
  },

  // === 4: Age ===
  {
    type: 'single-select',
    id: 'age',
    answerKey: 'ageRange',
    showNavButton: true,
    title: 'onboarding.v3.age_title',
    subtitle: 'onboarding.v3.age_subtitle',
    options: 'RANGOS_EDAD',
    canContinue: (answers) => !!answers.ageRange,
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
  },

  // === 9: Statement 2 ===
  {
    type: 'agreement',
    id: 'statement2',
    answerKey: 'statement2',
    showNavButton: false,
    statementIndex: 1,
    autoAdvance: true,
  },

  // === 10: Statement 3 ===
  {
    type: 'agreement',
    id: 'statement3',
    answerKey: 'statement3',
    showNavButton: false,
    statementIndex: 2,
    autoAdvance: true,
  },


  {
    type: 'agreement',
    id: 'statement4',
    answerKey: 'statement1',
    showNavButton: false,
    statementIndex: 3,
    autoAdvance: true,
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
      'onboarding.dialogue_progress_1',
      'onboarding.dialogue_progress_2',
      'onboarding.dialogue_progress_3'
    ],
    backgroundColor: '#f2f2f2',
    autoAdvanceAtEnd: true,
  },

  // === 14: Statement 4 ===
  {
    type: 'agreement',
    id: 'statement4',
    answerKey: 'statement4',
    showNavButton: false,
    statementIndex: 4,
  },

  // === 15: Statement 5 ===
  {
    type: 'agreement',
    id: 'statement5',
    answerKey: 'statement5',
    showNavButton: false,
    statementIndex: 5,
  },

  // === 16: Statement 6 ===
  {
    type: 'agreement',
    id: 'statement6',
    answerKey: 'statement6',
    showNavButton: false,
    statementIndex: 6,
  },


  // ─── NEW: Closing funnel slides ───

  // === 15: Processing ===
  {
    type: 'processing',
    id: 'processing',
    answerKey: null,
    showNavButton: false,
  },

  // === 16: Results ===
  {
    type: 'results',
    id: 'results',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
  },

  // === 17: Success Chart ===
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

  // === 18: Testimonial ===
  {
    type: 'testimonial',
    id: 'testimonial',
    answerKey: null,
    showNavButton: false,
  },
  // === 19: All Done ===
  {
    type: 'all-done',
    id: 'all-done',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
  },

  // === Paywall (trial CTA) ===
  {
    type: 'paywall',
    id: 'paywall',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
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

  // === 23: Commitment ===
  {
    type: 'commitment',
    id: 'commitment',
    answerKey: null,
    showNavButton: false,
    backgroundColor: colors.surface,
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
