-- =====================================================
-- SMARTLIST ROUTINES DATABASE SCHEMA
-- Created: 2026-03-06
-- Purpose: Store user routines, tasks, and completions
-- =====================================================

-- =====================================================
-- TABLE: routines
-- Purpose: Store user routine definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days TEXT[] NOT NULL DEFAULT '{}',
  icon TEXT DEFAULT 'Circle',
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT routines_name_not_empty CHECK (LENGTH(name) > 0),
  CONSTRAINT routines_reminder_time_format CHECK (
    reminder_time IS NULL OR 
    reminder_time ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]$'
  )
);

-- Indices for routines
CREATE INDEX idx_routines_user_id ON routines(user_id);
CREATE INDEX idx_routines_deleted_at ON routines(deleted_at);
CREATE INDEX idx_routines_user_active ON routines(user_id, deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- TABLE: routine_tasks
-- Purpose: Store tasks that belong to routines
-- =====================================================
CREATE TABLE IF NOT EXISTS routine_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT routine_tasks_title_not_empty CHECK (LENGTH(title) > 0)
);

-- Indices for routine_tasks
CREATE INDEX idx_routine_tasks_routine_id ON routine_tasks(routine_id);
CREATE INDEX idx_routine_tasks_routine_position ON routine_tasks(routine_id, position);

-- =====================================================
-- TABLE: routine_completions
-- Purpose: Track which routines were completed on which dates
-- =====================================================
CREATE TABLE IF NOT EXISTS routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT routine_completions_unique_per_day UNIQUE (routine_id, user_id, date)
);

-- Indices for routine_completions
CREATE INDEX idx_routine_completions_routine_date ON routine_completions(routine_id, date);
CREATE INDEX idx_routine_completions_user_date ON routine_completions(user_id, date);

-- =====================================================
-- TABLE: task_completions
-- Purpose: Track individual task completions per day
-- =====================================================
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES routine_tasks(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT task_completions_unique_per_day UNIQUE (task_id, user_id, date)
);

-- Indices for task_completions
CREATE INDEX idx_task_completions_task_date ON task_completions(task_id, date);
CREATE INDEX idx_task_completions_routine_user_date ON task_completions(routine_id, user_id, date);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES: routines
-- =====================================================

-- Users can view their own active routines
CREATE POLICY "Users can view own routines"
  ON routines FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can insert their own routines
CREATE POLICY "Users can insert own routines"
  ON routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own routines
CREATE POLICY "Users can update own routines"
  ON routines FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can soft-delete their own routines
CREATE POLICY "Users can delete own routines"
  ON routines FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: routine_tasks
-- =====================================================

-- Users can view tasks of their own routines
CREATE POLICY "Users can view tasks of own routines"
  ON routine_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routines 
      WHERE routines.id = routine_tasks.routine_id 
      AND routines.user_id = auth.uid()
      AND routines.deleted_at IS NULL
    )
  );

-- Users can insert tasks to their own routines
CREATE POLICY "Users can insert tasks to own routines"
  ON routine_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routines 
      WHERE routines.id = routine_tasks.routine_id 
      AND routines.user_id = auth.uid()
    )
  );

-- Users can update tasks of their own routines
CREATE POLICY "Users can update tasks of own routines"
  ON routine_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM routines 
      WHERE routines.id = routine_tasks.routine_id 
      AND routines.user_id = auth.uid()
    )
  );

-- Users can delete tasks of their own routines
CREATE POLICY "Users can delete tasks of own routines"
  ON routine_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM routines 
      WHERE routines.id = routine_tasks.routine_id 
      AND routines.user_id = auth.uid()
    )
  );

-- =====================================================
-- POLICIES: routine_completions
-- =====================================================

-- Users can view their own routine completions
CREATE POLICY "Users can view own routine completions"
  ON routine_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own routine completions
CREATE POLICY "Users can insert own routine completions"
  ON routine_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own routine completions
CREATE POLICY "Users can delete own routine completions"
  ON routine_completions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- POLICIES: task_completions
-- =====================================================

-- Users can view their own task completions
CREATE POLICY "Users can view own task completions"
  ON task_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own task completions
CREATE POLICY "Users can insert own task completions"
  ON task_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own task completions
CREATE POLICY "Users can delete own task completions"
  ON task_completions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on routines
CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPFUL VIEWS (Optional, for analytics)
-- =====================================================

-- View: Daily routine progress
CREATE OR REPLACE VIEW daily_routine_progress AS
SELECT 
  r.id as routine_id,
  r.user_id,
  r.name,
  tc.date,
  COUNT(DISTINCT rt.id) as total_tasks,
  COUNT(DISTINCT tc.task_id) as completed_tasks,
  ROUND(
    (COUNT(DISTINCT tc.task_id)::DECIMAL / NULLIF(COUNT(DISTINCT rt.id), 0)) * 100, 
    2
  ) as completion_percentage
FROM routines r
LEFT JOIN routine_tasks rt ON rt.routine_id = r.id
LEFT JOIN task_completions tc ON tc.routine_id = r.id AND tc.date = CURRENT_DATE
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.user_id, r.name, tc.date;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE routines IS 'User-created routines with scheduled days';
COMMENT ON TABLE routine_tasks IS 'Individual tasks that belong to routines';
COMMENT ON TABLE routine_completions IS 'Records of fully completed routines by date';
COMMENT ON TABLE task_completions IS 'Records of individual task completions by date';

COMMENT ON COLUMN routines.days IS 'Array of day abbreviations: [''Lun'', ''Mar'', ''Mié'', ''Jue'', ''Vie'', ''Sáb'', ''Dom'']';
COMMENT ON COLUMN routines.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN routine_tasks.position IS 'Order position for displaying tasks in UI';
