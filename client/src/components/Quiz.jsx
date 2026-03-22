import { useState, useRef, useEffect } from 'react';

export default function Quiz({
  question,
  roundResult,
  answerFeedback,
  playerCount,
  connected,
  onSubmitAnswer,
}) {
  const [answer, setAnswer] = useState('');
  const inputRef = useRef(null);

  const isRoundOver = !!roundResult;

  useEffect(() => {
    if (!isRoundOver && inputRef.current) {
      inputRef.current.focus();
    }
    setAnswer('');
  }, [question?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!answer.trim() || isRoundOver || !question) return;
    onSubmitAnswer(question.id, answer.trim());
    setAnswer('');
  };

  if (!question) {
    return (
      <div className="quiz-card">
        <div className="quiz-waiting">
          <div className="spinner" />
          <p>Waiting for the next question...</p>
        </div>
      </div>
    );
  }

  const difficultyColors = {
    easy: '#4ade80',
    medium: '#fbbf24',
    hard: '#f87171',
  };

  return (
    <div className="quiz-card">
      <div className="quiz-header">
        <span
          className="difficulty-badge"
          style={{ background: difficultyColors[question.difficulty] }}
        >
          {question.difficulty.toUpperCase()}
        </span>
        <span className="player-count">
          <span className="dot" style={{ background: connected ? '#4ade80' : '#f87171' }} />
          {playerCount} player{playerCount !== 1 ? 's' : ''} online
        </span>
      </div>

      <div className="question-display">
        <span className="question-label">Solve</span>
        <div className="expression">{question.expression}</div>
      </div>

      <form className="answer-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder="Your answer..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={isRoundOver}
          autoComplete="off"
        />
        <button type="submit" disabled={isRoundOver || !answer.trim()}>
          Submit
        </button>
      </form>

      {answerFeedback && !answerFeedback.correct && !isRoundOver && (
        <p className="feedback wrong">{answerFeedback.message}</p>
      )}
    </div>
  );
}
