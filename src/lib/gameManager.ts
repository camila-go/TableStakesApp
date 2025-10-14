import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { GameSession, GameState, Player, Team, Question, Answer, GameSettings, GameResult, CustomQuestion } from '@/types/game';
import { v4 as uuidv4 } from 'uuid';

class GameManager {
  private games: Map<string, GameSession> = new Map();
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Host creates a new game
      socket.on('host:create-game', (settings: GameSettings) => {
        const roomCode = this.generateRoomCode();
        
        // Use custom questions if available, otherwise use default questions
        const questions = settings.customQuestions && settings.customQuestions.length > 0 
          ? this.convertCustomQuestionsToQuestions(settings.customQuestions)
          : this.getDefaultQuestions();
        
        const gameSession: GameSession = {
          id: uuidv4(),
          roomCode,
          hostId: socket.id,
          teams: this.createDefaultTeams(),
          questions,
          currentQuestionIndex: 0,
          gameState: GameState.WAITING,
          settings,
          createdAt: new Date()
        };

        this.games.set(roomCode, gameSession);
        socket.join(roomCode);
        socket.emit('game:created', gameSession);
        
        console.log(`Game created with room code: ${roomCode}`);
      });

      // Player joins a room
      socket.on('player:join-room', (data: { roomCode: string; playerName: string; teamId: string }) => {
        console.log('Player attempting to join room:', data.roomCode);
        console.log('Available rooms:', Array.from(this.games.keys()));
        const game = this.games.get(data.roomCode);
        if (!game) {
          console.log('Room not found:', data.roomCode);
          socket.emit('game:error', 'Room not found');
          return;
        }

        if (game.gameState !== GameState.WAITING && game.gameState !== GameState.LOBBY) {
          socket.emit('game:error', 'Game has already started');
          return;
        }

        const player: Player = {
          id: socket.id,
          name: data.playerName,
          teamId: data.teamId,
          isConnected: true
        };

        const team = game.teams.find(t => t.id === data.teamId);
        if (team) {
          team.players.push(player);
          socket.join(data.roomCode);
          socket.join(`${data.roomCode}-${data.teamId}`);
          
          game.gameState = GameState.LOBBY;
          socket.emit('game:joined', game);
          this.io.to(data.roomCode).emit('game:player-joined', player);
          this.io.to(data.roomCode).emit('game:state-changed', game.gameState);
          
          console.log(`Player ${data.playerName} joined team ${team.name} in room ${data.roomCode}`);
        } else {
          socket.emit('game:error', 'Invalid team');
        }
      });

      // Player submits an answer
      socket.on('player:submit-answer', (data: { questionId: string; selectedOption: number; timeToAnswer: number }) => {
        const game = this.findGameBySocketId(socket.id);
        if (!game || game.gameState !== GameState.PLAYING) {
          return;
        }

        const player = this.findPlayerBySocketId(socket.id, game);
        if (!player) {
          return;
        }

        const currentQuestion = game.questions[game.currentQuestionIndex];
        const isCorrect = data.selectedOption === currentQuestion.correctAnswer;
        const points = this.calculatePoints(isCorrect, data.timeToAnswer, currentQuestion.points);

        const answer: Answer = {
          playerId: player.id,
          teamId: player.teamId,
          questionId: data.questionId,
          selectedOption: data.selectedOption,
          timeToAnswer: data.timeToAnswer,
          isCorrect,
          points
        };

        // Update team score
        const team = game.teams.find(t => t.id === player.teamId);
        if (team) {
          team.score += points;
        }

        socket.emit('game:answer-received', answer);
        this.io.to(game.roomCode).emit('game:answer-received', answer);
      });

      // Host starts the game
      socket.on('host:start-game', () => {
        const game = this.findGameByHostId(socket.id);
        if (!game) return;

        game.gameState = GameState.PLAYING;
        this.io.to(game.roomCode).emit('game:state-changed', game.gameState);
        this.startNextQuestion(game);
      });

      // Host moves to next question
      socket.on('host:next-question', () => {
        const game = this.findGameByHostId(socket.id);
        if (!game) return;

        if (game.currentQuestionIndex < game.questions.length - 1) {
          game.currentQuestionIndex++;
          this.startNextQuestion(game);
        } else {
          this.endGame(game);
        }
      });

