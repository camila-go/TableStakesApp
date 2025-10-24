-- Leadership Conference Trivia App Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players Table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_score INTEGER DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast player lookups
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_total_score ON players(total_score DESC);

-- Daily Scores Table
CREATE TABLE daily_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  day INTEGER CHECK (day >= 1 AND day <= 5),
  score INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, day)
);

-- Index for fast leaderboard queries
CREATE INDEX idx_daily_scores_day_score ON daily_scores(day, score DESC);
CREATE INDEX idx_daily_scores_player ON daily_scores(player_id);

-- Answers Table (for detailed tracking)
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  day INTEGER CHECK (day >= 1 AND day <= 5),
  answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken INTEGER, -- milliseconds
  points_earned INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast answer lookups
CREATE INDEX idx_answers_player_day ON answers(player_id, day);
CREATE INDEX idx_answers_question ON answers(question_id);

-- Games Table (for room management)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code TEXT UNIQUE NOT NULL,
  day INTEGER CHECK (day >= 1 AND day <= 5),
  status TEXT DEFAULT 'waiting', -- waiting, active, finished
  current_question INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 10,
  time_per_question INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Index for room code lookups
CREATE INDEX idx_games_room_code ON games(room_code);
CREATE INDEX idx_games_status ON games(status);

-- Questions Table
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  day INTEGER CHECK (day >= 1 AND day <= 5),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  points INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for question lookups
CREATE INDEX idx_questions_day ON questions(day);

-- Materialized View for Fast Leaderboard (refresh periodically)
CREATE MATERIALIZED VIEW leaderboard_cache AS
SELECT 
  p.id,
  p.name,
  p.total_score,
  ROW_NUMBER() OVER (ORDER BY p.total_score DESC) as rank
FROM players p
ORDER BY p.total_score DESC;

CREATE INDEX idx_leaderboard_cache_rank ON leaderboard_cache(rank);

-- Function to refresh leaderboard (call after each question)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
END;
$$ LANGUAGE plpgsql;

-- Function to update player total score
CREATE OR REPLACE FUNCTION update_player_total_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE players 
  SET total_score = (
    SELECT COALESCE(SUM(score), 0) 
    FROM daily_scores 
    WHERE player_id = NEW.player_id
  )
  WHERE id = NEW.player_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update total score when daily score changes
CREATE TRIGGER trigger_update_total_score
  AFTER INSERT OR UPDATE ON daily_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_player_total_score();

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read leaderboards and games
CREATE POLICY "Public read access players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read access daily_scores" ON daily_scores FOR SELECT USING (true);
CREATE POLICY "Public read access games" ON games FOR SELECT USING (true);
CREATE POLICY "Public read access questions" ON questions FOR SELECT USING (true);

-- Policies: Anyone can insert players and answers (for anonymous play)
CREATE POLICY "Public insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert answers" ON answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert daily_scores" ON daily_scores FOR INSERT WITH CHECK (true);

-- Policies: Anyone can update games (for host control)
CREATE POLICY "Public update games" ON games FOR UPDATE USING (true);
CREATE POLICY "Public insert games" ON games FOR INSERT WITH CHECK (true);

-- Sample questions for Day 1
INSERT INTO questions (day, question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES
(1, 'What is the most important quality of a leader?', 'Charisma', 'Integrity', 'Intelligence', 'Confidence', 'B', 10),
(1, 'Which leadership style focuses on empowering team members?', 'Autocratic', 'Democratic', 'Laissez-faire', 'Transformational', 'B', 10),
(1, 'What does "lead by example" mean?', 'Give orders from above', 'Show the behavior you want to see', 'Work harder than everyone', 'Take all the credit', 'B', 10),
(1, 'Which is NOT a key communication skill for leaders?', 'Active listening', 'Clear messaging', 'Interrupting others', 'Empathy', 'C', 10),
(1, 'What is emotional intelligence in leadership?', 'Being emotional', 'Understanding and managing emotions', 'Crying at work', 'Being sensitive', 'B', 10);

-- Sample questions for Day 2
INSERT INTO questions (day, question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES
(2, 'What is the primary goal of team building?', 'Making friends', 'Improving collaboration', 'Having fun', 'Avoiding work', 'B', 10),
(2, 'Which conflict resolution approach is most effective?', 'Avoiding the conflict', 'Finding win-win solutions', 'Letting the boss decide', 'Ignoring the problem', 'B', 10),
(2, 'What does "psychological safety" mean in teams?', 'Physical safety', 'Feeling safe to speak up', 'Job security', 'Insurance coverage', 'B', 10),
(2, 'Which is a sign of effective delegation?', 'Doing everything yourself', 'Giving clear instructions and support', 'Micromanaging', 'Avoiding responsibility', 'B', 10),
(2, 'What is the purpose of regular team meetings?', 'Filling time', 'Alignment and communication', 'Socializing', 'Avoiding work', 'B', 10);

-- Sample questions for Day 3
INSERT INTO questions (day, question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES
(3, 'What is strategic thinking?', 'Thinking about strategy games', 'Long-term planning and vision', 'Quick decisions', 'Avoiding planning', 'B', 10),
(3, 'Which is NOT a characteristic of effective goal setting?', 'Specific', 'Measurable', 'Vague', 'Time-bound', 'C', 10),
(3, 'What does "stakeholder management" involve?', 'Managing wooden stakes', 'Understanding and managing relationships', 'Avoiding people', 'Only managing employees', 'B', 10),
(3, 'Which leadership approach adapts to different situations?', 'One-size-fits-all', 'Situational leadership', 'Rigid rules', 'No leadership', 'B', 10),
(3, 'What is the importance of feedback in leadership?', 'Criticizing people', 'Continuous improvement', 'Making people feel bad', 'Avoiding communication', 'B', 10);

-- Sample questions for Day 4
INSERT INTO questions (day, question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES
(4, 'What is change management?', 'Managing money', 'Guiding people through transitions', 'Avoiding change', 'Forcing change', 'B', 10),
(4, 'Which is a key principle of innovation leadership?', 'Avoiding new ideas', 'Encouraging creativity and experimentation', 'Sticking to old ways', 'Rejecting change', 'B', 10),
(4, 'What does "servant leadership" emphasize?', 'Being served', 'Serving others first', 'Avoiding responsibility', 'Being passive', 'B', 10),
(4, 'Which is important for building trust?', 'Keeping secrets', 'Consistency and transparency', 'Avoiding communication', 'Being unpredictable', 'B', 10),
(4, 'What is the role of a leader in crisis management?', 'Panicking', 'Providing calm direction', 'Avoiding responsibility', 'Hiding', 'B', 10);

-- Sample questions for Day 5
INSERT INTO questions (day, question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES
(5, 'What is the ultimate goal of leadership development?', 'Getting promoted', 'Creating positive impact', 'Making money', 'Having power', 'B', 10),
(5, 'Which quality helps leaders inspire others?', 'Intimidation', 'Authenticity and vision', 'Secrecy', 'Rigidity', 'B', 10),
(5, 'What does "leading with purpose" mean?', 'Having a job title', 'Connecting work to meaningful goals', 'Avoiding goals', 'Being aimless', 'B', 10),
(5, 'Which is essential for sustainable leadership?', 'Short-term thinking', 'Long-term vision and values', 'Avoiding planning', 'Being reactive', 'B', 10),
(5, 'What is the legacy of great leadership?', 'Personal success', 'Empowering others to succeed', 'Accumulating wealth', 'Avoiding responsibility', 'B', 10);
