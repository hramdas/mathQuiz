import { useEffect, useState } from 'react';

export default function WinnerBanner({ result, currentUser }) {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!result) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setCountdown(5);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [result]);

  if (!visible || !result) return null;

  const isMe = result.winner === currentUser;

  return (
    <div className={`winner-overlay ${isMe ? 'winner-me' : ''}`}>
      <div className="winner-card">
        <div className="winner-confetti">
          {isMe ? '🎉' : '⏱️'}
        </div>
        <h2 className="winner-title">
          {isMe ? 'You Won!' : `${result.winner} Won!`}
        </h2>
        <p className="winner-solution">
          {result.expression} = <strong>{result.answer}</strong>
        </p>
        <p className="winner-points">+{result.scoreGain} points</p>
        <div className="winner-countdown">
          Next question in <strong>{countdown}</strong>s
        </div>
      </div>
    </div>
  );
}