      // Host ends the game
      socket.on('host:end-game', () => {
        const game = this.findGameByHostId(socket.id);
        if (game) {
          this.endGame(game);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        this.handlePlayerDisconnect(socket.id);
      });
    });
  }

  private generateRoomCode(): string {
    let code: string;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.games.has(code));
    return code;
  }

  private createDefaultTeams(): Team[] {
    const teamNames = ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    
    return teamNames.map((name, index) => ({
      id: `team-${index + 1}`,
      name,
      players: [],
      score: 0,
      color: colors[index]
    }));
  }

  private getDefaultQuestions(): Question[] {
    return [
      {
        id: 'q1',
        text: 'What is the most important quality of a leader?',
        options: ['Charisma', 'Integrity', 'Intelligence', 'Confidence'],
        correctAnswer: 1,
        points: 10,
        timeLimit: 30,
        category: 'Leadership'
      },
      {
        id: 'q2',
        text: 'Which leadership style is most effective in crisis situations?',
        options: ['Democratic', 'Autocratic', 'Laissez-faire', 'Transformational'],
        correctAnswer: 1,
        points: 10,
        timeLimit: 30,
        category: 'Leadership'
      },
      {
        id: 'q3',
        text: 'What percentage of communication is non-verbal?',
        options: ['55%', '70%', '85%', '93%'],
        correctAnswer: 3,
        points: 10,
        timeLimit: 30,
        category: 'Communication'
      }
    ];
  }

  private convertCustomQuestionsToQuestions(customQuestions: CustomQuestion[]): Question[] {
    return customQuestions.map((customQ, index) => ({
      id: customQ.id,
      text: customQ.text,
      options: customQ.options,
      correctAnswer: customQ.correctAnswer,
      points: 10, // Base points for custom questions
      timeLimit: customQ.timeLimit,
      category: 'Custom'
    }));
  }

  private calculatePoints(isCorrect: boolean, timeToAnswer: number, basePoints: number): number {
    if (!isCorrect) return 0;
    
    let points = basePoints;
    
    // Speed bonus (faster answers get more points)
    const maxTime = 30000; // 30 seconds
    const speedMultiplier = Math.max(0.5, 1 - (timeToAnswer / maxTime));
    points = Math.floor(points * speedMultiplier);
    
    return points;
  }

  private startNextQuestion(game: GameSession) {
    const question = game.questions[game.currentQuestionIndex];
    if (!question) {
      this.endGame(game);
      return;
    }
    
    console.log(`Starting question ${game.currentQuestionIndex + 1}/${game.questions.length}: ${question.text}`);
    this.io.to(game.roomCode).emit('game:question-started', question, question.timeLimit);
    
    // Auto-advance after time limit
    setTimeout(() => {
      if (game.gameState === GameState.PLAYING) {
        console.log(`Question ${game.currentQuestionIndex + 1} ended`);
        this.io.to(game.roomCode).emit('game:question-ended', []);
        this.io.to(game.roomCode).emit('game:leaderboard-updated', game.teams);
      }
    }, question.timeLimit * 1000);
  }

  private endGame(game: GameSession) {
    game.gameState = GameState.FINISHED;
    this.io.to(game.roomCode).emit('game:state-changed', game.gameState);
    
    const results: GameResult[] = game.teams
      .map(team => ({
        teamId: team.id,
        teamName: team.name,
        finalScore: team.score,
        correctAnswers: 0, // TODO: Calculate from answers
        totalAnswers: 0, // TODO: Calculate from answers
        averageResponseTime: 0, // TODO: Calculate from answers
        position: 0 // TODO: Calculate position
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((result, index) => ({ ...result, position: index + 1 }));

    this.io.to(game.roomCode).emit('game:finished', results);
    
    // Clean up after 5 minutes
    setTimeout(() => {
      this.games.delete(game.roomCode);
    }, 5 * 60 * 1000);
  }

  private findGameBySocketId(socketId: string): GameSession | undefined {
    for (const game of this.games.values()) {
      for (const team of game.teams) {
        if (team.players.some(p => p.id === socketId)) {
          return game;
        }
      }
    }
    return undefined;
  }

  private findGameByHostId(hostId: string): GameSession | undefined {
    for (const game of this.games.values()) {
      if (game.hostId === hostId) {
        return game;
      }
    }
    return undefined;
  }

  private findPlayerBySocketId(socketId: string, game: GameSession): Player | undefined {
    for (const team of game.teams) {
      const player = team.players.find(p => p.id === socketId);
      if (player) return player;
    }
    return undefined;
  }

  private handlePlayerDisconnect(socketId: string) {
    for (const game of this.games.values()) {
      for (const team of game.teams) {
        const playerIndex = team.players.findIndex(p => p.id === socketId);
        if (playerIndex !== -1) {
          team.players[playerIndex].isConnected = false;
          this.io.to(game.roomCode).emit('game:player-disconnected', team.players[playerIndex]);
          break;
        }
      }
    }
  }
}

export default GameManager;
