-- Limpiar todas las rutinas del usuario autenticado
-- Las políticas CASCADE se encargarán de borrar tasks, completions, etc.

DELETE FROM routines 
WHERE deleted_at IS NULL;
