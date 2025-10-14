'use client';

import { useState, useEffect } from 'react';
import { useSocket, useSocketEvent } from '@/hooks/useSocket';
import { GameSession, GameSettings, GameState, Team } from '@/types/game';
import { Trophy, Users, Play, Settings, Copy, Check } from 'lucide-react';

export default function HostDashboard() {
  const { socket, isConnected } = useSocket();
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [settings, setSettings] = useState<GameSettings>({
    rounds: 3,
    questionsPerRound: 5,
    timePerQuestion: 30,
    allowTeamVoting: true,
    enableSpeedBonus: true,
    enableStreakBonus: true
  });
  const [isCreating, setIsCreating] = useState(false);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);

  // Socket event handlers
  useSocketEvent(socket, 'game:created', (session: GameSession) => {
    setGameSession(session);
    setIsCreating(false);
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

  useSocketEvent(socket, 'game:error', (error: string) => {
    console.error('Game error:', error);
    setIsCreating(false);
  });

  const handleCreateGame = () => {
    if (!socket || isCreating) return;
    
    setIsCreating(true);
    socket.emit('host:create-game', settings);
  };

  const handleStartGame = () => {
    if (!socket || !gameSession) return;
    socket.emit('host:start-game');
  };

  const handleNextQuestion = () => {
    if (!socket || !gameSession) return;
    socket.emit('host:next-question');
  };

  const handleEndGame = () => {
    if (!socket || !gameSession) return;
    socket.emit('host:end-game');
  };

  const copyRoomCode = async () => {
    if (gameSession?.roomCode) {
      await navigator.clipboard.writeText(gameSession.roomCode);
      setRoomCodeCopied(true);
      setTimeout(() => setRoomCodeCopied(false), 2000);
    }
  };

  const getTotalPlayers = () => {
    if (!gameSession) return 0;
    return gameSession.teams.reduce((total, team) => total + team.players.length, 0);
  };

  const getConnectedPlayers = () => {
    if (!gameSession) return 0;
    return gameSession.teams.reduce((total, team) => 
      total + team.players.filter(p => p.isConnected).length, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <div id="main-content" className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-full" role="img" aria-label="Host dashboard trophy icon">
                <Trophy className="w-8 h-8 text-white" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
                <p className="text-gray-600">Leadership Conference Trivia</p>
              </div>
            </div>
            <div className="flex items-center space-x-2" role="status" aria-live="polite">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} aria-hidden="true" />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </header>

        {!gameSession ? (
          /* Game Setup */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Settings className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Game Settings</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Rounds
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.rounds}
                    onChange={(e) => setSettings({...settings, rounds: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Questions per Round
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.questionsPerRound}
                    onChange={(e) => setSettings({...settings, questionsPerRound: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time per Question (seconds)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={settings.timePerQuestion}
                    onChange={(e) => setSettings({...settings, timePerQuestion: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.allowTeamVoting}
                      onChange={(e) => setSettings({...settings, allowTeamVoting: e.target.checked})}
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Allow Team Voting</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enableSpeedBonus}
                      onChange={(e) => setSettings({...settings, enableSpeedBonus: e.target.checked})}
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable Speed Bonus</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enableStreakBonus}
                      onChange={(e) => setSettings({...settings, enableStreakBonus: e.target.checked})}
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable Streak Bonus</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Create Game Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Game</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Game Summary</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {settings.rounds} rounds</li>
                    <li>• {settings.questionsPerRound} questions per round</li>
                    <li>• {settings.timePerQuestion} seconds per question</li>
                    <li>• Total: {settings.rounds * settings.questionsPerRound} questions</li>
                  </ul>
                </div>

                <button
                  onClick={handleCreateGame}
                  disabled={!isConnected || isCreating}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                >
                  {isCreating ? 'Creating Game...' : 'Create Game'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Game Control */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Room Code & Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Code
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-100 px-4 py-3 rounded-lg text-center text-2xl font-mono font-bold tracking-widest">
                      {gameSession.roomCode}
                    </div>
                    <button
                      onClick={copyRoomCode}
                      className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {roomCodeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{getTotalPlayers()}</div>
                    <div className="text-sm text-gray-600">Total Players</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{getConnectedPlayers()}</div>
                    <div className="text-sm text-gray-600">Connected</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Game Status</div>
                  <div className="font-semibold text-gray-900 capitalize">
                    {gameSession.gameState.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Teams */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Teams</h2>
              </div>
              
              <div className="space-y-3">
                {gameSession.teams.map((team) => (
                  <div key={team.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="font-medium text-gray-900">{team.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{team.players.length} players</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {team.players.map(p => p.name).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Controls */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Game Controls</h2>
              
              <div className="space-y-3">
                {gameSession.gameState === GameState.LOBBY && (
                  <button
                    onClick={handleStartGame}
                    disabled={getTotalPlayers() === 0}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Play className="w-5 h-5 inline mr-2" />
                    Start Game
                  </button>
                )}

                {gameSession.gameState === GameState.PLAYING && (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
                  >
                    Next Question
                  </button>
                )}

                <button
                  onClick={handleEndGame}
                  className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 transition-all"
                >
                  End Game
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
