'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';
import { Trophy, Users, Clock, CheckCircle, XCircle, Home, TrendingUp, Award } from 'lucide-react';

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
  day: number;
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
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);

  // Confetti celebration
  const celebrate = useCallback(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  }, []);

  // Fetch leaderboard - show all players who have played today
  const fetchLeaderboard = useCallback(async () => {
    if (!player || !game) return;
    
    // Get all players who have scores for this game's day
    const { data: dailyScoresData } = await supabase
      .from('daily_scores')
      .select('player_id, score')
      .eq('day', game.day)
      .order('score', { ascending: false });
    
    if (!dailyScoresData) return;
    
    // Get player details for those with daily scores
    const playerIds = dailyScoresData.map(ds => ds.player_id);
    if (playerIds.length === 0) return;
    
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .in('id', playerIds);
    
    if (playersData) {
      // Merge daily scores with player data
      const leaderboardData = playersData.map(p => {
        const dailyScore = dailyScoresData.find(ds => ds.player_id === p.id);
        return {
          ...p,
          daily_score: dailyScore?.score || 0
        };
      }).sort((a, b) => b.daily_score - a.daily_score).slice(0, 50);
      
      setLeaderboard(leaderboardData);
      const rank = leaderboardData.findIndex(p => p.id === player.id);
      setPlayerRank(rank >= 0 ? rank + 1 : null);
    }
  }, [player?.id, game?.day]); // Depend on player.id and game day

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
        setScore(playerData.total_score);
        
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
              total_questions: 5,
              day: 1
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
        
        // Fetch all questions for this day
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('day', gameData.day)
          .order('id')
          .limit(gameData.total_questions);
        
        if (questionsError) throw questionsError;
        
        if (questions && questions.length > 0) {
          setAllQuestions(questions);
          if (gameData.status === 'playing') {
            setCurrentQuestion(questions[0]);
            setTimeRemaining(30);
          }
        }
        
        // Fetch initial leaderboard
        await fetchLeaderboard();
        
      } catch (err: any) {
        console.error('Error initializing game:', err);
        console.error('Error details:', JSON.stringify(err, null, 2));
        setError(err.message || 'Failed to initialize game');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeGame();
  }, [roomCode, router, fetchLeaderboard]);

  // Timer countdown
  useEffect(() => {
    if (gameStatus === 'playing' && currentQuestion && !answerSubmitted && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !answerSubmitted) {
      // Auto-submit with no answer
      handleAnswerSubmit('');
    }
  }, [gameStatus, currentQuestion, answerSubmitted, timeRemaining]);

  // Refresh leaderboard only once per question to prevent flashing
  useEffect(() => {
    if (!game || !player) return;

    // Only fetch leaderboard when questionIndex changes (once per new question)
    // This prevents constant re-renders and flashing
    fetchLeaderboard();
  }, [questionIndex]); // Only update when moving to a new question

  // Fetch leaderboard when game status changes to finished
  useEffect(() => {
    if (gameStatus === 'finished' && player) {
      // Add a delay to ensure all database writes have completed
      const timer = setTimeout(() => {
        fetchLeaderboard();
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [gameStatus, player, fetchLeaderboard]);

  // Listen for game status changes (when host starts the game)
  useEffect(() => {
    if (!game) return;

    const channel = supabase
      .channel(`game:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.id}`,
        },
        (payload: any) => {
          console.log('Game update received:', payload);
          const updatedGame = payload.new;
          
          // Update game state
          setGame(updatedGame);
          setGameStatus(updatedGame.status);
          
          // If game just started, load the first question
          if (updatedGame.status === 'playing' && allQuestions.length > 0) {
            setCurrentQuestion(allQuestions[0]);
            setQuestionIndex(0);
            setTimeRemaining(30);
            setAnswerSubmitted(false);
            setSelectedAnswer(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id, allQuestions]);

  // Handle answer submission
  const handleAnswerSubmit = async (answer: string) => {
    if (!player || !currentQuestion || answerSubmitted) return;
    
    try {
      setSelectedAnswer(answer);
      setAnswerSubmitted(true);
      
      const isCorrect = answer === currentQuestion.correct_answer;
      const pointsEarned = isCorrect ? currentQuestion.points : 0;
      
      // Celebrate if correct
      if (isCorrect) {
        celebrate();
      }
      
      // Record the answer
      await supabase
        .from('answers')
        .insert({
          player_id: player.id,
          question_id: currentQuestion.id,
          day: currentQuestion.day,
          answer: answer,
          is_correct: isCorrect,
          time_taken: 30 - timeRemaining,
          points_earned: pointsEarned
        });
      
      // Update player score
      if (isCorrect) {
        // Fetch current score from database to ensure accuracy
        const { data: currentPlayer } = await supabase
          .from('players')
          .select('total_score')
          .eq('id', player.id)
          .single();
        
        const currentScore = currentPlayer?.total_score || 0;
        const newScore = currentScore + pointsEarned;
        setScore(newScore);
        
        // Update player in database
        await supabase
          .from('players')
          .update({ total_score: newScore })
          .eq('id', player.id);
        
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
      
      // Wait 3 seconds then move to next question
      setTimeout(() => {
        handleNextQuestion();
      }, 3000);
      
    } catch (err) {
      console.error('Error submitting answer:', err);
    }
  };

  // Move to next question
  const handleNextQuestion = async () => {
    const nextIndex = questionIndex + 1;
    
    if (nextIndex < allQuestions.length) {
      setQuestionIndex(nextIndex);
      setCurrentQuestion(allQuestions[nextIndex]);
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
      setTimeRemaining(30);
    } else {
      // Game finished - wait a moment then fetch fresh leaderboard data
      setGameStatus('finished');
      
      // Longer delay to ensure all database updates have completed
      setTimeout(async () => {
        await fetchLeaderboard();
      }, 2000);
    }
  };

  // Start game (for demo purposes)
  const startGame = async () => {
    if (!game || allQuestions.length === 0) return;
    
    try {
      // Update game status
      await supabase
        .from('games')
        .update({ 
          status: 'playing',
          current_question: allQuestions[0].id
        })
        .eq('id', game.id);
        
      setCurrentQuestion(allQuestions[0]);
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">

        {gameStatus === 'waiting' && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-8 text-center"
            >
              <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiting for Game to Start</h2>
              <p className="text-gray-600">The host will start the game soon!</p>
            </motion.div>

            {/* Live Leaderboard While Waiting */}
            {leaderboard.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                  Current Standings
                </h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((p, index) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        p.id === player?.id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : index === 0
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-gray-50'
                      }`}
                    >
              <div className="flex items-center space-x-3">
                <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0
                              ? 'bg-yellow-400 text-yellow-900'
                              : index === 1
                              ? 'bg-gray-300 text-gray-900'
                              : index === 2
                              ? 'bg-orange-400 text-orange-900'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {index + 1}
                </div>
                        <span className={`font-semibold ${p.id === player?.id ? 'text-blue-900' : 'text-gray-900'}`}>
                          {p.name} {p.id === player?.id && '(You)'}
                        </span>
              </div>
                      <span className="font-bold text-purple-600">
                        {p.daily_score || p.total_score} pts
                      </span>
          </div>
                  ))}
                  {leaderboard.length > 5 && (
                    <p className="text-center text-gray-500 text-sm pt-2">
                      +{leaderboard.length - 5} more players
                    </p>
                  )}
            </div>
              </motion.div>
            )}
          </div>
        )}

        {gameStatus === 'playing' && currentQuestion && (
          <div className="space-y-4" key={`question-container-${currentQuestion.id}`}>
            
            {/* Live Leaderboard - Top 3 + Your Position */}
            {leaderboard.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm p-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold text-gray-700">Live Standings</span>
                  </div>
                  {playerRank && (
                    <span className="text-blue-600 font-bold">
                      You're #{playerRank}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex space-x-2 text-xs">
                  {leaderboard.slice(0, 3).map((p, idx) => (
                    <div
                      key={p.id}
                      className={`flex-1 p-2 rounded ${
                        p.id === player?.id
                          ? 'bg-blue-50 border border-blue-300'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="font-semibold truncate">
                        {idx + 1}. {p.name}
                      </div>
                      <div className="text-purple-600 font-bold">{p.daily_score || p.total_score}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              key={`question-${currentQuestion.id}-${questionIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
            {/* Question Header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <Clock className="w-6 h-6 text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">
                  Question {questionIndex + 1} of {allQuestions.length}
                </span>
              </div>
              <motion.div 
                className={`px-6 py-3 rounded-lg font-bold text-xl ${
                  timeRemaining <= 5 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}
                animate={timeRemaining <= 5 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: timeRemaining <= 5 ? Infinity : 0, duration: 1 }}
              >
                {timeRemaining}s
              </motion.div>
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
                  onClick={() => !answerSubmitted && handleAnswerSubmit(option.key)}
                  disabled={answerSubmitted}
                  className={`p-6 rounded-lg border-2 transition-all text-left min-h-[80px] ${
                    answerSubmitted
                      ? option.key === currentQuestion.correct_answer
                        ? 'border-green-500 bg-green-50 text-green-800'
                        : selectedAnswer === option.key
                        ? 'border-red-500 bg-red-50 text-red-800'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-900 cursor-pointer'
                  }`}
                  whileHover={!answerSubmitted ? { scale: 1.02 } : {}}
                  whileTap={!answerSubmitted ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
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
                    <span className="text-lg flex-1">{option.text}</span>
                    {answerSubmitted && option.key === currentQuestion.correct_answer && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                    {answerSubmitted && selectedAnswer === option.key && option.key !== currentQuestion.correct_answer && (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Answer Feedback */}
            <AnimatePresence>
              {answerSubmitted && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-6 rounded-lg text-center ${
                    selectedAnswer === currentQuestion.correct_answer
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200'
                      : 'bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200'
                  }`}
                >
                  <motion.h3 
                    className={`text-2xl font-bold mb-2 ${
                      selectedAnswer === currentQuestion.correct_answer
                        ? 'text-green-800'
                        : 'text-red-800'
                    }`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    {selectedAnswer === currentQuestion.correct_answer ? '🎉 Correct!' : '😊 Not quite!'}
                  </motion.h3>
                  <p className={`text-xl ${
                    selectedAnswer === currentQuestion.correct_answer
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}>
                    {selectedAnswer === currentQuestion.correct_answer
                      ? `+${currentQuestion.points} points! Great job!`
                      : `The correct answer was ${currentQuestion.correct_answer}. Next one!`
                    }
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            </motion.div>
          </div>
        )}

        {gameStatus === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Final Score Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Game Finished!</h2>
              <p className="text-gray-600 mb-6">Great job playing!</p>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 rounded-lg mb-6 border-2 border-green-200">
                <p className="text-green-800 font-bold text-3xl">Final Score: {score}</p>
                {playerRank && (
                  <p className="text-green-700 text-xl mt-2">You finished #{playerRank}!</p>
                )}
        </div>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg"
              >
                Play Again
              </button>
          </div>

            {/* Final Leaderboard */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Trophy className="w-8 h-8 mr-3 text-yellow-500" />
                Final Leaderboard
              </h2>
              <div className="space-y-2">
                {leaderboard.map((p, index) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      p.id === player?.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : index === 0
                        ? 'bg-yellow-50 border-2 border-yellow-200'
                        : index === 1
                        ? 'bg-gray-50 border-2 border-gray-200'
                        : index === 2
                        ? 'bg-orange-50 border-2 border-orange-200'
                        : 'bg-gray-50'
                    }`}
                >
                  <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? 'bg-yellow-400 text-yellow-900'
                            : index === 1
                            ? 'bg-gray-300 text-gray-900'
                            : index === 2
                            ? 'bg-orange-400 text-orange-900'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className={`font-semibold ${p.id === player?.id ? 'text-blue-900' : 'text-gray-900'}`}>
                        {p.name} {p.id === player?.id && '(You)'}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">
                      {p.daily_score || p.total_score} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}