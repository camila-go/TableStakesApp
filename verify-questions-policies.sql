-- Verify and add all necessary policies for questions table

-- Check existing policies (run this first to see what you have)
SELECT * FROM pg_policies WHERE tablename = 'questions';

-- If you need to add UPDATE and DELETE policies:
CREATE POLICY IF NOT EXISTS "Allow public update access to questions"
ON questions FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow public delete access to questions"
ON questions FOR DELETE
TO public
USING (true);

-- Verify RLS is enabled
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

