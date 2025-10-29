-- Fix the correct_answer constraint to allow both formats
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE questions 
DROP CONSTRAINT IF EXISTS questions_correct_answer_check;

-- Add columns if they don't exist
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS options JSONB;

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS question TEXT;

-- Add a new constraint that allows both INTEGER (0-3) and TEXT ('A'-'D')
ALTER TABLE questions
ADD CONSTRAINT questions_correct_answer_check 
CHECK (
  (correct_answer::text IN ('0', '1', '2', '3', 'A', 'B', 'C', 'D'))
  OR 
  (correct_answer::integer BETWEEN 0 AND 3)
);

-- Update existing data
UPDATE questions 
SET 
  options = jsonb_build_array(option_a, option_b, option_c, option_d),
  question = question_text
WHERE options IS NULL;

