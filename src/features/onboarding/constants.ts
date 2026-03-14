import { colors } from '@/constants/theme';
import { GoalOption, SelectOption, StatementData, TaskSuggestion } from './types';

// ============================================
// DATA CONSTANTS
// ============================================

export const RANGOS_EDAD: SelectOption[] = [
  { id: '18-24', label: '18-24' },
  { id: '25-34', label: '25-34' },
  { id: '35-44', label: '35-44' },
  { id: '45-54', label: '45-54' },
  { id: '55+', label: '55+' },
];

export const ADHD_DIAGNOSIS: SelectOption[] = [
  { id: 'yes', label: 'Sí, tengo diagnóstico' },
  { id: 'suspect', label: 'Sospecho que lo tengo' },
  { id: 'no_struggle', label: 'No, pero me cuesta concentrarme' },
  { id: 'optimize', label: 'Solo quiero optimizar mi cerebro' },
];

export const ADHD_SYMPTOMS: SelectOption[] = [
  { id: 'paralysis', label: '😫 Me cuesta empezar tareas (Parálisis)' },
  { id: 'time', label: '⏰ Pierdo la noción del tiempo' },
  { id: 'overwhelm', label: '🤯 Me siento abrumado/a fácilmente' },
  { id: 'forget', label: '💨 Olvido cosas importantes al instante' },
  { id: 'racing_mind', label: '🌪️ Mi mente no para nunca' },
];

export const LIFE_AREAS: SelectOption[] = [
  { id: 'home', label: '🏠 Caos Doméstico' },
  { id: 'work', label: '💼 Trabajo y Estudios' },
  { id: 'health', label: '🧘 Salud y Autocuidado' },
];

export const MAIN_GOAL: SelectOption[] = [
  { id: 'finish_projects', label: 'Terminar mis proyectos a tiempo' },
  { id: 'less_stress', label: 'Vivir con menos estrés y ansiedad' },
  { id: 'lasting_routines', label: 'Crear rutinas que duren más de 3 días' },
  { id: 'feel_proud', label: 'Sentirme orgulloso/a al final del día' },
];

export const GOAL_OPTIONS: GoalOption[] = [
  { id: 'paralysis', emoji: '🧠', label: 'Vencer la parálisis por análisis', color: colors.primary },
  { id: 'time', emoji: '⌜', label: 'Mejorar mi noción del tiempo', color: colors.accent },
  { id: 'noise', emoji: '⚡', label: 'Reducir el ruido mental', color: colors.success },
  { id: 'consistent', emoji: '✅', label: 'Ser más consistente', color: colors.primary },
  { id: 'anxiety', emoji: '🧘', label: 'Bajar la ansiedad al empezar', color: colors.accent },
];

export const AGREEMENT_OPTIONS: SelectOption[] = [
  { id: 'strongly_agree', label: 'Muy de acuerdo', value: 'strongly_agree' },
  { id: 'somewhat_agree', label: 'Algo de acuerdo', value: 'somewhat_agree' },
  { id: 'disagree', label: 'En desacuerdo', value: 'disagree' },
  { id: 'strongly_disagree', label: 'Muy en desacuerdo', value: 'strongly_disagree' },
];

export const STATEMENTS: StatementData[] = [
  {
    id: 1,
    textMain: 'A menudo sé exactamente lo que tengo que hacer, pero me siento ',
    textHighlight: 'físicamente incapaz de empezar',
  },
  {
    id: 2,
    textMain: 'Paso más tiempo preocupándome por una tarea que lo que ',
    textHighlight: 'realmente me tomaría completarla',
  },
  {
    id: 3,
    textMain: 'Si no veo una tarea justo frente a mí, ',
    textHighlight: 'efectivamente no existe',
  },
  {
    id: 4,
    textMain: "Los plazos no se sienten 'reales' hasta que llega el ",
    textHighlight: 'pánico del último minuto',
  },
];

export const TASK_SUGGESTIONS: TaskSuggestion[] = [
  { id: 'clean-room', label: '🧹 Limpiar mi habitación', text: 'Limpiar mi habitación' },
  { id: 'walk-dog', label: '🐕 Pasear al perro', text: 'Pasear al perro' },
  { id: 'make-omelette', label: '🍳 Hacer un omelette', text: 'Hacer un omelette' },
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
