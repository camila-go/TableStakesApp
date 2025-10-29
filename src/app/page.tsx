'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Zap, Smartphone, QrCode } from 'lucide-react';
import { supabase, isSupabaseReady } from '@/lib/supabase';

export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [email, setEmail] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [playerData, setPlayerData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'join' | 'leaderboard'>('join');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const router = useRouter();

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    if (!isSupabaseReady) return;
    
    setIsLoadingLeaderboard(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('total_score', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setLeaderboard(data || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // Check for returning player and URL parameters
  useEffect(() => {
    // Check for returning player in localStorage
    const storedPlayer = localStorage.getItem('playerData');
    if (storedPlayer) {
      try {
        const data = JSON.parse(storedPlayer);
        setPlayerData(data);
        // Auto-fill name and email from stored data
        if (data.name) setPlayerName(data.name);
        if (data.email) setEmail(data.email);
      } catch (e) {
        console.error('Error parsing stored player data:', e);
      }
    }

    // Check for room code in URL params (from QR code)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('code');
      if (codeFromUrl) {
        setRoomCode(codeFromUrl);
      }
    }
  }, []);

  // Fetch leaderboard when switching to leaderboard tab
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode || !playerName) return;

    setIsJoining(true);
    
    try {
      if (!isSupabaseReady) {
        // Mock mode - create temporary player data
        const mockPlayer = {
          id: `mock-${Date.now()}`,
          name: playerName,
          email: email || null,
          total_score: 0
        };

        const playerData = {
          id: mockPlayer.id,
          name: mockPlayer.name,
          email: mockPlayer.email,
          totalScore: mockPlayer.total_score,
          roomCode
        };
        
        localStorage.setItem('playerData', JSON.stringify(playerData));
        sessionStorage.setItem('currentGame', JSON.stringify({ roomCode, playerId: mockPlayer.id }));

        // Navigate to game page
        router.push(`/game/${roomCode}`);
        return;
      }

      // Test Supabase connection first
      console.log('Testing Supabase connection...');
      const { data: testData, error: testError } = await supabase
        .from('players')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
      console.log('Supabase connection test passed');

      // Real Supabase mode
      let player;
      
      // Check if this exact name + email combination exists
      let query = supabase
        .from('players')
        .select('*')
        .eq('name', playerName);
      
      if (email) {
        query = query.eq('email', email);
      }
      
      const { data: existingPlayer, error: selectError } = await query.maybeSingle();

      if (selectError) {
        throw selectError;
      }

      if (existingPlayer) {
        // Found exact match (same name and email)
        player = existingPlayer;
        // Update last seen
        const { error: updateError } = await supabase
          .from('players')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', player.id);
        
        if (updateError) throw updateError;
      } else {
        // Check if name is already taken by someone else
        const { data: nameCheck } = await supabase
          .from('players')
          .select('name')
          .eq('name', playerName)
          .limit(1);
        
        if (nameCheck && nameCheck.length > 0) {
          // Name is taken
          throw new Error(`The name "${playerName}" is already taken. Please add your last initial or choose a different name (e.g., "${playerName} G")`);
        }
        
        // Create new player
        const { data: newPlayer, error: insertError } = await supabase
          .from('players')
          .insert({
            name: playerName,
            email: email || null
          })
          .select()
          .single();

        if (insertError) throw insertError;
        player = newPlayer;
      }

      // Store player data
      const playerData = {
        id: player.id,
        name: player.name,
        email: player.email,
        totalScore: player.total_score,
        roomCode
      };
      
      localStorage.setItem('playerData', JSON.stringify(playerData));
      sessionStorage.setItem('currentGame', JSON.stringify({ roomCode, playerId: player.id }));

      // Navigate to game page
      router.push(`/game/${roomCode}`);
    } catch (error) {
      console.error('Error joining game:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert(`Failed to join game: ${error.message || 'Unknown error'}. Please check the console for details.`);
    } finally {
      setIsJoining(false);
    }
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

        {/* Supabase Setup Notice */}
        {!isSupabaseReady && (
          <motion.div 
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center">
              <Zap className="w-6 h-6 text-yellow-600 mr-3" />
              <div>
                <p className="text-yellow-800 font-semibold">Demo Mode</p>
                <p className="text-yellow-700 text-sm">Running in demo mode. Set up Supabase for full functionality.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Welcome Back Message */}
        {playerData && (
          <motion.div 
            className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center">
              <Trophy className="w-6 h-6 text-green-600 mr-3" />
              <div>
                <p className="text-green-800 font-semibold">Welcome back, {playerData.name}! 👋</p>
                <p className="text-green-700 text-sm">Your tournament score: {playerData.totalScore} points</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div 
          className="flex space-x-2 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
              activeTab === 'join'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/50 text-gray-600 hover:bg-white/70'
            }`}
          >
            Join Game
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'leaderboard'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'bg-white/50 text-gray-600 hover:bg-white/70'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span>Leaderboard</span>
          </button>
        </motion.div>

        {/* Join Form */}
        {activeTab === 'join' && (
          <motion.section 
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            aria-labelledby="join-game-heading"
          >
            <h2 id="join-game-heading" className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Join Game
            </h2>

            {/* Onboarding Help */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-900 font-semibold mb-1">👋 How to Play:</p>
              <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                <li>Get the room code from your host</li>
                <li>Enter your name (must be unique)</li>
                <li>Answer trivia questions as fast as you can!</li>
                <li>Earn points for correct answers</li>
                <li>Check the leaderboard to see your rank</li>
              </ol>
            </div>
          
          <form onSubmit={handleJoinGame} className="space-y-4" role="form" aria-label="Join game form">
            {/* Room Code */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
            >
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="roomCode" className="block text-base font-semibold text-gray-900">
                  Room Code
                </label>
                <button
                  type="button"
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  <QrCode className="w-4 h-4 mr-1" />
                  {showQRCode ? 'Hide QR' : 'Show QR'}
                </button>
              </div>
              
              {showQRCode && (
                <motion.div 
                  className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-3 text-center"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <p className="text-sm text-gray-600 mb-2">Scan QR code to auto-fill room code:</p>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <p className="text-xs text-gray-500">QR Code Scanner Placeholder</p>
                    <p className="text-xs text-gray-400 mt-1">(QR code generation coming soon)</p>
                  </div>
                </motion.div>
              )}
              
              <input
                type="text"
                id="roomCode"
                name="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 4-6 digit code"
                maxLength={6}
                className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 text-center text-xl font-mono tracking-widest transition-all bg-white text-gray-900 placeholder-gray-600"
                required
                aria-describedby="roomCode-help"
                aria-invalid={roomCode.length > 0 && roomCode.length < 4 ? 'true' : 'false'}
              />
              <div id="roomCode-help" className="sr-only">
                Enter the room code provided by your game host
              </div>
              {roomCode.length > 0 && roomCode.length < 4 && (
                <p className="text-red-600 text-sm mt-1" role="alert">
                  Room code must be at least 4 digits
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

            {/* Email (Optional) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.6 }}
            >
              <label htmlFor="email" className="block text-base font-semibold text-gray-900 mb-2">
                Email <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-4 border-2 border-gray-400 rounded-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-gray-900 placeholder-gray-600 text-lg"
                aria-describedby="email-help"
              />
              <div id="email-help" className="sr-only">
                Optional email for score tracking and notifications
              </div>
            </motion.div>

            {/* Join Button */}
            <motion.button
              type="submit"
              disabled={isJoining || !roomCode || !playerName || roomCode.length < 4}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-describedby="join-button-help"
            >
              {isJoining ? 'Joining...' : 'Join Game'}
              <span id="join-button-help" className="sr-only">
                Submit the form to join the game
              </span>
            </motion.button>
          </form>
        </motion.section>
        )}

        {/* Leaderboard View */}
        {activeTab === 'leaderboard' && (
          <motion.section 
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center flex items-center justify-center">
              <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
              Tournament Leaderboard
            </h2>

            {!isSupabaseReady && (
              <div className="text-center py-8">
                <p className="text-gray-600">Leaderboard requires Supabase setup</p>
              </div>
            )}

            {isSupabaseReady && isLoadingLeaderboard && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading leaderboard...</p>
              </div>
            )}

            {isSupabaseReady && !isLoadingLeaderboard && leaderboard.length === 0 && (
              <div className="text-center py-8">
                <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">No players yet. Be the first!</p>
              </div>
            )}

            {isSupabaseReady && !isLoadingLeaderboard && leaderboard.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {leaderboard.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      player.id === playerData?.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : index === 0
                        ? 'bg-yellow-50 border border-yellow-200'
                        : index === 1
                        ? 'bg-gray-50 border border-gray-200'
                        : index === 2
                        ? 'bg-orange-50 border border-orange-200'
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
                      <div>
                        <p className={`font-semibold ${player.id === playerData?.id ? 'text-blue-900' : 'text-gray-900'}`}>
                          {player.name} {player.id === playerData?.id && '(You)'}
                        </p>
                        {player.email && (
                          <p className="text-xs text-gray-500">{player.email}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-purple-600 text-lg">
                      {player.total_score} pts
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {/* PWA Install Prompt */}
        <motion.div 
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.0 }}
        >
          <div className="flex items-center">
            <Smartphone className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <p className="text-blue-800 font-semibold">Add to Home Screen</p>
              <p className="text-blue-700 text-sm">For instant access, add this app to your phone's home screen</p>
            </div>
          </div>
        </motion.div>

        {/* Host Link */}
        <motion.nav 
          id="navigation"
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
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