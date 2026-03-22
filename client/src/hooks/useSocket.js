import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';

export default function useSocket(user) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [question, setQuestion] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    if (!user?.userId) return;

    // When SERVER_URL is undefined, socket.io-client connects to the same
    // origin that served the page — in dev that's Vite, whose proxy forwards
    // /socket.io to the Express server, avoiding any CORS issues.
    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join', { userId: user.userId, username: user.username });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('new-question', (q) => {
      setQuestion(q);
      setRoundResult(null);
      setAnswerFeedback(null);
    });

    socket.on('round-result', (result) => {
      setRoundResult(result);
    });

    socket.on('answer-result', (feedback) => {
      setAnswerFeedback(feedback);
    });

    socket.on('leaderboard-update', (data) => {
      setLeaderboard(data);
    });

    socket.on('player-count', (count) => {
      setPlayerCount(count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.userId, user?.username]);

  const submitAnswer = useCallback((questionId, answer) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('submit-answer', { questionId, answer });
    }
  }, []);

  return {
    connected,
    question,
    roundResult,
    answerFeedback,
    leaderboard,
    playerCount,
    submitAnswer,
  };
}
