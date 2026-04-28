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
  { id: 'finish_projects', label: '🚀 Terminar mis proyectos a tiempo' },
  { id: 'less_stress', label: '🧘 Vivir con menos estrés y ansiedad' },
  { id: 'lasting_routines', label: '📅 Crear rutinas que duren más de 3 días' },
  { id: 'feel_proud', label: '✨ Sentirme orgulloso/a al final del día' },
];

export const GOAL_OPTIONS: GoalOption[] = [
  { id: 'paralysis', emoji: '🧠', label: '🧠 Vencer la parálisis por análisis', color: colors.primary },
  { id: 'time', emoji: '⌜', label: '⌜ Mejorar mi noción del tiempo', color: colors.accent },
  { id: 'noise', emoji: '⚡', label: '⚡ Reducir el ruido mental', color: colors.success },
  { id: 'consistent', emoji: '✅', label: '✅ Ser más consistente', color: colors.primary },
  { id: 'anxiety', emoji: '🧘', label: '🧘 Bajar la ansiedad al empezar', color: colors.accent },
];

export const AGREEMENT_OPTIONS: SelectOption[] = [
  { id: 'strongly_agree', label: 'Totalmente', value: 'strongly_agree' },
  { id: 'somewhat_agree', label: 'Bastante', value: 'somewhat_agree' },
  { id: 'disagree', label: 'Un poco', value: 'disagree' },
  { id: 'strongly_disagree', label: 'Nada', value: 'strongly_disagree' },
];

export const STATEMENTS: StatementData[] = [
  {
    id: 1,
    textMain: '"a menudo sé exactamente lo que tengo que hacer, pero me siento ',
    textHighlight: 'físicamente incapaz de empezar"',
  },
  {
    id: 2,
    textMain: '"paso más tiempo preocupándome por una tarea que lo que ',
    textHighlight: 'realmente me tomaría completarla"',
  },
  {
    id: 3,
    textMain: '"suelo cometer errores cuando tengo que trabajar en un ',
    textHighlight: 'proyecto aburrido o difícil."',
  },
  {
    id: 4,
    textMain: '"suelo sentirme abrumado cuando tengo que hacer ',
    textHighlight: 'varias cosas a la vez"',
  },
  {
    id: 5,
    textMain: '"suelo posponer tareas que requieren mucha concentración, como pagar cuentas o ',
    textHighlight: 'hacer trámites"',
  },
  {
    id: 6,
    textMain: '"en casa, suelo saltar de una tarea a otra, ',
    textHighlight: 'dejando varias a medias"',
  },
  {
    id: 7,
    textMain: '"me distraigo fácilmente con mis pensamientos o cosas a mi alrededor cuando ',
    textHighlight: 'intento concentrarme"',
  },
];

export const TASK_SUGGESTIONS: TaskSuggestion[] = [
  { id: 'clean-room', label: '🧹 Limpiar mi habitación', text: 'Limpiar mi habitación' },
  { id: 'unpack-suitcase', label: '🧳 Desempacar la maleta', text: 'Desempacar la maleta' },
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
