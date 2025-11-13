-- Fix RLS policies for daily_scores and players tables to allow updates
-- This is needed for updating scores when players answer multiple questions

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public update daily_scores" ON daily_scores;
DROP POLICY IF EXISTS "Public update players" ON players;

-- Add UPDATE policy for daily_scores (CRITICAL - was missing!)
CREATE POLICY "Public update daily_scores" ON daily_scores 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- Add UPDATE policy for players (needed for score updates)
CREATE POLICY "Public update players" ON players 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- Verify the policies are created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('daily_scores', 'players') 
ORDER BY tablename, policyname;

