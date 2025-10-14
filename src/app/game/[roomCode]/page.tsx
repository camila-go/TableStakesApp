'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { GameSession, Question, Answer, GameResult, GameState } from '@/types/game';
import { Trophy, Users, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [playerData, setPlayerData] = useState<any>(null);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);

  // Load player data from session storage
  useEffect(() => {
    const storedData = sessionStorage.getItem('playerData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setPlayerData(data);
      
      // Join the room with retry mechanism
      const joinRoom = () => {
        if (socket && isConnected) {
          socket.emit('player:join-room', {
            roomCode: data.roomCode,
            playerName: data.playerName,
            teamId: data.teamId
          });
        } else {
          // Retry after a short delay if socket isn't ready
          setTimeout(joinRoom, 100);
        }
      };
      
      joinRoom();
    } else {
      router.push('/');
    }
  }, [socket, isConnected, router]);

  // Socket event handlers
  useSocketEvent(socket, 'game:joined', (session: GameSession) => {
    setGameSession(session);
  });

  useSocketEvent(socket, 'game:player-joined', (player) => {
    if (gameSession) {
      const updatedSession = { ...gameSession };
      const team = updatedSession.teams.find(t => t.id === player.teamId);
      if (team) {
        team.players.push(player);
        setGameSession(updatedSession);
      }
    }
  });

  useSocketEvent(socket, 'game:question-started', (question: Question, timeLimit: number) => {
    setCurrentQuestion(question);
    setTimeRemaining(timeLimit);
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
  });

  useSocketEvent(socket, 'game:answer-received', (answer: Answer) => {
    if (answer.playerId === socket?.id) {
      setAnswerSubmitted(true);
    }
  });

  useSocketEvent(socket, 'game:question-ended', (results: Answer[]) => {
    setCurrentQuestion(null);
    setTimeRemaining(0);
  });

  useSocketEvent(socket, 'game:leaderboard-updated', (teams) => {
    if (gameSession) {
      setGameSession({ ...gameSession, teams });
    }
  });

  useSocketEvent(socket, 'game:finished', (results: GameResult[]) => {
    setGameResults(results);
  });

  useSocketEvent(socket, 'game:state-changed', (newState: GameState) => {
    if (gameSession) {
      setGameSession({ ...gameSession, gameState: newState });
    }
  });

  useSocketEvent(socket, 'game:error', (error: string) => {
    console.error('Game error:', error);
    // Only show alert for critical errors, not connection issues
    if (error !== 'Room not found' || gameSession) {
      alert(error);
    } else {
      // For room not found, redirect back to home
      router.push('/');
    }
  });

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  const handleAnswerSelect = (optionIndex: number) => {
    if (answerSubmitted || !currentQuestion) return;
    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (!socket || !currentQuestion || selectedAnswer === null || answerSubmitted) return;

    const timeToAnswer = (currentQuestion.timeLimit - timeRemaining) * 1000;
    
    socket.emit('player:submit-answer', {
      questionId: currentQuestion.id,
      selectedOption: selectedAnswer,
      timeToAnswer
    });
  };

  const getPlayerTeam = () => {
    if (!gameSession || !playerData) return null;
    return gameSession.teams.find(t => t.id === playerData.teamId);
  };

  const getLeaderboardPosition = () => {
    if (!gameSession || !playerData) return 0;
    const sortedTeams = [...gameSession.teams].sort((a, b) => b.score - a.score);
    return sortedTeams.findIndex(t => t.id === playerData.teamId) + 1;
  };

  if (!playerData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (gameResults.length > 0) {
    // Game finished - show results
    const playerTeamResult = gameResults.find(r => r.teamId === playerData.teamId);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Game Complete!</h1>
            <p className="text-xl text-gray-600">Final Results</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 text-center">
              Your Team: {playerData.teamName}
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{playerTeamResult?.position}</div>
                <div className="text-sm text-gray-600">Position</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{playerTeamResult?.finalScore}</div>
                <div className="text-sm text-gray-600">Final Score</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{playerTeamResult?.correctAnswers}</div>
                <div className="text-sm text-gray-600">Correct Answers</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">Final Leaderboard</h3>
            <div className="space-y-3">
              {gameResults.map((result, index) => (
                <div
                  key={result.teamId}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    result.teamId === playerData.teamId ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl font-bold text-gray-600">#{result.position}</div>
                    <div>
                      <div className="font-semibold text-gray-900">{result.teamName}</div>
                      <div className="text-sm text-gray-600">{result.correctAnswers} correct answers</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{result.finalScore}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gameSession) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Joining game...</p>
        </div>
      </div>
    );
  }

  if (gameSession.gameState === GameState.LOBBY) {
    // Waiting in lobby
    const playerTeam = getPlayerTeam();
    
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div id="main-content" className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center" role="img" aria-label="Waiting lobby icon">
              <Users className="w-10 h-10 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Waiting to Start</h1>
            <p className="text-gray-600">Room Code: <span className="font-mono font-bold" aria-label={`Room code ${gameSession.roomCode}`}>{gameSession.roomCode}</span></p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Your Team: {playerData.teamName}
            </h2>
            {playerTeam && (
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: playerTeam.color }}
                />
                <span className="text-lg font-medium">{playerTeam.name}</span>
              </div>
            )}
            <div className="text-center text-gray-600">
              <p>Waiting for the host to start the game...</p>
              <p className="text-sm mt-2">Total players: {gameSession.teams.reduce((total, team) => total + team.players.length, 0)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Teams</h3>
            <div className="grid grid-cols-2 gap-3">
              {gameSession.teams.map((team) => (
                <div key={team.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-medium text-gray-900">{team.name}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {team.players.length} player{team.players.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameSession.gameState === GameState.PLAYING && currentQuestion) {
    // Playing - show question
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-8 h-8 rounded-full"
                  style={{ backgroundColor: getPlayerTeam()?.color }}
                />
                <div>
                  <div className="font-semibold text-gray-900">{playerData.teamName}</div>
                  <div className="text-sm text-gray-600">{playerData.playerName}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Position</div>
                <div className="text-xl font-bold text-gray-900">#{getLeaderboardPosition()}</div>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-6" role="timer" aria-live="polite" aria-label={`Time remaining: ${timeRemaining} seconds`}>
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-6 h-6 text-gray-600" aria-hidden="true" />
              <div className="text-3xl font-bold text-gray-900" aria-live="polite">{timeRemaining}</div>
              <div className="text-gray-600">seconds remaining</div>
            </div>
          </div>

          {/* Question */}
          <motion.section 
            className="bg-white rounded-xl shadow-lg p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            aria-labelledby="question-text"
          >
            <motion.h2 
              id="question-text"
              className="text-xl font-semibold text-gray-900 mb-4 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {currentQuestion.text}
            </motion.h2>
            
            <div className="space-y-3" role="radiogroup" aria-labelledby="question-text">
              {currentQuestion.options.map((option, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={answerSubmitted}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    selectedAnswer === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${answerSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  role="radio"
                  aria-checked={selectedAnswer === index}
                  aria-describedby={`option-${index}-desc`}
                >
                  <div className="flex items-center space-x-3">
                    <motion.div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        selectedAnswer === index ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                      animate={{ 
                        scale: selectedAnswer === index ? 1.1 : 1,
                        rotate: selectedAnswer === index ? 5 : 0
                      }}
                      transition={{ type: "spring", stiffness: 300 }}
                      aria-hidden="true"
                    >
                      {String.fromCharCode(65 + index)}
                    </motion.div>
                    <span className="text-gray-900">{option}</span>
                  </div>
                  <span id={`option-${index}-desc`} className="sr-only">
                    Option {String.fromCharCode(65 + index)}: {option}
                  </span>
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {selectedAnswer !== null && !answerSubmitted && (
                <motion.div 
                  className="mt-6 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.button
                    onClick={handleSubmitAnswer}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-8 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-describedby="submit-help"
                  >
                    Submit Answer
                    <span id="submit-help" className="sr-only">
                      Submit your selected answer for this question
                    </span>
                  </motion.button>
                </motion.div>
              )}

              {answerSubmitted && (
                <motion.div 
                  className="mt-6 text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div 
                    className="flex items-center justify-center space-x-2 text-green-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    role="status"
                    aria-live="polite"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                      aria-hidden="true"
                    >
                      <CheckCircle className="w-6 h-6" />
                    </motion.div>
                    <span className="font-semibold">Answer Submitted!</span>
                  </motion.div>
                  <motion.p 
                    className="text-sm text-gray-600 mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Waiting for other players...
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      </div>
    );
  }

  if (gameSession.gameState === GameState.FINISHED && gameResults.length > 0) {
    // Game finished - show results
    const playerTeamResult = gameResults.find(result => result.teamId === playerData.teamId);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center" role="img" aria-label="Game finished trophy">
              <Trophy className="w-12 h-12 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Game Finished!</h1>
            <p className="text-xl text-gray-600">Final Results</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Final Leaderboard</h2>
            <div className="space-y-4">
              {gameResults.map((result, index) => (
                <motion.div
                  key={result.teamId}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    result.teamId === playerData.teamId 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl font-bold text-gray-600">#{result.position}</div>
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: gameSession.teams.find(t => t.id === result.teamId)?.color }}
                      />
                      <span className="text-lg font-semibold text-gray-900">{result.teamName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{result.finalScore}</div>
                    <div className="text-sm text-gray-600">points</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {playerTeamResult && (
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Team's Performance</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">#{playerTeamResult.position}</div>
                  <div className="text-sm text-gray-600">Final Position</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{playerTeamResult.finalScore}</div>
                  <div className="text-sm text-gray-600">Total Points</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{playerTeamResult.correctAnswers}</div>
                  <div className="text-sm text-gray-600">Correct Answers</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default state - between questions or loading
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading next question...</p>
      </div>
    </div>
  );
}
