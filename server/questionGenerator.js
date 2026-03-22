const crypto = require('crypto');

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEasy() {
  const ops = ['+', '-'];
  const op = ops[randInt(0, ops.length - 1)];
  const a = randInt(1, 50);
  const b = randInt(1, 50);

  if (op === '-' && a < b) {
    return { expression: `${b} - ${a}`, answer: b - a };
  }
  const answer = op === '+' ? a + b : a - b;
  return { expression: `${a} ${op} ${b}`, answer };
}

function generateMedium() {
  const type = randInt(0, 2);

  if (type === 0) {
    const a = randInt(2, 12);
    const b = randInt(2, 12);
    return { expression: `${a} × ${b}`, answer: a * b };
  }

  if (type === 1) {
    const b = randInt(2, 12);
    const answer = randInt(2, 12);
    const a = b * answer;
    return { expression: `${a} ÷ ${b}`, answer };
  }

  // Two-step: a + b × c
  const b = randInt(2, 9);
  const c = randInt(2, 9);
  const a = randInt(1, 20);
  return { expression: `${a} + ${b} × ${c}`, answer: a + b * c };
}

function generateHard() {
  const type = randInt(0, 2);

  if (type === 0) {
    const base = randInt(2, 9);
    const exp = randInt(2, 4);
    return { expression: `${base}^${exp}`, answer: Math.pow(base, exp) };
  }

  if (type === 1) {
    const squares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];
    const n = squares[randInt(0, squares.length - 1)];
    return { expression: `√${n}`, answer: Math.sqrt(n) };
  }

  // Three-number expression: (a + b) × c
  const a = randInt(2, 15);
  const b = randInt(2, 15);
  const c = randInt(2, 9);
  return { expression: `(${a} + ${b}) × ${c}`, answer: (a + b) * c };
}

const generators = {
  easy: generateEasy,
  medium: generateMedium,
  hard: generateHard,
};

let roundCounter = 0;

function generate() {
  const difficulty = DIFFICULTIES[roundCounter % DIFFICULTIES.length];
  roundCounter++;

  const { expression, answer } = generators[difficulty]();

  return {
    id: crypto.randomUUID(),
    expression,
    answer,
    difficulty,
    createdAt: Date.now(),
  };
}

module.exports = { generate };
