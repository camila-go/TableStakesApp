'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Users, Zap } from 'lucide-react';

export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();

  const teams = [
    { id: 'team-1', name: 'Table 1', color: '#FF6B6B' },
    { id: 'team-2', name: 'Table 2', color: '#4ECDC4' },
    { id: 'team-3', name: 'Table 3', color: '#45B7D1' },
    { id: 'team-4', name: 'Table 4', color: '#96CEB4' },
    { id: 'team-5', name: 'Table 5', color: '#FFEAA7' },
    { id: 'team-6', name: 'Table 6', color: '#DDA0DD' },
  ];

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !playerName || !selectedTeam) return;

    setIsJoining(true);
    
    // Store player data in session storage
    sessionStorage.setItem('playerData', JSON.stringify({
      roomCode,
      playerName,
      teamId: selectedTeam,
      teamName: teams.find(t => t.id === selectedTeam)?.name
    }));

    // Navigate to game page
    router.push(`/game/${roomCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <main id="main-content" className="max-w-md w-full">
        <motion.div 
          className="max-w-md w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
        {/* Header */}
        <motion.header 
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex justify-center mb-4">
            <motion.div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              role="img"
              aria-label="Table Stakes trophy icon"
            >
              <Trophy className="w-12 h-12 text-white" aria-hidden="true" />
            </motion.div>
          </div>
          <motion.h1 
            className="text-3xl font-bold text-gray-900 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Table Stakes
          </motion.h1>
          <motion.p 
            className="text-gray-800 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Leadership Conference Trivia
          </motion.p>
        </motion.header>

        {/* Features */}
        <motion.section 
          className="grid grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          aria-label="Game features"
        >
          {[
            { icon: Users, text: 'Team Play', color: 'blue', description: 'Collaborate with your team' },
            { icon: Zap, text: 'Real-time', color: 'yellow', description: 'Live updates and scoring' },
            { icon: Trophy, text: 'Competitive', color: 'green', description: 'Compete for the top spot' }
          ].map((feature, index) => (
            <motion.div 
              key={index}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className={`bg-white p-3 rounded-lg shadow-sm mb-2`}>
                <feature.icon 
                  className={`w-6 h-6 text-${feature.color}-600 mx-auto`} 
                  aria-hidden="true"
                />
              </div>
              <p className="text-base text-gray-800 font-medium">{feature.text}</p>
              <span className="sr-only">{feature.description}</span>
            </motion.div>
          ))}
        </motion.section>

        {/* Join Form */}
        <motion.section 
          className="bg-white rounded-xl shadow-lg p-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          aria-labelledby="join-game-heading"
        >
          <h2 id="join-game-heading" className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Join Game
          </h2>
          
          <form onSubmit={handleJoinGame} className="space-y-4" role="form" aria-label="Join game form">
            {/* Room Code */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
            >
              <label htmlFor="roomCode" className="block text-base font-semibold text-gray-900 mb-2">
                Room Code
              </label>
              <input
                type="text"
                id="roomCode"
                name="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-center text-xl font-mono tracking-widest transition-all bg-white text-gray-900 placeholder-gray-600"
                required
                aria-describedby="roomCode-help"
                aria-invalid={roomCode.length > 0 && roomCode.length !== 6 ? 'true' : 'false'}
              />
              <div id="roomCode-help" className="sr-only">
                Enter the 6-digit room code provided by your game host
              </div>
              {roomCode.length > 0 && roomCode.length !== 6 && (
                <p className="text-red-600 text-sm mt-1" role="alert">
                  Room code must be exactly 6 digits
                </p>
              )}
            </motion.div>

            {/* Player Name */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
            >
              <label htmlFor="playerName" className="block text-base font-semibold text-gray-900 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                name="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-600 text-lg"
                required
                aria-describedby="playerName-help"
                minLength={1}
                maxLength={50}
              />
              <div id="playerName-help" className="sr-only">
                Enter your display name for the game
              </div>
            </motion.div>

            {/* Team Selection */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.6 }}
            >
              <fieldset>
                <legend className="block text-base font-semibold text-gray-900 mb-3">
                  Select Your Table
                </legend>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="team-selection">
                  {teams.map((team, index) => (
                    <motion.button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeam(team.id)}
                      className={`p-4 rounded-lg border-3 transition-all focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 ${
                        selectedTeam === team.id
                          ? 'border-blue-600 bg-blue-100 shadow-lg'
                          : 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50'
                      }`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.7 + index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      role="radio"
                      aria-checked={selectedTeam === team.id}
                      aria-describedby={`team-${team.id}-desc`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: team.color }}
                          aria-hidden="true"
                        />
                        <span className="text-base font-semibold text-gray-900">{team.name}</span>
                        {selectedTeam === team.id && (
                          <div className="ml-auto">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">✓</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <span id={`team-${team.id}-desc`} className="sr-only">
                        Join {team.name} team
                      </span>
                    </motion.button>
                  ))}
                </div>
              </fieldset>
            </motion.div>

            {/* Join Button */}
            <motion.button
              type="submit"
              disabled={isJoining || !roomCode || !playerName || !selectedTeam || roomCode.length !== 6}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-describedby="join-button-help"
            >
              {isJoining ? 'Joining...' : 'Join Game'}
              <span id="join-button-help" className="sr-only">
                Submit the form to join the game with your selected team
              </span>
            </motion.button>
          </form>
        </motion.section>

        {/* Host Link */}
        <motion.nav 
          id="navigation"
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.0 }}
          aria-label="Host navigation"
        >
          <p className="text-sm text-gray-600">
            Hosting a game?{' '}
            <button
              onClick={() => router.push('/host')}
              className="text-blue-600 hover:text-blue-700 font-medium underline transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Navigate to host dashboard"
            >
              Create Game
            </button>
          </p>
        </motion.nav>
        </motion.div>
      </main>
    </div>
  );
}