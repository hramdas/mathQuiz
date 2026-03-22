import { useState, useEffect } from 'react';
import Login from './components/Login';
import Quiz from './components/Quiz';
import Leaderboard from './components/Leaderboard';
import WinnerBanner from './components/WinnerBanner';
import useSocket from './hooks/useSocket';

const STORAGE_KEY = 'mathquiz_user';

function getSavedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId && parsed?.username) return parsed;
  } catch {}
  return null;
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = getSavedUser();
    if (saved) setUser(saved);
  }, []);

  const handleLogin = ({ userId, username }) => {
    const userData = { userId, username };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const {
    connected,
    question,
    roundResult,
    answerFeedback,
    leaderboard,
    playerCount,
    submitAnswer,
  } = useSocket(user);

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="logo">⚡ Math Quiz</h1>
        <div className="user-info">
          <span className="username-display">{user.username}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="app-main">
        <div className="quiz-section">
          <Quiz
            question={question}
            roundResult={roundResult}
            answerFeedback={answerFeedback}
            playerCount={playerCount}
            connected={connected}
            onSubmitAnswer={submitAnswer}
          />
        </div>

        <aside className="sidebar">
          <Leaderboard realtimeData={leaderboard} currentUser={user.username} />
        </aside>
      </main>

      <WinnerBanner result={roundResult} currentUser={user.username} />
    </div>
  );
}
