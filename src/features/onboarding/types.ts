// ============================================
// SLIDE TYPES
// ============================================

export type SlideType =
  | 'welcome'
  | 'dialogue'
  | 'text-input'
  | 'single-select'
  | 'multi-select'
  | 'goals'
  | 'agreement'
  | 'task-demo'
  | 'habit-days'
  | 'growth-potential'
  | 'success-timeline'
  | 'reverse-trial'
  | 'neuroscience'
  | 'processing'
  | 'results'
  | 'commitment'
  | 'testimonial'
  | 'notifications'
  | 'premium-benefits'
  | 'trial-reminder'
  | 'plan-selector'
  | 'paywall';

// ============================================
// DATA TYPES
// ============================================

export interface SelectOption {
  id: string;
  label: string;
  value?: string;
}

export interface GoalOption {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export interface StatementData {
  id: number;
  textMain: string;
  textHighlight: string;
}

export interface TaskSuggestion {
  id: string;
  label: string;
  text: string;
}

/** String reference to a constant array in constants.ts */
export type OptionsRef = 'RANGOS_EDAD' | 'ADHD_SYMPTOMS' | 'LIFE_AREAS' | 'GOAL_OPTIONS' | 'ADHD_DIAGNOSIS' | 'MAIN_GOAL';

// ============================================
// SLIDE CONFIGS (discriminated union)
// ============================================

interface BaseSlideConfig {
  id: string;
  /** Key in OnboardingAnswers to store the response, null if slide stores nothing */
  answerKey: keyof OnboardingAnswers | null;
  /** Whether to show the continue button in the nav bar */
  showNavButton?: boolean;
  /** Custom button text */
  buttonText?: string;
  /** Validation: is the slide complete enough to proceed? */
  canContinue?: (answers: OnboardingAnswers) => boolean;
  /** Optional custom background color for this specific slide */
  backgroundColor?: string;
  /** Optional custom background image for this specific slide (e.g. require('@/assets/bg.webp')) */
  backgroundImage?: any;
  /** Optional custom background gradient colors (e.g. ['#FFFFFF', '#000000']) */
  backgroundGradient?: readonly [string, string, ...string[]];
}

export interface WelcomeSlideConfig extends BaseSlideConfig {
  type: 'welcome';
}

export interface DialogueSlideConfig extends BaseSlideConfig {
  type: 'dialogue';
  messages: string[];
  autoAdvanceAtEnd?: boolean;
}

export interface TextInputSlideConfig extends BaseSlideConfig {
  type: 'text-input';
  title: string;
  subtitle: string;
  placeholder: string;
  showLogo?: boolean;
}

export interface SingleSelectSlideConfig extends BaseSlideConfig {
  type: 'single-select';
  title: string;
  subtitle: string;
  /** String key referencing an array exported from constants.ts */
  options: OptionsRef;
}

export interface MultiSelectSlideConfig extends BaseSlideConfig {
  type: 'multi-select';
  title: string;
  subtitle: string;
  options: OptionsRef;
}

export interface GoalsSlideConfig extends BaseSlideConfig {
  type: 'goals';
  title: string;
  subtitle: string;
  options: OptionsRef;
}

export interface AgreementSlideConfig extends BaseSlideConfig {
  type: 'agreement';
  /** Index into STATEMENTS array */
  statementIndex: number;
  /** Auto-advance after selection (default true) */
  autoAdvance?: boolean;
}

export interface TaskDemoSlideConfig extends BaseSlideConfig {
  type: 'task-demo';
}

export interface HabitDaysSlideConfig extends BaseSlideConfig {
  type: 'habit-days';
}

export interface GrowthPotentialSlideConfig extends BaseSlideConfig {
  type: 'growth-potential';
}

export interface SuccessTimelineSlideConfig extends BaseSlideConfig {
  type: 'success-timeline';
}

export interface SuccessChartSlideConfig extends BaseSlideConfig {
  type: 'success-chart';
}

export interface RoutinePickerSlideConfig extends BaseSlideConfig {
  type: 'routine-picker';
}

export interface AllDoneSlideConfig extends BaseSlideConfig {
  type: 'all-done';
}

export interface ReverseTrialSlideConfig extends BaseSlideConfig {
  type: 'reverse-trial';
}

export interface NeuroscienceSlideConfig extends BaseSlideConfig {
  type: 'neuroscience';
}

export interface ProcessingSlideConfig extends BaseSlideConfig {
  type: 'processing';
}

export interface ResultsSlideConfig extends BaseSlideConfig {
  type: 'results';
}

export interface CommitmentSlideConfig extends BaseSlideConfig {
  type: 'commitment';
}

export interface TestimonialSlideConfig extends BaseSlideConfig {
  type: 'testimonial';
}

export interface NotificationsSlideConfig extends BaseSlideConfig {
  type: 'notifications';
}

export interface PremiumBenefitsSlideConfig extends BaseSlideConfig {
  type: 'premium-benefits';
}

export interface TrialReminderSlideConfig extends BaseSlideConfig {
  type: 'trial-reminder';
}

export interface PlanSelectorSlideConfig extends BaseSlideConfig {
  type: 'plan-selector';
}

export interface PaywallSlideConfig extends BaseSlideConfig {
  type: 'paywall';
}

export type SlideConfig =
  | WelcomeSlideConfig
  | DialogueSlideConfig
  | TextInputSlideConfig
  | SingleSelectSlideConfig
  | MultiSelectSlideConfig
  | GoalsSlideConfig
  | AgreementSlideConfig
  | TaskDemoSlideConfig
  | HabitDaysSlideConfig
  | GrowthPotentialSlideConfig
  | SuccessChartSlideConfig
  | RoutinePickerSlideConfig
  | AllDoneSlideConfig
  | SuccessTimelineSlideConfig
  | ReverseTrialSlideConfig
  | NeuroscienceSlideConfig
  | ProcessingSlideConfig
  | ResultsSlideConfig
  | CommitmentSlideConfig
  | TestimonialSlideConfig
  | NotificationsSlideConfig
  | PremiumBenefitsSlideConfig
  | TrialReminderSlideConfig
  | PlanSelectorSlideConfig
  | PaywallSlideConfig;

// ============================================
// ONBOARDING STATE
// ============================================

export interface OnboardingAnswers {
  userName: string;
  ageRange: string | null;
  diagnosis: string | null;
  adhdSymptoms: string[];
  lifeArea: string | null;
  mainGoal: string[];
  goals: string[];
  statement1: string | null;
  statement2: string | null;
  statement3: string | null;
  statement4: string | null;
  statement5: string | null;
  statement6: string | null;
  taskText: string;
}

export const INITIAL_ANSWERS: OnboardingAnswers = {
  userName: '',
  ageRange: null,
  diagnosis: null,
  adhdSymptoms: [],
  lifeArea: null,
  mainGoal: [],
  goals: [],
  statement1: null,
  statement2: null,
  statement3: null,
  statement4: null,
  statement5: null,
  statement6: null,
  taskText: '',
};

// ============================================
// SHARED COMPONENT PROPS
// ============================================

export interface SlideProps {
  answers: OnboardingAnswers;
  onAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void;
}
