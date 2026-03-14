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
      '¡Hola! Soy Brainy 👋',
      'Solo unas preguntitas antes de iniciar nuestro viaje.',
    ],
  },

  // === 2: Name ===
  {
    type: 'text-input',
    id: 'name',
    answerKey: 'userName',
    showNavButton: true,
    title: '¿Cuál es tu nombre?',
    subtitle: '¡Me encantaría conocerte mejor!',
    placeholder: 'Tu nombre',
    showLogo: true,
    canContinue: (answers) => !!answers.userName.trim(),
    buttonText: 'Continuar',
  },

  // === 3: Age ===
  {
    type: 'single-select',
    id: 'age',
    answerKey: 'ageRange',
    showNavButton: true,
    title: '¿Cuál es tu edad?',
    subtitle: 'El TDAH se manifiesta de formas únicas en cada etapa de la vida.',
    options: 'RANGOS_EDAD',
    canContinue: (answers) => !!answers.ageRange,
    buttonText: 'Continuar',
  },

  // === 4: ADHD Diagnosis ===
  {
    type: 'single-select',
    id: 'diagnosis',
    answerKey: 'diagnosis',
    showNavButton: true,
    title: '¿Tienes un diagnóstico oficial?',
    subtitle: 'Esto nos ayuda a ajustar el tono de nuestras herramientas.',
    options: 'ADHD_DIAGNOSIS',
    canContinue: (answers) => !!answers.diagnosis,
    buttonText: 'Continuar',
  },

  // === 5: ADHD Symptoms ===
  {
    type: 'multi-select',
    id: 'adhd-symptoms',
    answerKey: 'adhdSymptoms',
    showNavButton: true,
    title: '¿Cómo te afecta el TDAH hoy?',
    subtitle: 'Selecciona los síntomas que experimentas frecuentemente.',
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
    title: '¿Qué área de tu día a día es con la que más te cuesta lidiar?',
    subtitle: 'Deja que Brainy te ayude con esto. Crearemos un par de tareas por ti.',
    options: 'LIFE_AREAS',
    canContinue: (answers) => !!answers.lifeArea,
    buttonText: 'Continuar',
  },

  // === 6: Habit Days (custom animation) ===
  {
    type: 'habit-days',
    id: 'habit-days',
    answerKey: null,
    showNavButton: false,
  },

  // === 7: Main Goal ===
  {
    type: 'multi-select',
    id: 'main-goal',
    answerKey: 'mainGoal',
    showNavButton: true,
    title: 'Si pudieras dominar una sola cosa, ¿cuál sería?',
    subtitle: 'Este será nuestro norte.',
    options: 'MAIN_GOAL',
    canContinue: (answers) => answers.mainGoal.length > 0,
    buttonText: 'Continuar',
  },

  // === 8: Goals ===
  {
    type: 'goals',
    id: 'goals',
    answerKey: 'goals',
    showNavButton: true,
    title: '¿Qué quieres lograr con Brainy?',
    subtitle: 'Selecciona tus objetivos para que la IA personalice tu experiencia.',
    options: 'GOAL_OPTIONS',
    canContinue: (answers) => answers.goals.length > 0,
    buttonText: 'Continuar',
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
    buttonText: 'Ayúdame con esto',
  },

  // === 14: Neuroscience ===
  {
    type: 'neuroscience',
    id: 'neuroscience',
    answerKey: null,
    showNavButton: true,
    buttonText: 'Continuar',
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
  },

  // === 17: Commitment ===
  {
    type: 'commitment',
    id: 'commitment',
    answerKey: null,
    showNavButton: false,
  },

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

];

export const TOTAL_SLIDES_V3 = SLIDES_V3.length;
