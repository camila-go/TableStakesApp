-- Complete fix for questions table RLS and columns
-- Run this entire script in Supabase SQL Editor

-- Step 1: Add missing columns if they don't exist
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS options JSONB;

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS question TEXT;

-- Step 2: Update existing data to populate new columns
UPDATE questions 
SET 
  options = jsonb_build_array(option_a, option_b, option_c, option_d),
  question = question_text
WHERE options IS NULL;

-- Step 3: Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public insert access to questions" ON questions;
DROP POLICY IF EXISTS "Enable insert for all users" ON questions;
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;

-- Step 4: Create new permissive policies
CREATE POLICY "Enable read access for all users"
ON questions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Enable insert for all users"
ON questions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for all users"
ON questions FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all users"
ON questions FOR DELETE
TO anon, authenticated
USING (true);

-- Step 5: Make sure RLS is enabled
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Verify the setup
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'questions';


