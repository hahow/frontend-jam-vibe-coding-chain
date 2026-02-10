import { useReducer, useState, useEffect, useRef } from "react";
import "./App.css";

const GRID = 20;
const CELL = 24;
const SIZE = GRID * CELL;

// Food types with different shapes and score ranges
const FOOD_TYPES = [
  {
    type: "apple",
    shape: "circle",
    color: "#f87171",
    minScore: 8,
    maxScore: 12,
  }, // 紅蘋果
  {
    type: "cherry",
    shape: "double",
    color: "#fb923c",
    minScore: 10,
    maxScore: 15,
  }, // 櫻桃
  {
    type: "grape",
    shape: "cluster",
    color: "#a78bfa",
    minScore: 5,
    maxScore: 10,
  }, // 葡萄
  { type: "lemon", shape: "oval", color: "#facc15", minScore: 7, maxScore: 13 }, // 檸檬
  { type: "berry", shape: "star", color: "#f472b6", minScore: 9, maxScore: 14 }, // 莓果
];

// Hazard types - dangerous items that reduce score
const HAZARD_TYPES = [
  {
    type: "bomb",
    shape: "skull",
    color: "#ef4444",
    minPenalty: 5,
    maxPenalty: 15,
  }, // 炸彈
  {
    type: "poison",
    shape: "cross",
    color: "#8b5cf6",
    minPenalty: 8,
    maxPenalty: 12,
  }, // 毒藥
  {
    type: "spike",
    shape: "triangle",
    color: "#f59e0b",
    minPenalty: 6,
    maxPenalty: 14,
  }, // 尖刺
];

// Difficulty settings: baseSpeed = initial interval, minSpeed = fastest possible
const DIFFICULTIES = {
  easy: { label: "簡單", baseSpeed: 180, minSpeed: 100 },
  medium: { label: "中等", baseSpeed: 100, minSpeed: 60 },
  hard: { label: "困難", baseSpeed: 60, minSpeed: 40 },
};

// Snake color presets: body (RGB array), head (hex), eye matches background
const SNAKE_COLORS = {
  green: {
    label: "經典綠",
    body: [74, 222, 128],
    head: "#bbf7d0",
    preview: "#4ade80",
  },
  blue: {
    label: "海洋藍",
    body: [56, 189, 248],
    head: "#bae6fd",
    preview: "#38bdf8",
  },
  purple: {
    label: "神秘紫",
    body: [167, 139, 250],
    head: "#ddd6fe",
    preview: "#a78bfa",
  },
  pink: {
    label: "櫻花粉",
    body: [244, 114, 182],
    head: "#fbcfe8",
    preview: "#f472b6",
  },
  orange: {
    label: "烈焰橙",
    body: [251, 146, 60],
    head: "#fed7aa",
    preview: "#fb923c",
  },
  cyan: {
    label: "極光青",
    body: [34, 211, 238],
    head: "#cffafe",
    preview: "#22d3ee",
  },
  yellow: {
    label: "閃電黃",
    body: [250, 204, 21],
    head: "#fef9c3",
    preview: "#facc15",
  },
  red: {
    label: "熱血紅",
    body: [248, 113, 113],
    head: "#fecaca",
    preview: "#f87171",
  },
};

const THEMES = [
  {
    // 0-40: Deep ocean
    bg: "#0f172a",
    grid: "#1e293b",
    food: "#f87171",
    eye: "#0f172a",
  },
  {
    // 50-90: Purple night
    bg: "#1a0a2e",
    grid: "#2d1b4e",
    food: "#fb923c",
    eye: "#1a0a2e",
  },
  {
    // 100-140: Teal abyss
    bg: "#042f2e",
    grid: "#134e4a",
    food: "#f472b6",
    eye: "#042f2e",
  },
  {
    // 150-190: Crimson fire
    bg: "#1c0a0a",
    grid: "#3b1515",
    food: "#a78bfa",
    eye: "#1c0a0a",
  },
  {
    // 200+: Golden realm
    bg: "#1a1500",
    grid: "#3d3200",
    food: "#22d3ee",
    eye: "#1a1500",
  },
];

function getTheme(score) {
  const level = Math.min(Math.floor(score / 50), THEMES.length - 1);
  return THEMES[level];
}

// Player 1: WASD
const DIRS1 = {
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  W: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  A: { x: -1, y: 0 },
  D: { x: 1, y: 0 },
};

// Player 2: Arrow keys
const DIRS2 = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function initSnake1() {
  return [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
  ];
}

