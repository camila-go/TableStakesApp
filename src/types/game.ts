export interface Player {
  id: string;
  name: string;
  teamId: string;
  isConnected: boolean;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  score: number;
  color: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // index of correct option
  points: number;
  timeLimit: number; // in seconds
  category?: string;
}

export interface GameSession {
  id: string;
  roomCode: string;
  hostId: string;
  teams: Team[];
  questions: Question[];
  currentQuestionIndex: number;
  gameState: GameState;
  settings: GameSettings;
  createdAt: Date;
}

export interface CustomQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // index of correct option
  timeLimit: number;
}

export interface GameSettings {
  rounds: number;
  questionsPerRound: number;
  timePerQuestion: number;
  allowTeamVoting: boolean;
  enableSpeedBonus: boolean;
  enableStreakBonus: boolean;
  customQuestions: CustomQuestion[];
}

export enum GameState {
  WAITING = 'waiting',
  LOBBY = 'lobby',
  PLAYING = 'playing',
  SHOWING_RESULTS = 'showing_results',
  FINISHED = 'finished'
}

export interface Answer {
  playerId: string;
  teamId: string;
  questionId: string;
  selectedOption: number;
  timeToAnswer: number; // milliseconds
  isCorrect: boolean;
  points: number;
}

export interface GameResult {
  teamId: string;
  teamName: string;
  finalScore: number;
  correctAnswers: number;
  totalAnswers: number;
  averageResponseTime: number;
  position: number;
}

export interface SocketEvents {
  // Host events
  'host:create-game': (settings: GameSettings) => void;
  'host:start-game': () => void;
  'host:next-question': () => void;
  'host:end-game': () => void;
  'host:add-question': (question: CustomQuestion) => void;
  'host:update-question': (question: CustomQuestion) => void;
  'host:delete-question': (questionId: string) => void;
  
  // Player events
  'player:join-room': (data: { roomCode: string; playerName: string; teamId: string }) => void;
  'player:submit-answer': (data: { questionId: string; selectedOption: number; timeToAnswer: number }) => void;
  
  // Server events
  'game:created': (gameSession: GameSession) => void;
  'game:joined': (gameSession: GameSession) => void;
  'game:player-joined': (player: Player) => void;
  'game:question-started': (question: Question, timeLimit: number) => void;
  'game:answer-received': (answer: Answer) => void;
  'game:question-ended': (results: Answer[]) => void;
  'game:leaderboard-updated': (leaderboard: Team[]) => void;
  'game:finished': (results: GameResult[]) => void;
  'game:error': (error: string) => void;
}
