# Competitive Math Quiz

A real-time multiplayer math quiz web app. All connected users see the same question simultaneously — the first to answer correctly wins the round and earns points.

## Quick Start

### Prerequisites

- **Node.js** 18+
- **MongoDB** running locally on port `27017` (or via Docker: `docker run -d -p 27017:27017 mongo`)

### Install & Run

```bash
# Install all dependencies (root + server + client)
npm install
npm run install:all

# Start both server and client
npm run dev
```

- **Client**: http://localhost:5173
- **Server**: http://localhost:4000

Open multiple browser tabs to simulate multiple players.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Browser Clients                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  User A   │  │  User B   │  │  User N   │      │
│  │  (React)  │  │  (React)  │  │  (React)  │      │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘     │
└────────┼───────────────┼───────────────┼──────────┘
         │  Socket.IO    │               │
         ▼               ▼               ▼
┌──────────────────────────────────────────────────┐
│              Node.js / Express Server            │
│  ┌─────────────┐  ┌──────────────────────────┐   │
│  │  REST API    │  │  Socket.IO + GameManager  │  │
│  │ /api/*       │  │  (Mutex-locked answers)   │  │
│  └──────┬──────┘  └───────────┬──────────────┘   │
│         │                     │                   │
│         ▼                     ▼                   │
│     ┌────────────────────────────┐                │
│     │       MongoDB              │                │
│     │  (User scores / wins)      │                │
│     └────────────────────────────┘                │
└──────────────────────────────────────────────────┘
```

## Tech Stack

| Technology      | Purpose                                          |
| --------------- | ------------------------------------------------ |
| React + Vite    | Client UI with hot reload                        |
| Node.js/Express | HTTP server + REST API                           |
| Socket.IO       | Real-time bidirectional communication             |
| MongoDB/Mongoose| Persistent user scores and leaderboard           |
| async-mutex     | Mutex lock for concurrent answer processing      |
| concurrently    | Run server + client in parallel                  |

## How It Works

### Concurrency Handling

The core challenge is ensuring only one winner per question when many users submit answers near-simultaneously.

**Solution**: The `GameManager` uses an `async-mutex` lock around the answer-processing logic:

1. Answer arrives via Socket.IO
2. Server acquires the mutex lock
3. Checks if the question is still active and the `questionId` matches
4. Validates the answer
5. If correct: marks the question as resolved, updates the DB, broadcasts the winner
6. Releases the lock

This guarantees serialized processing — even if two correct answers arrive within microseconds, only the first processed wins.

### Dynamic Question Generation

The `questionGenerator` module creates random math problems across three difficulty tiers:

- **Easy**: Addition, subtraction (1–50)
- **Medium**: Multiplication, division (integer results), two-step expressions
- **Hard**: Exponents, square roots, parenthesized expressions

Difficulty rotates each round (easy → medium → hard → easy → ...). Each question gets a `crypto.randomUUID()` to prevent stale/replay submissions.

### Network Conditions

- **Server-side timestamps** are the source of truth — client clocks are never consulted
- Each answer includes the `questionId`; stale submissions (for a previous question) are silently rejected
- Socket.IO's built-in reconnection handles dropped connections; on reconnect, the client receives the current active question
- The UI provides optimistic feedback while the server processes the answer

### High Score Tracking

- MongoDB stores `username`, `score`, `wins`, and `gamesPlayed`
- Score is awarded based on difficulty: Easy +10, Medium +20, Hard +30
- Leaderboard updates are broadcast to all clients in real-time after each round
- Top 10 displayed in the sidebar; the current user's row is highlighted

## Trade-offs & Corners Cut

These decisions were made to keep the project within the 2-3 hour scope:

| Area              | What was done                       | Production alternative                                          |
| ----------------- | ----------------------------------- | --------------------------------------------------------------- |
| Authentication    | Simple username (no password)       | JWT + OAuth (Google/GitHub), session management                  |
| Database config   | Hardcoded local MongoDB URI         | Environment variables, connection pooling, replica sets          |
| Rate limiting     | None                                | Per-user rate limiting on answer submissions (e.g., 5/sec)       |
| Testing           | Manual testing only                 | Unit tests (Jest), integration tests, E2E (Playwright)           |
| Deployment        | Local development only              | Docker, CI/CD pipeline, nginx reverse proxy                      |
| Horizontal scaling| Single server instance              | Redis adapter for Socket.IO, stateless servers behind load balancer |
| Anti-cheat        | None                                | Answer time tracking, bot detection, CAPTCHA for suspicious users |
| Input validation  | Basic                               | Schema validation (Zod/Joi), XSS sanitization                    |

## Project Structure

```
mathQuiz/
├── server/
│   ├── index.js               # Express + Socket.IO entry point
│   ├── gameManager.js          # Mutex-locked game logic
│   ├── questionGenerator.js    # Random math problem factory
│   └── models/User.js          # Mongoose schema
├── client/
│   ├── src/
│   │   ├── App.jsx             # Root component
│   │   ├── App.css             # Global styles (dark theme)
│   │   ├── components/
│   │   │   ├── Login.jsx       # Username entry
│   │   │   ├── Quiz.jsx        # Question display + answer input
│   │   │   ├── Leaderboard.jsx # Live top-10 scores
│   │   │   └── WinnerBanner.jsx# Animated winner overlay
│   │   └── hooks/useSocket.js  # Socket.IO client hook
│   ├── vite.config.js
│   └── index.html
├── package.json                # Root orchestrator
└── README.md
```

## Time Spent

~2.5 hours total:
- Architecture & planning: ~20 min
- Server (Express, Socket.IO, GameManager, Question Generator): ~50 min
- Client (React components, Socket hook, styling): ~70 min
- Integration, testing, polish: ~30 min