function initSnake2() {
  return [
    { x: 14, y: 9 },
    { x: 15, y: 9 },
    { x: 16, y: 9 },
  ];
}

function randFood(snake1, snake2, hazard = null) {
  let p;
  do {
    p = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (
    snake1.some((s) => s.x === p.x && s.y === p.y) ||
    snake2.some((s) => s.x === p.x && s.y === p.y) ||
    (hazard && hazard.x === p.x && hazard.y === p.y)
  );

  const foodType = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
  const score =
    Math.floor(Math.random() * (foodType.maxScore - foodType.minScore + 1)) +
    foodType.minScore;

  return {
    x: p.x,
    y: p.y,
    type: foodType.type,
    shape: foodType.shape,
    color: foodType.color,
    score,
  };
}

function randHazard(snakes, food) {
  let p;
  do {
    p = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (
    snakes.some((s) => s.x === p.x && s.y === p.y) ||
    (food.x === p.x && food.y === p.y)
  );

  const hazardType =
    HAZARD_TYPES[Math.floor(Math.random() * HAZARD_TYPES.length)];
  const penalty =
    Math.floor(
      Math.random() * (hazardType.maxPenalty - hazardType.minPenalty + 1),
    ) + hazardType.minPenalty;

  return {
    x: p.x,
    y: p.y,
    type: hazardType.type,
    shape: hazardType.shape,
    color: hazardType.color,
    penalty,
  };
}

function startState() {
  const snake1 = initSnake1();
  const snake2 = initSnake2();
  const food = randFood(snake1, snake2);
  const hazard = randHazard([...snake1, ...snake2], food);
  return {
    snake1,
    dir1: { x: 1, y: 0 },
    score1: 0,
    snake2,
    dir2: { x: -1, y: 0 },
    score2: 0,
    food,
    hazard,
    status: "running",
    whoDied: null,
  };
}

function makeIdle() {
  const snake1 = initSnake1();
  const snake2 = initSnake2();
  const food = randFood(snake1, snake2);
  const hazard = randHazard([...snake1, ...snake2], food);
  return {
    snake1,
    dir1: { x: 1, y: 0 },
    score1: 0,
    snake2,
    dir2: { x: -1, y: 0 },
    score2: 0,
    food,
    hazard,
    status: "idle",
    whoDied: null,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "TOGGLE":
      if (state.status === "dying") return state;
      if (state.status === "idle" || state.status === "gameover")
        return startState();
      if (state.status === "running") return { ...state, status: "paused" };
      if (state.status === "paused") return { ...state, status: "running" };
      return state;

    case "DIR": {
      const d = action.dir;
      if (action.player === 2) {
        if (d.x === -state.dir2.x && d.y === -state.dir2.y) return state;
        return { ...state, dir2: d };
      }
      if (d.x === -state.dir1.x && d.y === -state.dir1.y) return state;
      return { ...state, dir1: d };
    }

    case "TICK": {
      if (state.status !== "running") return state;
      const { snake1, dir1, score1, snake2, dir2, score2, food, hazard } =
        state;

      const head1 = { x: snake1[0].x + dir1.x, y: snake1[0].y + dir1.y };
      const head2 = { x: snake2[0].x + dir2.x, y: snake2[0].y + dir2.y };

      // Head-to-head collision
      const headCollision = head1.x === head2.x && head1.y === head2.y;

      // Body collision: check opponent's body excluding their head (which is also moving)
      const dead1 =
        head1.x < 0 ||
        head1.x >= GRID ||
        head1.y < 0 ||
        head1.y >= GRID ||
        snake1.some((s) => s.x === head1.x && s.y === head1.y) ||
        snake2.slice(1).some((s) => s.x === head1.x && s.y === head1.y);

      const dead2 =
        head2.x < 0 ||
        head2.x >= GRID ||
        head2.y < 0 ||
        head2.y >= GRID ||
        snake2.some((s) => s.x === head2.x && s.y === head2.y) ||
        snake1.slice(1).some((s) => s.x === head2.x && s.y === head2.y);

      if (dead1 || dead2 || headCollision) {
        const whoDied = (dead1 && dead2) || headCollision ? 0 : dead1 ? 1 : 2;
        return { ...state, status: "dying", whoDied };
      }

      // Food/hazard - snake1 gets priority if both eat simultaneously
      const s1AteFood = head1.x === food.x && head1.y === food.y;
      const s2AteFood = !s1AteFood && head2.x === food.x && head2.y === food.y;
      const s1AteHazard = head1.x === hazard.x && head1.y === hazard.y;
      const s2AteHazard =
        !s1AteHazard && head2.x === hazard.x && head2.y === hazard.y;

      const newSnake1 = s1AteFood
        ? [head1, ...snake1]
        : [head1, ...snake1.slice(0, -1)];
      const newScore1 = s1AteFood
        ? score1 + food.score
        : s1AteHazard
          ? Math.max(0, score1 - hazard.penalty)
          : score1;

      const newSnake2 = s2AteFood
        ? [head2, ...snake2]
        : [head2, ...snake2.slice(0, -1)];
      const newScore2 = s2AteFood
        ? score2 + food.score
        : s2AteHazard
          ? Math.max(0, score2 - hazard.penalty)
          : score2;

      const newFood =
        s1AteFood || s2AteFood ? randFood(newSnake1, newSnake2, hazard) : food;
      const newHazard =
        s1AteHazard || s2AteHazard
          ? randHazard([...newSnake1, ...newSnake2], newFood)
          : hazard;

      return {
        ...state,
        snake1: newSnake1,
        score1: newScore1,
        snake2: newSnake2,
        score2: newScore2,
        food: newFood,
        hazard: newHazard,
      };
    }

    case "DEAD":
      if (state.status === "dying") return { ...state, status: "gameover" };
      return state;

    default:
      return state;
  }
}

function drawBgAndGrid(ctx, theme) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 0.5;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(i * CELL, 0);
    ctx.lineTo(i * CELL, SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * CELL);
    ctx.lineTo(SIZE, i * CELL);
    ctx.stroke();
  }
}

