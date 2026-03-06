/**
 * Routine Service
 * Handles all interactions with Supabase for routines, tasks, and completions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
    CompletionHistory,
    LegacyRoutine,
    NewRoutine,
    Routine,
    RoutineWithTasks,
    UpdateRoutine
} from '../types/routine';
import { supabase } from './supabase';

// =====================================================
// CONSTANTS
// =====================================================

const MIGRATION_FLAG = '@smartlist_migrated_to_supabase';
const LEGACY_ROUTINES_KEY = '@smartlist_routines';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Transform database rows into Routine objects
 */
function transformRoutineWithTasks(routine: RoutineWithTasks): Routine {
  return {
    id: routine.id,
    user_id: routine.user_id,
    name: routine.name,
    days: routine.days,
    icon: routine.icon,
    reminderEnabled: routine.reminder_enabled,
    reminderTime: routine.reminder_time || undefined,
    tasks: routine.tasks
      .sort((a, b) => a.position - b.position)
      .map((task) => ({
        id: task.id,
        title: task.title,
        position: task.position,
        completed: false, // Will be set separately when loading today's completions
      })),
    created_at: routine.created_at,
    updated_at: routine.updated_at,
    deleted_at: routine.deleted_at,
  };
}

// =====================================================
// FETCH ROUTINES
// =====================================================

/**
 * Fetch all active routines for a user with their tasks
 */
export async function fetchRoutines(userId: string): Promise<Routine[]> {
  try {
    const { data: routines, error } = await supabase
      .from('routines')
      .select(`
        *,
        tasks:routine_tasks(*)
      `)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching routines:', error);
      throw error;
    }

    if (!routines || routines.length === 0) {
      return [];
    }

    // Transform to Routine type
    const transformedRoutines = routines.map(transformRoutineWithTasks);

    // Load today's task completions
    return await loadTodayCompletions(transformedRoutines, userId);
  } catch (error) {
    console.error('fetchRoutines error:', error);
    return [];
  }
}

/**
 * Load today's task completions and mark tasks as completed
 */
async function loadTodayCompletions(
  routines: Routine[],
  userId: string
): Promise<Routine[]> {
  const today = getCurrentDate();

  try {
    const { data: completions, error } = await supabase
      .from('task_completions')
      .select('task_id')
      .eq('user_id', userId)
      .eq('date', today);

    if (error) {
      console.error('Error loading today completions:', error);
      return routines;
    }

    const completedTaskIds = new Set(completions?.map((c) => c.task_id) || []);

    // Mark tasks as completed
    return routines.map((routine) => ({
      ...routine,
      tasks: routine.tasks.map((task) => ({
        ...task,
        completed: completedTaskIds.has(task.id),
      })),
    }));
  } catch (error) {
    console.error('loadTodayCompletions error:', error);
    return routines;
  }
}

// =====================================================
// CREATE ROUTINE
// =====================================================

/**
 * Create a new routine with tasks
 */
export async function createRoutine(
  userId: string,
  routine: NewRoutine
): Promise<Routine | null> {
  try {
    // Insert routine
    const { data: newRoutine, error: routineError } = await supabase
      .from('routines')
      .insert({
        user_id: userId,
        name: routine.name,
        days: routine.days,
        icon: routine.icon || 'Circle',
        reminder_enabled: routine.reminderEnabled || false,
        reminder_time: routine.reminderTime || null,
      })
      .select()
      .single();

    if (routineError || !newRoutine) {
      console.error('Error creating routine:', routineError);
      throw routineError;
    }

    // Insert tasks
    if (routine.tasks.length > 0) {
      const tasksToInsert = routine.tasks.map((task, index) => ({
        routine_id: newRoutine.id,
        title: task.title,
        position: task.position ?? index,
      }));

      const { data: tasks, error: tasksError } = await supabase
        .from('routine_tasks')
        .insert(tasksToInsert)
        .select();

      if (tasksError) {
        console.error('Error creating tasks:', tasksError);
        // Rollback: delete routine
        await supabase.from('routines').delete().eq('id', newRoutine.id);
        throw tasksError;
      }

      return transformRoutineWithTasks({ ...newRoutine, tasks: tasks || [] });
    }

    return transformRoutineWithTasks({ ...newRoutine, tasks: [] });
  } catch (error) {
    console.error('createRoutine error:', error);
    return null;
  }
}

