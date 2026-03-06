/**
 * Type definitions for Routines System
 * Matches Supabase database schema
 */

// =====================================================
// CORE TYPES
// =====================================================

export interface RoutineTask {
  id: string;
  title: string;
  completed?: boolean; // Client-side state, not persisted in routine_tasks
  position?: number;
}

export interface Routine {
  id: string;
  user_id?: string;
  name: string;
  days: string[]; // ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  tasks: RoutineTask[];
  icon?: string;
  reminderEnabled: boolean;
  reminderTime?: string; // Format: "HH:MM"
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// =====================================================
// DATABASE ROW TYPES (from Supabase)
// =====================================================

export interface RoutineRow {
  id: string;
  user_id: string;
  name: string;
  days: string[];
  icon: string;
  reminder_enabled: boolean;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RoutineTaskRow {
  id: string;
  routine_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface RoutineCompletionRow {
  id: string;
  routine_id: string;
  user_id: string;
  date: string; // Format: "YYYY-MM-DD"
  completed_at: string;
}

export interface TaskCompletionRow {
  id: string;
  task_id: string;
  routine_id: string;
  user_id: string;
  date: string; // Format: "YYYY-MM-DD"
  completed_at: string;
}

// =====================================================
// INPUT TYPES (for creating/updating)
// =====================================================

export interface NewRoutine {
  name: string;
  days: string[];
  tasks: Array<{ title: string; position?: number }>;
  icon?: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
}

export interface UpdateRoutine {
  name?: string;
  days?: string[];
  tasks?: RoutineTask[];
  icon?: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
}

// =====================================================
// COMPLETION HISTORY TYPES
// =====================================================

export interface CompletionHistory {
  [date: string]: boolean; // e.g., { "2026-03-06": true, "2026-03-05": false }
}

export interface DailyProgress {
  date: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  isFullyCompleted: boolean;
}

// =====================================================
// SERVICE RESPONSE TYPES
// =====================================================

export interface RoutineWithTasks extends RoutineRow {
  tasks: RoutineTaskRow[];
}

export interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

// =====================================================
// LEGACY TYPES (for migration from AsyncStorage)
// =====================================================

export interface LegacyRoutine {
  id: string;
  name: string;
  days: string[];
  tasks: Array<{ id: string; title: string; completed?: boolean }>;
  reminderEnabled: boolean;
  reminderTime?: string;
  icon?: string;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type DayAbbreviation = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

export const DAY_ABBREVIATIONS: DayAbbreviation[] = [
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
  'Dom',
];

export const DAY_NUMBER_TO_ABBREV: Record<number, DayAbbreviation> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};