function drawFood(ctx, food) {
  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2;
  const radius = CELL / 2 - 3;

  ctx.fillStyle = food.color;

  switch (food.shape) {
    case "circle": // Apple - simple circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "double": // Cherry - two small circles
      ctx.beginPath();
      ctx.arc(cx - 4, cy + 2, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 4, cy + 2, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "cluster": // Grape - cluster of small circles
      const positions = [
        { x: 0, y: -3 },
        { x: -4, y: 2 },
        { x: 4, y: 2 },
        { x: 0, y: 5 },
      ];
      positions.forEach((pos) => {
        ctx.beginPath();
        ctx.arc(cx + pos.x, cy + pos.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
      break;

    case "oval": // Lemon - oval shape
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1.2, 0.8);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;

    case "star": // Berry - star shape
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;

    default:
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
  }
}

function drawHazard(ctx, hazard) {
  const cx = hazard.x * CELL + CELL / 2;
  const cy = hazard.y * CELL + CELL / 2;
  const size = CELL / 2 - 2;

  ctx.fillStyle = hazard.color;
  ctx.strokeStyle = hazard.color;
  ctx.lineWidth = 2.5;

  switch (hazard.shape) {
    case "skull": // Skull shape
      ctx.beginPath();
      ctx.arc(cx, cy - 2, size * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(cx - 3, cy - 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 3, cy - 4, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = hazard.color;
      ctx.fillRect(cx - 4, cy + 3, 8, 4);
      break;

    case "cross": // X mark (poison)
      ctx.beginPath();
      ctx.moveTo(cx - size, cy - size);
      ctx.lineTo(cx + size, cy + size);
      ctx.moveTo(cx + size, cy - size);
      ctx.lineTo(cx - size, cy + size);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case "triangle": // Warning triangle with exclamation
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx - size, cy + size);
      ctx.lineTo(cx + size, cy + size);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(cx - 1.5, cy - 4, 3, 6);
      ctx.fillRect(cx - 1.5, cy + 4, 3, 2);
      break;

    default:
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();
  }
}

function drawSnake(ctx, snake, dir, snakeColors, theme) {
  const [r, g, b] = snakeColors.body;
  snake.slice(1).forEach(({ x, y }, i) => {
    const alpha = 1 - (i / snake.length) * 0.6;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.roundRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4, 3);
    ctx.fill();
  });

  const h = snake[0];
  ctx.fillStyle = snakeColors.head;
  ctx.beginPath();
  ctx.roundRect(h.x * CELL + 1, h.y * CELL + 1, CELL - 2, CELL - 2, 5);
  ctx.fill();

  ctx.fillStyle = theme.eye;
  const cx = h.x * CELL + CELL / 2;
  const cy = h.y * CELL + CELL / 2;
  const perp = { x: dir.y, y: -dir.x };
  ctx.beginPath();
  ctx.arc(
    cx + dir.x * 5 + perp.x * 4,
    cy + dir.y * 5 + perp.y * 4,
    2,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.beginPath();
  ctx.arc(
    cx + dir.x * 5 - perp.x * 4,
    cy + dir.y * 5 - perp.y * 4,
    2,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function drawCanvas(ctx, state, snakeColor1, snakeColor2) {
  const theme = getTheme(state.score1 + state.score2);

  drawBgAndGrid(ctx, theme);
  drawFood(ctx, state.food);
  if (state.hazard) drawHazard(ctx, state.hazard);

  drawSnake(ctx, state.snake1, state.dir1, SNAKE_COLORS[snakeColor1], theme);
  drawSnake(ctx, state.snake2, state.dir2, SNAKE_COLORS[snakeColor2], theme);
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, makeIdle);
  const [highScore, setHighScore] = useState(
    () => +(localStorage.getItem("snakeHighScore") || 0),
  );
  const canvasRef = useRef(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [snakeColor1, setSnakeColor1] = useState("green");
  const [snakeColor2, setSnakeColor2] = useState("orange");

  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty);
    if (state.status !== "idle") {
      dispatch({ type: "TOGGLE" });
    }
  };

  // Update high score (track best individual score)
  useEffect(() => {
    const best = Math.max(state.score1, state.score2);
    if (best > 0 && best > highScore) {
      setHighScore(best);
      localStorage.setItem("snakeHighScore", best);
    }
  }, [state.score1, state.score2]);

  // Track new record on game over
  useEffect(() => {
    const best = Math.max(state.score1, state.score2);
    if (state.status === "dying" && best > 0) {
      setIsNewRecord(best >= highScore);
    } else if (state.status === "running") {
      setIsNewRecord(false);
    }
  }, [state.status]);

  // Game loop (speed increases with combined score, based on difficulty)
  const { baseSpeed, minSpeed } = DIFFICULTIES[difficulty];
  const totalScore = state.score1 + state.score2;
  const speed = Math.max(minSpeed, baseSpeed - Math.floor(totalScore / 10) * 5);
  useEffect(() => {
    if (state.status !== "running") return;
    const id = setInterval(() => dispatch({ type: "TICK" }), speed);
    return () => clearInterval(id);
  }, [state.status, speed]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        dispatch({ type: "TOGGLE" });
        return;
      }
      const d1 = DIRS1[e.key];
      if (d1) {
        e.preventDefault();
        dispatch({ type: "DIR", player: 1, dir: d1 });
        return;
      }
      const d2 = DIRS2[e.key];
      if (d2) {
        e.preventDefault();
        dispatch({ type: "DIR", player: 2, dir: d2 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Death animation
  useEffect(() => {
    if (state.status !== "dying") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const wrap = canvas.parentElement;
    wrap.classList.add("shaking");

    const startTime = performance.now();
    const duration = 800;
    const { snake1, dir1, snake2, dir2, food, hazard, whoDied } = state;
    const theme = getTheme(state.score1 + state.score2);

    // whoDied: 1 = snake1 died, 2 = snake2 died, 0 = both
    const dyingSnake = whoDied === 2 ? snake2 : snake1;
    const dyingColors = SNAKE_COLORS[whoDied === 2 ? snakeColor2 : snakeColor1];
    const [br, bg, bb] = dyingColors.body;

    const livingSnake = whoDied === 1 ? snake2 : whoDied === 2 ? snake1 : null;
    const livingDir = whoDied === 1 ? dir2 : whoDied === 2 ? dir1 : null;
    const livingColors = livingSnake
      ? SNAKE_COLORS[whoDied === 1 ? snakeColor2 : snakeColor1]
      : null;

    const particles = dyingSnake.map(() => ({
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 0.5,
      rot: (Math.random() - 0.5) * 8,
    }));

    let rafId;
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - (1 - t) * (1 - t);

      drawBgAndGrid(ctx, theme);

      if (t < 0.3) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.4 * (1 - t / 0.3)})`;
        ctx.fillRect(0, 0, SIZE, SIZE);
      }

      drawFood(ctx, food);
      if (hazard) drawHazard(ctx, hazard);

      // Draw the surviving snake (if one exists)
      if (livingSnake && livingColors) {
        drawSnake(ctx, livingSnake, livingDir, livingColors, theme);
      }

      // Animate dying snake with particles
      const fadeAlpha = 1 - ease;
      particles.forEach((p, i) => {
        const seg = dyingSnake[i];
        const ox = p.vx * ease * CELL * 2.5;
        const oy = p.vy * ease * CELL * 2.5;
        const scale = 1 - ease * 0.5;
        const halfSize = ((CELL - 4) * scale) / 2;

        if (i === 0) {
          ctx.fillStyle = `rgba(239, 68, 68, ${fadeAlpha})`;
        } else {
          const a = (1 - (i / dyingSnake.length) * 0.6) * fadeAlpha;
          ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${a})`;
        }

        ctx.save();
        ctx.translate(
          seg.x * CELL + CELL / 2 + ox,
          seg.y * CELL + CELL / 2 + oy,
        );
        ctx.rotate(p.rot * ease);
        ctx.beginPath();
        ctx.roundRect(
          -halfSize,
          -halfSize,
          halfSize * 2,
          halfSize * 2,
          i === 0 ? 5 : 3,
        );
        ctx.fill();
        ctx.restore();
      });

      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        wrap.classList.remove("shaking");
        dispatch({ type: "DEAD" });
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(rafId);
      wrap.classList.remove("shaking");
    };
  }, [state.status, snakeColor1, snakeColor2]);

  // Draw
  useEffect(() => {
    if (state.status === "dying") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawCanvas(ctx, state, snakeColor1, snakeColor2);
  }, [state, snakeColor1, snakeColor2]);

  return (
    <div className="app">
      <h1 className="title">貪食蛇齊打交</h1>

      <div className="scores">
        <div className="score-box p1">
          <div className="score-label">P1 分數</div>
          <div className="score-num">{state.score1}</div>
        </div>
        <div className="score-box">
          <div className="score-label">最高分</div>
          <div className="score-num">{highScore}</div>
        </div>
        <div className="score-box p2">
          <div className="score-label">P2 分數</div>
          <div className="score-num">{state.score2}</div>
        </div>
      </div>

      <div className="settings-row">
        <div className="setting-group">
          <div className="setting-label">難度</div>
          <div className="difficulty-selector">
            {Object.entries(DIFFICULTIES).map(([key, { label }]) => (
              <button
                key={key}
                className={`diff-btn ${difficulty === key ? "active" : ""}`}
                onClick={() => handleDifficultyChange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">P1 顏色</div>
          <div className="color-selector">
            {Object.entries(SNAKE_COLORS).map(([key, { label, preview }]) => (
              <button
                key={key}
                className={`color-btn ${snakeColor1 === key ? "active" : ""}`}
                style={{ "--color": preview }}
                onClick={() => setSnakeColor1(key)}
                title={label}
              >
                <span className="color-dot" />
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">P2 顏色</div>
          <div className="color-selector">
            {Object.entries(SNAKE_COLORS).map(([key, { label, preview }]) => (
              <button
                key={key}
                className={`color-btn ${snakeColor2 === key ? "active" : ""}`}
                style={{ "--color": preview }}
                onClick={() => setSnakeColor2(key)}
                title={label}
              >
                <span className="color-dot" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="canvas-wrap">
        <canvas ref={canvasRef} width={SIZE} height={SIZE} className="canvas" />

        {state.status !== "running" && state.status !== "dying" && (
          <div className="overlay">
            {state.status === "idle" && (
              <>
                <div className="ov-icon">🐍</div>
                <div className="ov-title">雙人貪食蛇</div>
                <div className="ov-hint">按 Space / Enter 開始</div>
              </>
            )}
            {state.status === "paused" && (
              <>
                <div className="ov-title">暫停中</div>
                <div className="ov-hint">按 Space / Enter 繼續</div>
              </>
            )}
            {state.status === "gameover" && (
              <>
                <div className="ov-title">遊戲結束</div>
                <div className="ov-scores">
                  <div className="ov-score-item p1">P1: {state.score1}</div>
                  <div className="ov-score-item p2">P2: {state.score2}</div>
                </div>
                <div className="ov-winner">
                  {state.score1 > state.score2
                    ? "🏆 玩家一獲勝！"
                    : state.score2 > state.score1
                      ? "🏆 玩家二獲勝！"
                      : "🤝 平局！"}
                </div>
                {isNewRecord && <div className="ov-record">🎉 新紀錄！</div>}
                <div className="ov-hint">按 Space / Enter 重新開始</div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="hint">
        <span>P1: WASD</span>
        <span>•</span>
        <span>P2: 方向鍵</span>
        <span>•</span>
        <span>Space / Enter 開始/暫停</span>
      </p>
    </div>
  );
}