// =====================================================
// UPDATE ROUTINE
// =====================================================

/**
 * Update an existing routine
 */
export async function updateRoutine(
  routineId: string,
  userId: string,
  updates: UpdateRoutine
): Promise<Routine | null> {
  try {
    // Prepare update object
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.days !== undefined) updateData.days = updates.days;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.reminderEnabled !== undefined)
      updateData.reminder_enabled = updates.reminderEnabled;
    if (updates.reminderTime !== undefined)
      updateData.reminder_time = updates.reminderTime;

    // Update routine
    const { data: updatedRoutine, error: routineError } = await supabase
      .from('routines')
      .update(updateData)
      .eq('id', routineId)
      .eq('user_id', userId)
      .select()
      .single();

    if (routineError || !updatedRoutine) {
      console.error('Error updating routine:', routineError);
      throw routineError;
    }

    // Update tasks if provided
    if (updates.tasks) {
      // Delete existing tasks
      await supabase.from('routine_tasks').delete().eq('routine_id', routineId);

      // Insert new tasks
      if (updates.tasks.length > 0) {
        const tasksToInsert = updates.tasks.map((task, index) => ({
          routine_id: routineId,
          title: task.title,
          position: task.position ?? index,
        }));

        const { error: tasksError } = await supabase
          .from('routine_tasks')
          .insert(tasksToInsert);

        if (tasksError) {
          console.error('Error updating tasks:', tasksError);
          throw tasksError;
        }
      }
    }

    // Fetch updated routine with tasks
    const { data: fullRoutine } = await supabase
      .from('routines')
      .select('*, tasks:routine_tasks(*)')
      .eq('id', routineId)
      .single();

    if (!fullRoutine) return null;

    return transformRoutineWithTasks(fullRoutine);
  } catch (error) {
    console.error('updateRoutine error:', error);
    return null;
  }
}

// =====================================================
// DELETE ROUTINE
// =====================================================

/**
 * Delete a routine (hard delete)
 */
export async function deleteRoutine(routineId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error deleting routine:', error);
      return false;
    }

    if (!data || data.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('deleteRoutine error:', error);
    return false;
  }
}

// =====================================================
// TASK COMPLETIONS
// =====================================================

/**
 * Mark a task as completed or uncompleted for today
 */
