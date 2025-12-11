import { useTaskStore } from '@/src/store/taskStore';

/**
 * Helper para testing: Carga secuencia de tareas "Preparar la Cena"
 * 
 * Propósito: Probar satisfacción de usuario (dopamina) al completar
 * una secuencia lógica de 5 pasos con feedback visual/táctil.
 * 
 * Uso: Llamar en desarrollo para poblar la lista con datos de prueba.
 */
export function loadDinnerTasks() {
  const dinnerTasks = [
    {
      id: 'dinner-1',
      title: 'Mise en place: Todo listo',
      completed: false,
      duration: 5,
      createdAt: new Date(),
    },
    {
      id: 'dinner-2',
      title: 'Corte: Vegetales en cubos',
      completed: false,
      duration: 10,
      createdAt: new Date(),
    },
    {
      id: 'dinner-3',
      title: 'Sellar: Dorar proteína',
      completed: false,
      duration: 8,
      createdAt: new Date(),
    },
    {
      id: 'dinner-4',
      title: 'Sazón: Ajustar sal y probar',
      completed: false,
      duration: 3,
      createdAt: new Date(),
    },
    {
      id: 'dinner-5',
      title: 'Emplatado: Servir y limpiar',
      completed: false,
      duration: 5,
      createdAt: new Date(),
    },
  ];

  // Inyectar directamente al store
  const state = useTaskStore.getState();
  
  // Agregar cada tarea de la secuencia
  dinnerTasks.forEach((task) => {
    state.addTask({
      title: task.title,
      completed: task.completed,
      duration: task.duration,
    });
  });

  console.log('✅ Secuencia "Preparar la Cena" cargada (5 pasos)');
  console.log('Prueba las animaciones y vibraciones completando cada tarea en orden.');
}

/**
 * Helper adicional: Limpiar todas las tareas
 */
export function clearAllTasks() {
  const state = useTaskStore.getState();
  const taskIds = state.tasks.map((t) => t.id);
  taskIds.forEach((id) => state.deleteTask(id));
  console.log('🗑️ Todas las tareas eliminadas');
}
