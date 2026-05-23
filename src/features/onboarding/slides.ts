import type { SlideConfig } from './types';

/**
 * Declarative slide configuration.
 * 
 * Slide order (fixing the duplicate case-4 bug in the original):
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
 * 15  reverse-trial (custom - final)
 */
export const SLIDES: SlideConfig[] = [
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
      'onboarding.dialogue_legacy_intro_1',
      'onboarding.dialogue_legacy_intro_2',
    ],
  },

  // === 2: Name ===
  {
    type: 'text-input',
    id: 'name',
    answerKey: 'userName',
    showNavButton: true,
    title: 'onboarding.legacy.name_title',
    subtitle: 'onboarding.legacy.name_subtitle',
    placeholder: 'onboarding.name_placeholder',
    showLogo: true,
    canContinue: (answers) => !!answers.userName.trim(),
    buttonText: 'onboarding.continue',
  },

  // === 3: Age ===
  {
    type: 'single-select',
    id: 'age',
    answerKey: 'ageRange',
    showNavButton: true,
    title: 'onboarding.legacy.age_title',
    subtitle: 'onboarding.legacy.age_subtitle',
    options: 'RANGOS_EDAD',
    canContinue: (answers) => !!answers.ageRange,
    buttonText: 'onboarding.continue',
  },

  // === 4: ADHD Symptoms (was buggy duplicate case 4) ===
  {
    type: 'multi-select',
    id: 'adhd-symptoms',
    answerKey: 'adhdSymptoms',
    showNavButton: true,
    title: 'onboarding.legacy.adhd_symptoms_title',
    subtitle: 'onboarding.legacy.adhd_symptoms_subtitle',
    options: 'ADHD_SYMPTOMS',
    canContinue: (answers) => answers.adhdSymptoms.length > 0,
    buttonText: 'onboarding.continue',
  },

  // === 5: Life Area (was the second "case 4" — now properly separated) ===
  {
    type: 'single-select',
    id: 'life-area',
    answerKey: 'lifeArea',
    showNavButton: true,
    title: 'onboarding.legacy.life_area_title',
    subtitle: 'onboarding.legacy.life_area_subtitle',
    options: 'LIFE_AREAS',
    canContinue: (answers) => !!answers.lifeArea,
    buttonText: 'onboarding.continue',
  },

  // === 6: Habit Days (custom animation) ===
  {
    type: 'habit-days',
    id: 'habit-days',
    answerKey: null,
    showNavButton: false,
  },

  // === 7: Goals ===
  {
    type: 'goals',
    id: 'goals',
    answerKey: 'goals',
    showNavButton: true,
    title: 'onboarding.legacy.goals_title',
    subtitle: 'onboarding.legacy.goals_subtitle',
    options: 'GOAL_OPTIONS',
    canContinue: (answers) => answers.goals.length > 0,
    buttonText: 'onboarding.continue',
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

  // === 11: Task Demo ===
  {
    type: 'task-demo',
    id: 'task-demo',
    answerKey: 'taskText',
    showNavButton: true,
    canContinue: (answers) => !!answers.taskText.trim(),
    buttonText: 'onboarding.help_me_with_this',
  },

  // === 12: Growth Potential ===
  {
    type: 'growth-potential',
    id: 'growth-potential',
    answerKey: null,
    showNavButton: false,
  },

  // === 13: Success Timeline ===
  {
    type: 'success-timeline',
    id: 'success-timeline',
    answerKey: null,
    showNavButton: false,
  },

  // === 14: Neuroscience ===
  {
    type: 'neuroscience',
    id: 'neuroscience',
    answerKey: null,
    showNavButton: true,
    buttonText: 'Continuar',
  },

  // === 15: Reverse Trial ===
  {
    type: 'reverse-trial',
    id: 'reverse-trial',
    answerKey: null,
    showNavButton: false,
  },
];

export const TOTAL_SLIDES = SLIDES.length;
