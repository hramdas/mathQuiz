import { useEffect, useState } from 'react';

export default function Leaderboard({ realtimeData, currentUser }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (realtimeData && realtimeData.length > 0) {
      setData(realtimeData);
    }
  }, [realtimeData]);

  return (
    <div className="leaderboard-card">
      <h2>Leaderboard</h2>
      {data.length === 0 ? (
        <p className="leaderboard-empty">No scores yet. Be the first!</p>
      ) : (
        <div className="leaderboard-list">
          {data.map((user, i) => (
            <div
              key={user.userId}
              className={`leaderboard-row ${user.username === currentUser ? 'current-user' : ''}`}
            >
              <span className="rank">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="lb-username">{user.username}</span>
              <span className="lb-stats">
                <span className="lb-score">{user.score} pts</span>
                <span className="lb-wins">{user.wins}W</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
