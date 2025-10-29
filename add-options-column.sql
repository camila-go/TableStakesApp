-- Add options column to questions table for easier JSON storage
-- This allows storing answer options as a JSON array

-- Add the options column as JSONB array
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS options JSONB;

-- Also rename question_text to just "question" for consistency
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS question TEXT;

-- Update existing questions to populate new columns from old format
UPDATE questions 
SET 
  options = jsonb_build_array(option_a, option_b, option_c, option_d),
  question = question_text
WHERE options IS NULL;

-- Now make the new columns required for future inserts
-- (keeping old columns for backward compatibility)

