import { colors } from '@/constants/theme';
import { GoalOption, SelectOption, StatementData, TaskSuggestion } from './types';

// ============================================
// LIGHT THEME (pantallas de preguntas)
// ============================================
export const LIGHT_BACKGROUND = '#F6F6F6';
export const LIGHT_TITLE = '#0D0D0D';
export const LIGHT_SUBTITLE = '#6C7086';

// ============================================
// DATA CONSTANTS
// ============================================

export const RANGOS_EDAD: SelectOption[] = [
  { id: '13-18', label: '13-18' },
  { id: '19-24', label: '19-24' },
  { id: '25-34', label: '25-34' },
];

export const USER_SITUATIONS: SelectOption[] = [
  { id: 'student', label: 'onboarding.options.user_situations.student' },
  { id: 'employee', label: 'onboarding.options.user_situations.employee' },
  { id: 'freelancer', label: 'onboarding.options.user_situations.freelancer' },
  { id: 'homemaker', label: 'onboarding.options.user_situations.homemaker' },
];

export const ADHD_DIAGNOSIS: SelectOption[] = [
  { id: 'yes', label: 'onboarding.options.adhd_diagnosis.yes' },
  { id: 'suspect', label: 'onboarding.options.adhd_diagnosis.suspect' },
  { id: 'no_struggle', label: 'onboarding.options.adhd_diagnosis.no_struggle' },
  { id: 'prefer_not_say', label: 'onboarding.options.adhd_diagnosis.prefer_not_say' },
];

export const ADHD_SYMPTOMS: SelectOption[] = [
  { id: 'paralysis', label: 'onboarding.options.adhd_symptoms.paralysis' },
  { id: 'time', label: 'onboarding.options.adhd_symptoms.time' },
  { id: 'overwhelm', label: 'onboarding.options.adhd_symptoms.overwhelm' },
  { id: 'prefer_not_say', label: 'onboarding.options.adhd_symptoms.prefer_not_say' },
];

export const LIFE_AREAS: SelectOption[] = [
  { id: 'home', label: 'onboarding.options.life_areas.home' },
  { id: 'work', label: 'onboarding.options.life_areas.work' },
  { id: 'health', label: 'onboarding.options.life_areas.health' },
  { id: 'prefer_not_say', label: 'onboarding.options.life_areas.prefer_not_say' },
];

export const MAIN_GOAL: SelectOption[] = [
  { id: 'finish_projects', label: 'onboarding.options.main_goal.finish_projects' },
  { id: 'less_stress', label: 'onboarding.options.main_goal.less_stress' },
  { id: 'lasting_routines', label: 'onboarding.options.main_goal.lasting_routines' },
  { id: 'no_guilt', label: 'onboarding.options.main_goal.no_guilt' },
];

export const GOAL_OPTIONS: GoalOption[] = [
  { id: 'paralysis', emoji: '🧠', label: 'onboarding.options.goal_options.paralysis', color: colors.primary },
  { id: 'time', emoji: '⌜', label: 'onboarding.options.goal_options.time', color: colors.accent },
  { id: 'noise', emoji: '⚡', label: 'onboarding.options.goal_options.noise', color: colors.success },
  { id: 'consistent', emoji: '✅', label: 'onboarding.options.goal_options.consistent', color: colors.primary },
  { id: 'anxiety', emoji: '🧘', label: 'onboarding.options.goal_options.anxiety', color: colors.accent },
];

export const AGREEMENT_OPTIONS: SelectOption[] = [
  { id: 'strongly_agree', label: 'onboarding.agreement_options.strongly_agree', value: 'strongly_agree' },
  { id: 'somewhat_agree', label: 'onboarding.agreement_options.somewhat_agree', value: 'somewhat_agree' },
  { id: 'disagree', label: 'onboarding.agreement_options.disagree', value: 'disagree' },
  { id: 'strongly_disagree', label: 'onboarding.agreement_options.strongly_disagree', value: 'strongly_disagree' },
];

export const STATEMENTS: StatementData[] = [
  {
    id: 1,
    textMain: 'onboarding.statements.1.main',
    textHighlight: 'onboarding.statements.1.highlight',
  },
  {
    id: 2,
    textMain: 'onboarding.statements.2.main',
    textHighlight: 'onboarding.statements.2.highlight',
  },
  {
    id: 3,
    textMain: 'onboarding.statements.3.main',
    textHighlight: 'onboarding.statements.3.highlight',
  },
  {
    id: 4,
    textMain: 'onboarding.statements.4.main',
    textHighlight: 'onboarding.statements.4.highlight',
  },
  {
    id: 5,
    textMain: 'onboarding.statements.5.main',
    textHighlight: 'onboarding.statements.5.highlight',
  },
  {
    id: 6,
    textMain: 'onboarding.statements.6.main',
    textHighlight: 'onboarding.statements.6.highlight',
  },
  {
    id: 7,
    textMain: 'onboarding.statements.7.main',
    textHighlight: 'onboarding.statements.7.highlight',
  },
];

export const TASK_SUGGESTIONS: TaskSuggestion[] = [
  {
    id: 'clean-room',
    label: 'onboarding.task_demo.suggestions.clean_room_label',
    text: 'onboarding.task_demo.suggestions.clean_room_text',
    microtasks: [
      { title: 'onboarding.task_demo.microtasks.clean_room.0', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.clean_room.1', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.clean_room.2', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.clean_room.3', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.clean_room.4', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.clean_room.5', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.clean_room.6', duration: 15 },
      { title: 'onboarding.task_demo.microtasks.clean_room.7', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.clean_room.8', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.clean_room.9', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.clean_room.10', duration: 5 },
    ],
  },
  {
    id: 'make-cv',
    label: 'onboarding.task_demo.suggestions.make_cv_label',
    text: 'onboarding.task_demo.suggestions.make_cv_text',
    microtasks: [
      { title: 'onboarding.task_demo.microtasks.make_cv.0', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.make_cv.1', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.make_cv.2', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.make_cv.3', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.make_cv.4', duration: 15 },
      { title: 'onboarding.task_demo.microtasks.make_cv.5', duration: 15 },
      { title: 'onboarding.task_demo.microtasks.make_cv.6', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.make_cv.7', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.make_cv.8', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.make_cv.9', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.make_cv.10', duration: 5 },
    ],
  },
  {
    id: 'monthly-budget',
    label: 'onboarding.task_demo.suggestions.monthly_budget_label',
    text: 'onboarding.task_demo.suggestions.monthly_budget_text',
    microtasks: [
      { title: 'onboarding.task_demo.microtasks.monthly_budget.0', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.1', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.2', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.3', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.4', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.5', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.6', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.7', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.8', duration: 5 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.9', duration: 10 },
      { title: 'onboarding.task_demo.microtasks.monthly_budget.10', duration: 5 },
    ],
  },
];

export const HABIT_DAYS = [
  { id: 0, labelKey: 'days.sun_abbr' },
  { id: 1, labelKey: 'days.mon_abbr' },
  { id: 2, labelKey: 'days.tue_abbr' },
  { id: 3, labelKey: 'days.wed_abbr' },
  { id: 4, labelKey: 'days.thu_abbr' },
  { id: 5, labelKey: 'days.fri_abbr' },
  { id: 6, labelKey: 'days.sat_abbr' },
];
