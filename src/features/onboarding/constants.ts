import { colors } from '@/constants/theme';
import { GoalOption, SelectOption, StatementData, TaskSuggestion } from './types';

// ============================================
// DATA CONSTANTS
// ============================================

export const RANGOS_EDAD: SelectOption[] = [
  { id: '13-18', label: '13-18' },
  { id: '19-24', label: '19-24' },
  { id: '25-34', label: '25-34' },
  { id: '35-44', label: '35-44' },
  { id: '45+', label: '45+' },
];

export const ADHD_DIAGNOSIS: SelectOption[] = [
  { id: 'yes', label: 'onboarding.options.adhd_diagnosis.yes' },
  { id: 'suspect', label: 'onboarding.options.adhd_diagnosis.suspect' },
  { id: 'no_struggle', label: 'onboarding.options.adhd_diagnosis.no_struggle' },
  { id: 'optimize', label: 'onboarding.options.adhd_diagnosis.optimize' },
];

export const ADHD_SYMPTOMS: SelectOption[] = [
  { id: 'paralysis', label: 'onboarding.options.adhd_symptoms.paralysis' },
  { id: 'time', label: 'onboarding.options.adhd_symptoms.time' },
  { id: 'overwhelm', label: 'onboarding.options.adhd_symptoms.overwhelm' },
  { id: 'forget', label: 'onboarding.options.adhd_symptoms.forget' },
  { id: 'racing_mind', label: 'onboarding.options.adhd_symptoms.racing_mind' },
];

export const LIFE_AREAS: SelectOption[] = [
  { id: 'home', label: 'onboarding.options.life_areas.home' },
  { id: 'work', label: 'onboarding.options.life_areas.work' },
  { id: 'health', label: 'onboarding.options.life_areas.health' },
];

export const MAIN_GOAL: SelectOption[] = [
  { id: 'finish_projects', label: 'onboarding.options.main_goal.finish_projects' },
  { id: 'less_stress', label: 'onboarding.options.main_goal.less_stress' },
  { id: 'lasting_routines', label: 'onboarding.options.main_goal.lasting_routines' },
  { id: 'feel_proud', label: 'onboarding.options.main_goal.feel_proud' },
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
  { id: 'clean-room', label: 'onboarding.task_demo.suggestions.clean_room_label', text: 'onboarding.task_demo.suggestions.clean_room_text' },
  { id: 'unpack-suitcase', label: 'onboarding.task_demo.suggestions.unpack_suitcase_label', text: 'onboarding.task_demo.suggestions.unpack_suitcase_text' },
  { id: 'make-omelette', label: 'onboarding.task_demo.suggestions.make_omelette_label', text: 'onboarding.task_demo.suggestions.make_omelette_text' },
];

export const HABIT_DAYS = [
  { id: 0, label: 'L' },
  { id: 1, label: 'M' },
  { id: 2, label: 'X' },
  { id: 3, label: 'J' },
  { id: 4, label: 'V' },
  { id: 5, label: 'S' },
  { id: 6, label: 'D' },
];
