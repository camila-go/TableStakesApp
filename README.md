<<<<<<< HEAD
# Table Stakes - Leadership Conference Trivia App

A gamified trivia application for leadership conferences that enables table-based team competition with easy mobile access via join codes.

## Features

### 🎯 Core Functionality
- **Room Management**: Generate unique 6-digit room codes for easy joining
- **Team-Based Play**: Support for up to 6 tables/teams
- **Real-Time Synchronization**: Instant question distribution and answer tracking
- **Mobile-First Design**: Optimized for phones and tablets
- **Live Leaderboard**: Real-time scoring and rankings

### 🎮 Game Features
- **Multiple Choice Questions**: A/B/C/D answer format
- **Timer System**: Configurable time limits per question
- **Scoring System**: Points with speed bonuses
- **Team Voting**: Collaborative answer submission
- **Visual Feedback**: Animations and progress indicators

### 🎨 User Interfaces
- **Host Dashboard**: Desktop interface for game control
- **Player Interface**: Mobile-optimized gameplay
- **Responsive Design**: Works on all screen sizes

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Real-time**: Socket.io
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd table-stakes-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### For Hosts
1. Navigate to `/host` to access the host dashboard
2. Configure game settings (rounds, questions, time limits)
3. Create a new game to get a room code
4. Share the room code with participants
5. Start the game when all teams have joined
6. Control question flow and view live results

### For Players
1. Enter the room code on the home page
2. Select your table/team
3. Enter your name
4. Join the game and wait in the lobby
5. Answer questions as they appear
6. View live leaderboard between rounds

## Game Flow

1. **Setup**: Host creates game with settings
2. **Joining**: Players join using room code
3. **Lobby**: Teams assemble and wait for start
4. **Playing**: Questions appear with timer
5. **Scoring**: Real-time points and leaderboard
6. **Results**: Final rankings and celebration

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Landing page
│   ├── host/              # Host dashboard
│   └── game/[roomCode]/   # Player game interface
├── hooks/                 # React hooks
│   └── useSocket.ts       # Socket.io client hook
├── lib/                   # Server-side logic
│   └── gameManager.ts     # Game state management
├── types/                 # TypeScript definitions
│   └── game.ts           # Game-related types
└── pages/api/            # API routes
    └── socketio.ts       # Socket.io server setup
```

## Configuration

### Game Settings
- **Rounds**: Number of question rounds (1-10)
- **Questions per Round**: Questions per round (1-20)
- **Time per Question**: Seconds per question (10-120)
- **Team Voting**: Allow collaborative answers
- **Speed Bonus**: Extra points for fast answers
- **Streak Bonus**: Bonus for consecutive correct answers

### Default Questions
The app includes sample leadership and communication questions. In production, you would:
- Import questions from CSV/JSON files
- Add question categories and difficulty levels
- Implement question management interface

## Deployment

### Environment Variables
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### Production Build
```bash
npm run build
npm start
```

### Recommended Hosting
- **Vercel**: Optimized for Next.js
- **Netlify**: Good for static + serverless
- **Railway**: Full-stack deployment
- **DigitalOcean**: VPS with Docker

## Development

### Adding New Features
1. Update types in `src/types/game.ts`
2. Modify game logic in `src/lib/gameManager.ts`
3. Update UI components in `src/app/`
4. Test with multiple browser tabs

### Socket.io Events
- `host:create-game` - Create new game session
- `player:join-room` - Player joins with room code
- `player:submit-answer` - Submit answer to question
- `game:question-started` - New question begins
- `game:leaderboard-updated` - Scores updated

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

Built with ❤️ for leadership conferences and team building events.
=======
# Devmountain1
# Devmountain
>>>>>>> 4aead67282045cbe90e1c56b17bafe6bb8df90fc
