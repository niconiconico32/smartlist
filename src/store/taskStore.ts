import { create } from 'zustand';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  duration: number; // Minutos estimados
}

interface TaskStore {
  tasks: Task[];
  activeTaskId: string | null;
  // Focus Mode
  isFocusModeActive: boolean;
  activeTaskIndex: number;
  focusSessionTasks: string[]; // IDs de tareas en la sesión
  
  // Task Actions
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  setActiveTask: (id: string | null) => void;
  
  // Focus Mode Actions
  startFocusSession: (taskIds: string[]) => void;
  completeCurrentTask: () => void;
  exitFocusMode: () => void;
  skipToNextTask: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  activeTaskId: null,
  isFocusModeActive: false,
  activeTaskIndex: 0,
  focusSessionTasks: [],
  
  addTask: (task) =>
    set((state) => ({
      tasks: [
        ...state.tasks,
        { ...task, id: Math.random().toString(), createdAt: new Date() },
      ],
    })),
    
  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      ),
    })),
    
  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),
    
  setActiveTask: (id) =>
    set({ activeTaskId: id }),
    
  // Iniciar sesión Focus con IDs de tareas
  startFocusSession: (taskIds) =>
    set({
      isFocusModeActive: true,
      activeTaskIndex: 0,
      focusSessionTasks: taskIds,
    }),
    
  // Completar tarea actual y avanzar
  completeCurrentTask: () => {
    const state = get();
    const currentTaskId = state.focusSessionTasks[state.activeTaskIndex];
    
    if (!currentTaskId) return;
    
    // Marcar como completada
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === currentTaskId ? { ...task, completed: true } : task
      ),
    }));
    
    // Avanzar al siguiente o terminar sesión
    const isLastTask = state.activeTaskIndex >= state.focusSessionTasks.length - 1;
    
    if (isLastTask) {
      // Terminar sesión automáticamente
      set({
        isFocusModeActive: false,
        activeTaskIndex: 0,
        focusSessionTasks: [],
      });
    } else {
      // Avanzar al siguiente
      set({ activeTaskIndex: state.activeTaskIndex + 1 });
    }
  },
  
  // Saltar a la siguiente tarea sin completar
  skipToNextTask: () =>
    set((state) => {
      const isLastTask = state.activeTaskIndex >= state.focusSessionTasks.length - 1;
      if (isLastTask) {
        return {
          isFocusModeActive: false,
          activeTaskIndex: 0,
          focusSessionTasks: [],
        };
      }
      return { activeTaskIndex: state.activeTaskIndex + 1 };
    }),
    
  // Salir manualmente del modo Focus
  exitFocusMode: () =>
    set({
      isFocusModeActive: false,
      activeTaskIndex: 0,
      focusSessionTasks: [],
    }),
}));
