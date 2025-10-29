-- Add display_order column to questions table for custom ordering
-- Run this in your Supabase SQL Editor

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Set initial display_order based on existing questions
-- This will order questions by their creation date
UPDATE questions 
SET display_order = subquery.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY day ORDER BY created_at) as row_num
  FROM questions
) AS subquery
WHERE questions.id = subquery.id
AND questions.display_order IS NULL;

-- Create index for better performance when ordering questions
CREATE INDEX IF NOT EXISTS idx_questions_display_order ON questions(day, display_order);

-- Verify the update
SELECT day, id, question, question_text, display_order, created_at
FROM questions
ORDER BY day, display_order;

