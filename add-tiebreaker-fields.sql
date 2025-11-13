-- Add tiebreaker fields to daily_scores table
-- These fields help determine ranking when players have the same score

-- Add total time taken field (sum of all answer times in seconds)
ALTER TABLE daily_scores 
ADD COLUMN IF NOT EXISTS total_time_taken INTEGER DEFAULT 0;

-- Add correct answers count field
ALTER TABLE daily_scores 
ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0;

-- Create index for faster leaderboard queries with tiebreakers
DROP INDEX IF EXISTS idx_daily_scores_day_score;
CREATE INDEX idx_daily_scores_day_score_tiebreaker 
  ON daily_scores(day, score DESC, total_time_taken ASC, correct_answers DESC, created_at ASC);

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'daily_scores' 
  AND column_name IN ('total_time_taken', 'correct_answers')
ORDER BY column_name;

