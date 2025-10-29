-- Fix RLS policies for questions table to allow inserts

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public insert access to questions" ON questions;

-- Recreate policies with insert permission
CREATE POLICY "Allow public read access to questions"
ON questions FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert access to questions"
ON questions FOR INSERT
TO public
WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