export async function updateTaskCompletion(
  taskId: string,
  routineId: string,
  userId: string,
  completed: boolean
): Promise<boolean> {
  const date = getCurrentDate();

  try {
    if (completed) {
      // Insert completion
      const { error } = await supabase.from('task_completions').insert({
        task_id: taskId,
        routine_id: routineId,
        user_id: userId,
        date,
      });

      if (error && error.code !== '23505') {
        // Ignore duplicate key errors
        console.error('Error marking task complete:', error);
        return false;
      }
    } else {
      // Delete completion
      const { error } = await supabase
        .from('task_completions')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .eq('date', date);

      if (error) {
        console.error('Error unmarking task:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('updateTaskCompletion error:', error);
    return false;
  }
}

/**
 * Check if all tasks are completed for a routine today
 */
export async function checkRoutineFullyCompleted(
  routineId: string,
  userId: string
): Promise<boolean> {
  const date = getCurrentDate();

  try {
    // Get total tasks
    const { count: totalTasks } = await supabase
      .from('routine_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('routine_id', routineId);

    // Get completed tasks
    const { count: completedTasks } = await supabase
      .from('task_completions')
      .select('*', { count: 'exact', head: true })
      .eq('routine_id', routineId)
      .eq('user_id', userId)
      .eq('date', date);

    return totalTasks === completedTasks && totalTasks! > 0;
  } catch (error) {
    console.error('checkRoutineFullyCompleted error:', error);
    return false;
  }
}

// =====================================================
// ROUTINE COMPLETIONS
// =====================================================

/**
 * Mark an entire routine as completed for a specific date
 */
export async function markRoutineComplete(
  routineId: string,
  userId: string,
  date?: string
): Promise<boolean> {
  const completionDate = date || getCurrentDate();

  try {
    const { error } = await supabase.from('routine_completions').insert({
      routine_id: routineId,
      user_id: userId,
      date: completionDate,
    });

    if (error && error.code !== '23505') {
      // Ignore duplicate key errors
      console.error('Error marking routine complete:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('markRoutineComplete error:', error);
    return false;
  }
}

/**
 * Unmark a routine as completed
 */
export async function unmarkRoutineComplete(
  routineId: string,
  userId: string,
  date?: string
): Promise<boolean> {
  const completionDate = date || getCurrentDate();

  try {
    const { error } = await supabase
      .from('routine_completions')
      .delete()
      .eq('routine_id', routineId)
      .eq('user_id', userId)
      .eq('date', completionDate);

    if (error) {
      console.error('Error unmarking routine:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('unmarkRoutineComplete error:', error);
    return false;
  }
}

// =====================================================
// COMPLETION HISTORY
// =====================================================

/**
 * Fetch completion history for a routine for a specific month
 * Returns: { "2026-03-06": true, "2026-03-05": false, ... }
 */
export async function fetchCompletionHistory(
  routineId: string,
  userId: string,
  year: number,
  month: number // 0-indexed (0 = January)
): Promise<CompletionHistory> {
  try {
    // Get first and last day of month
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data: completions, error } = await supabase
      .from('routine_completions')
      .select('date')
      .eq('routine_id', routineId)
      .eq('user_id', userId)
      .gte('date', firstDay)
      .lte('date', lastDay);

    if (error) {
      console.error('Error fetching completion history:', error);
      return {};
    }

    // Transform to { date: true } format
    const history: CompletionHistory = {};
    completions?.forEach((completion) => {
      history[completion.date] = true;
    });

    return history;
  } catch (error) {
    console.error('fetchCompletionHistory error:', error);
    return {};
  }
}

// =====================================================
// MIGRATION FROM ASYNCSTORAGE
// =====================================================

/**
 * Check if migration has already been done
 */
export async function isMigrationComplete(): Promise<boolean> {
  try {
    const flag = await AsyncStorage.getItem(MIGRATION_FLAG);
    return flag === 'true';
  } catch {
    return false;
  }
}

/**
 * Migrate routines from AsyncStorage to Supabase (one-time operation)
 */
export async function migrateFromAsyncStorage(userId: string): Promise<boolean> {
  try {
    // Check if already migrated
    const migrated = await isMigrationComplete();
    if (migrated) {
      return true;
    }

    // Check if there are existing routines in Supabase
    const existingRoutines = await fetchRoutines(userId);
    if (existingRoutines.length > 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
      return true;
    }

    // Get routines from AsyncStorage
    const stored = await AsyncStorage.getItem(LEGACY_ROUTINES_KEY);
    if (!stored) {
      await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
      return true;
    }

    const legacyRoutines: LegacyRoutine[] = JSON.parse(stored);
    if (!legacyRoutines || legacyRoutines.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
      return true;
    }

    // Migrate each routine
    for (const legacy of legacyRoutines) {
      const newRoutine: NewRoutine = {
        name: legacy.name,
        days: legacy.days,
        tasks: legacy.tasks.map((t, index) => ({
          title: t.title,
          position: index,
        })),
        icon: legacy.icon || 'Circle',
        reminderEnabled: legacy.reminderEnabled,
        reminderTime: legacy.reminderTime,
      };

      await createRoutine(userId, newRoutine);
    }

    // Mark migration as complete
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');

    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

/**
 * Force reset migration flag (for testing)
 */
export async function resetMigrationFlag(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATION_FLAG);
}
