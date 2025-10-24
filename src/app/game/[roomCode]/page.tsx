'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Trophy, Users, Clock, CheckCircle, XCircle, Home } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  email?: string;
  total_score: number;
}

interface Game {
  id: string;
  room_code: string;
  status: string;
  current_question: number;
  total_questions: number;
}

interface Question {
  id: number;
  day: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  points: number;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load player data and initialize game
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true);
        
        // Get player data from session storage
        const currentGameData = sessionStorage.getItem('currentGame');
        if (!currentGameData) {
          router.push('/');
          return;
        }
        
        const { playerId } = JSON.parse(currentGameData);
        
        // Get player from database
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();
          
        if (playerError) throw playerError;
        setPlayer(playerData);
        
        // Check if game exists, create if not
        let { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('room_code', roomCode)
          .single();
          
        if (gameError && gameError.code === 'PGRST116') {
          // Game doesn't exist, create it using upsert to handle race conditions
          const { data: newGame, error: createError } = await supabase
            .from('games')
            .upsert({
              room_code: roomCode,
              status: 'waiting',
              current_question: 0,
              total_questions: 5
            }, {
              onConflict: 'room_code'
            })
            .select()
            .single();
            
          if (createError) throw createError;
          gameData = newGame;
        } else if (gameError) {
          throw gameError;
        }
        
        setGame(gameData);
        setGameStatus(gameData.status as 'waiting' | 'playing' | 'finished');
        
        // Get current question if game is active
        if (gameData.status === 'playing' && gameData.current_question > 0) {
          const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .select('*')
            .eq('day', 1) // For now, use day 1 questions
            .eq('id', gameData.current_question)
            .single();
            
          if (!questionError && questionData) {
            setCurrentQuestion(questionData);
            setTimeRemaining(30);
          }
        }
        
      } catch (err) {
        console.error('Error initializing game:', err);
        console.error('Error details:', JSON.stringify(err, null, 2));
        setError(err.message || 'Failed to initialize game');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeGame();
  }, [roomCode, router]);

  // Handle answer submission
  const handleAnswerSubmit = async (answer: string) => {
    if (!player || !currentQuestion || answerSubmitted) return;
    
    try {
      setSelectedAnswer(answer);
      setAnswerSubmitted(true);
      
      const isCorrect = answer === currentQuestion.correct_answer;
      const pointsEarned = isCorrect ? currentQuestion.points : 0;
      
      // Record the answer
      await supabase
        .from('answers')
        .insert({
          player_id: player.id,
          question_id: currentQuestion.id,
          day: currentQuestion.day,
          answer: answer,
          is_correct: isCorrect,
          points_earned: pointsEarned
        });
      
      // Update player score
      if (isCorrect) {
        setScore(prev => prev + pointsEarned);
        
        // Update daily score
        const { data: dailyScore } = await supabase
          .from('daily_scores')
          .select('*')
          .eq('player_id', player.id)
          .eq('day', currentQuestion.day)
          .single();
          
        if (dailyScore) {
          await supabase
            .from('daily_scores')
            .update({ 
              score: dailyScore.score + pointsEarned,
              questions_answered: dailyScore.questions_answered + 1
            })
            .eq('id', dailyScore.id);
        } else {
          await supabase
            .from('daily_scores')
            .insert({
              player_id: player.id,
              day: currentQuestion.day,
              score: pointsEarned,
              questions_answered: 1
            });
        }
      }
      
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  };

  // Start game (for demo purposes)
  const startGame = async () => {
    if (!game) return;
    
    try {
      // Get first question
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('day', 1)
        .limit(1)
        .single();
        
      if (questionError) throw questionError;
      
      // Update game status
      await supabase
        .from('games')
        .update({ 
          status: 'playing',
          current_question: questionData.id
        })
        .eq('id', game.id);
        
      setCurrentQuestion(questionData);
      setGameStatus('playing');
      setTimeRemaining(30);
      
    } catch (err) {
      console.error('Error starting game:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Game Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Trophy className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Table Stakes</h1>
              <p className="text-sm text-gray-600">Room: {roomCode}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Player</p>
              <p className="font-semibold text-gray-900">{player?.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Score</p>
              <p className="font-semibold text-green-600">{score}</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Home className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Game Content */}
      <main className="max-w-4xl mx-auto p-4">
        {gameStatus === 'waiting' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8 text-center"
          >
            <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiting for Game to Start</h2>
            <p className="text-gray-600 mb-6">The host will start the game soon!</p>
            <button
              onClick={startGame}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Demo Game
            </button>
          </motion.div>
        )}

        {gameStatus === 'playing' && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8"
          >
            {/* Question Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <Clock className="w-6 h-6 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">
                  Question {game?.current_question || 1} of {game?.total_questions || 5}
                </span>
              </div>
              <div className="bg-blue-100 px-4 py-2 rounded-lg">
                <span className="text-blue-800 font-bold">{timeRemaining}s</span>
              </div>
            </div>

            {/* Question */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {[
                { key: 'A', text: currentQuestion.option_a },
                { key: 'B', text: currentQuestion.option_b },
                { key: 'C', text: currentQuestion.option_c },
                { key: 'D', text: currentQuestion.option_d }
              ].map((option) => (
                <motion.button
                  key={option.key}
                  onClick={() => handleAnswerSubmit(option.key)}
                  disabled={answerSubmitted}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    answerSubmitted
                      ? option.key === currentQuestion.correct_answer
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : selectedAnswer === option.key
                        ? 'border-red-500 bg-red-50 text-red-800'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-900'
                  }`}
                  whileHover={!answerSubmitted ? { scale: 1.02 } : {}}
                  whileTap={!answerSubmitted ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      answerSubmitted
                        ? option.key === currentQuestion.correct_answer
                          ? 'bg-green-500 text-white'
                          : selectedAnswer === option.key
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {option.key}
                    </div>
                    <span className="text-lg">{option.text}</span>
                    {answerSubmitted && option.key === currentQuestion.correct_answer && (
                      <CheckCircle className="w-6 h-6 text-green-500 ml-auto" />
                    )}
                    {answerSubmitted && selectedAnswer === option.key && option.key !== currentQuestion.correct_answer && (
                      <XCircle className="w-6 h-6 text-red-500 ml-auto" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Answer Feedback */}
            {answerSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-lg text-center ${
                  selectedAnswer === currentQuestion.correct_answer
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <h3 className={`text-xl font-bold mb-2 ${
                  selectedAnswer === currentQuestion.correct_answer
                    ? 'text-green-800'
                    : 'text-red-800'
                }`}>
                  {selectedAnswer === currentQuestion.correct_answer ? 'Correct!' : 'Incorrect'}
                </h3>
                <p className={`text-lg ${
                  selectedAnswer === currentQuestion.correct_answer
                    ? 'text-green-700'
                    : 'text-red-700'
                }`}>
                  {selectedAnswer === currentQuestion.correct_answer
                    ? `+${currentQuestion.points} points!`
                    : `The correct answer was ${currentQuestion.correct_answer}`
                  }
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {gameStatus === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8 text-center"
          >
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Game Finished!</h2>
            <p className="text-gray-600 mb-6">Great job playing!</p>
            <div className="bg-green-50 p-6 rounded-lg mb-6">
              <p className="text-green-800 font-bold text-xl">Final Score: {score}</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Play Again
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}