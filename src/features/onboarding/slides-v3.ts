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
 * 21  paywall (trial CTA — final)
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
      '¡Bienvenid@!',
      'Soy Brainy, y desde ahora seré tu compañero :)',
      'Partamos nuestro viaje con unas simples preguntitas.'
    ],
    backgroundColor: '#f2f2f2',
  },

  // === 2: Name ===
  {
    type: 'text-input',
    id: 'name',
    answerKey: 'userName',
    showNavButton: true,
    title: '¿cómo deberíamos llamarte?',
    subtitle: 'primero lo primero',
    placeholder: 'Tu nombre',
    showLogo: false,
    canContinue: (answers) => !!answers.userName.trim(),
    buttonText: 'Continuar',
  },

  // === 3: ADHD Diagnosis ===
  {
    type: 'single-select',
    id: 'diagnosis',
    answerKey: 'diagnosis',
    showNavButton: true,
    title: '¿estás diagnosticad@ con TDAH?',
    subtitle: 'todos los cerebros son bienvenidos.',
    options: 'ADHD_DIAGNOSIS',
    canContinue: (answers) => !!answers.diagnosis,
    buttonText: 'Continuar',
  },

  // === 4: Age ===
  {
    type: 'single-select',
    id: 'age',
    answerKey: 'ageRange',
    showNavButton: true,
    title: '¿cuál es tu edad?',
    subtitle: 'esto nos ayudará a entenderte mejor.',
    options: 'RANGOS_EDAD',
    canContinue: (answers) => !!answers.ageRange,
    buttonText: 'Continuar',
  },

  // === 5: ADHD Symptoms ===
  {
    type: 'multi-select',
    id: 'adhd-symptoms',
    answerKey: 'adhdSymptoms',
    showNavButton: true,
    title: '¿cómo te afecta el TDAH hoy?',
    subtitle: 'selecciona las cosas que sueles experimentar.',
    options: 'ADHD_SYMPTOMS',
    canContinue: (answers) => answers.adhdSymptoms.length > 0,
    buttonText: 'Continuar',
  },

  // === 5: Life Area ===
  {
    type: 'single-select',
    id: 'life-area',
    answerKey: 'lifeArea',
    showNavButton: true,
    title: '¿qué área de tu día a día es con la que más te cuesta lidiar?',
    subtitle: 'es importante diagnosticar que te cuesta más',
    options: 'LIFE_AREAS',
    canContinue: (answers) => !!answers.lifeArea,
    buttonText: 'Continuar',
  },

  // === 7: Main Goal ===
  {
    type: 'multi-select',
    id: 'main-goal',
    answerKey: 'mainGoal',
    showNavButton: true,
    title: '¿qué te gustaría lograr a corto plazo?',
    subtitle: 'este será nuestro norte.',
    options: 'MAIN_GOAL',
    canContinue: (answers) => answers.mainGoal.length > 0,
    buttonText: 'Continuar',
  },

  // === 8: Dialogue 2 ===
  {
    type: 'dialogue',
    id: 'dialogue-2',
    answerKey: null,
    showNavButton: false,
    messages: [
      '¡ya empiezo a conocerte mejor!',
      'ahora cuéntame...'
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
      '¡te entiendo muy bien, empezar cuesta mucho!',
      'pero tranquil@, juntos podemos lograrlo.',
      'déjame mostrarte cómo puedo ayudar a que te sea más fácil.'
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
    buttonText: 'Generar',
    backgroundColor: '#f2f2f2',
  },

  // === 13: Dialogue 4 ===
  {
    type: 'dialogue',
    id: 'dialogue-4',
    answerKey: null,
    showNavButton: false,
    messages: [
      '¡qué bien! ya tienes tu primera tarea dividida.',
      '¿ves cómo se siente mucho más fácil empezar ahora?',
      'déjame contarte por qué esto funciona tan bien en tu cerebro...'
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
    type: 'routine-picker',
    id: 'routine-picker',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
  },
  // === 18: All Done ===
  {
    type: 'all-done',
    id: 'all-done',
    answerKey: null,
    showNavButton: false,
    backgroundColor: '#f2f2f2',
  },

  

  // === 20: Testimonial ===
  {
    type: 'testimonial',
    id: 'testimonial',
    answerKey: null,
    showNavButton: false,
  },

  // === 21: Commitment ===
  {
    type: 'commitment',
    id: 'commitment',
    answerKey: null,
    showNavButton: false,
    backgroundColor: colors.surface,
  },

  // === 18: Reverse Trial (Paywall) - REMOVED ===
  // (El onboarding ahora finaliza en Commitment per user request)

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
