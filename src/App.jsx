import { useReducer, useState, useEffect, useRef } from 'react'
import './App.css'

const GRID = 20
const CELL = 24
const SIZE = GRID * CELL

// Food types with different shapes and score ranges
const FOOD_TYPES = [
  { type: 'apple', shape: 'circle', color: '#f87171', minScore: 8, maxScore: 12 },     // 紅蘋果
  { type: 'cherry', shape: 'double', color: '#fb923c', minScore: 10, maxScore: 15 },   // 櫻桃
  { type: 'grape', shape: 'cluster', color: '#a78bfa', minScore: 5, maxScore: 10 },    // 葡萄
  { type: 'lemon', shape: 'oval', color: '#facc15', minScore: 7, maxScore: 13 },       // 檸檬
  { type: 'berry', shape: 'star', color: '#f472b6', minScore: 9, maxScore: 14 },       // 莓果
]

// Hazard types - dangerous items that reduce score
const HAZARD_TYPES = [
  { type: 'bomb', shape: 'skull', color: '#ef4444', minPenalty: 5, maxPenalty: 15 },      // 炸彈
  { type: 'poison', shape: 'cross', color: '#8b5cf6', minPenalty: 8, maxPenalty: 12 },    // 毒藥
  { type: 'spike', shape: 'triangle', color: '#f59e0b', minPenalty: 6, maxPenalty: 14 },  // 尖刺
]

// Difficulty settings: baseSpeed = initial interval, minSpeed = fastest possible
const DIFFICULTIES = {
  easy: { label: '簡單', baseSpeed: 180, minSpeed: 100 },
  medium: { label: '中等', baseSpeed: 100, minSpeed: 60 },
  hard: { label: '困難', baseSpeed: 60, minSpeed: 40 },
}

// Snake color presets: body (RGB array), head (hex), eye matches background
const SNAKE_COLORS = {
  green: { label: '經典綠', body: [74, 222, 128], head: '#bbf7d0', preview: '#4ade80' },
  blue: { label: '海洋藍', body: [56, 189, 248], head: '#bae6fd', preview: '#38bdf8' },
  purple: { label: '神秘紫', body: [167, 139, 250], head: '#ddd6fe', preview: '#a78bfa' },
  pink: { label: '櫻花粉', body: [244, 114, 182], head: '#fbcfe8', preview: '#f472b6' },
  orange: { label: '烈焰橙', body: [251, 146, 60], head: '#fed7aa', preview: '#fb923c' },
  cyan: { label: '極光青', body: [34, 211, 238], head: '#cffafe', preview: '#22d3ee' },
  yellow: { label: '閃電黃', body: [250, 204, 21], head: '#fef9c3', preview: '#facc15' },
  red: { label: '熱血紅', body: [248, 113, 113], head: '#fecaca', preview: '#f87171' },
}

const THEMES = [
  { // 0-40: Deep ocean
    bg: '#0f172a', grid: '#1e293b',
    body: [74, 222, 128], head: '#bbf7d0', food: '#f87171', eye: '#0f172a',
  },
  { // 50-90: Purple night
    bg: '#1a0a2e', grid: '#2d1b4e',
    body: [167, 139, 250], head: '#ddd6fe', food: '#fb923c', eye: '#1a0a2e',
  },
  { // 100-140: Teal abyss
    bg: '#042f2e', grid: '#134e4a',
    body: [45, 212, 191], head: '#ccfbf1', food: '#f472b6', eye: '#042f2e',
  },
  { // 150-190: Crimson fire
    bg: '#1c0a0a', grid: '#3b1515',
    body: [251, 146, 60], head: '#fed7aa', food: '#a78bfa', eye: '#1c0a0a',
  },
  { // 200+: Golden realm
    bg: '#1a1500', grid: '#3d3200',
    body: [250, 204, 21], head: '#fef9c3', food: '#22d3ee', eye: '#1a1500',
  },
]

function getTheme(score) {
  const level = Math.min(Math.floor(score / 50), THEMES.length - 1)
  return THEMES[level]
}

const DIRS = {
  ArrowUp:    { x: 0, y: -1 },
  ArrowDown:  { x: 0, y: 1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
  a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
  W: { x: 0, y: -1 }, S: { x: 0, y: 1 },
  A: { x: -1, y: 0 }, D: { x: 1, y: 0 },
}

function initSnake() {
  return [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
}

function randFood(snake, hazard = null) {
  let p
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (
    snake.some(s => s.x === p.x && s.y === p.y) ||
    (hazard && hazard.x === p.x && hazard.y === p.y)
  )

  // Randomly select a food type
  const foodType = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)]

  // Generate random score within the food type's range
  const score = Math.floor(Math.random() * (foodType.maxScore - foodType.minScore + 1)) + foodType.minScore

  return {
    x: p.x,
    y: p.y,
    type: foodType.type,
    shape: foodType.shape,
    color: foodType.color,
    score: score
  }
}

function randHazard(snake, food) {
  let p
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (
    snake.some(s => s.x === p.x && s.y === p.y) ||
    (food.x === p.x && food.y === p.y)
  )

  // Randomly select a hazard type
  const hazardType = HAZARD_TYPES[Math.floor(Math.random() * HAZARD_TYPES.length)]

  // Generate random penalty within the hazard type's range
  const penalty = Math.floor(Math.random() * (hazardType.maxPenalty - hazardType.minPenalty + 1)) + hazardType.minPenalty

  return {
    x: p.x,
    y: p.y,
    type: hazardType.type,
    shape: hazardType.shape,
    color: hazardType.color,
    penalty: penalty
  }
}

function startState() {
  const snake = initSnake()
  const food = randFood(snake)
  const hazard = randHazard(snake, food)
  return { snake, food, hazard, dir: { x: 1, y: 0 }, status: 'running', score: 0 }
}

function makeIdle() {
  const snake = initSnake()
  const food = randFood(snake)
  const hazard = randHazard(snake, food)
  return { snake, food, hazard, dir: { x: 1, y: 0 }, status: 'idle', score: 0 }
}

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE':
      if (state.status === 'dying') return state
      if (state.status === 'idle' || state.status === 'gameover') return startState()
      if (state.status === 'running') return { ...state, status: 'paused' }
      if (state.status === 'paused') return { ...state, status: 'running' }
      return state

    case 'DIR': {
      const d = action.dir
      if (d.x === -state.dir.x && d.y === -state.dir.y) return state
      return { ...state, dir: d }
    }

    case 'TICK': {
      if (state.status !== 'running') return state
      const { snake, food, hazard, dir } = state
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }

      if (
        head.x < 0 || head.x >= GRID ||
        head.y < 0 || head.y >= GRID ||
        snake.some(s => s.x === head.x && s.y === head.y)
      ) {
        return { ...state, status: 'dying' }
      }

      const ateFood = head.x === food.x && head.y === food.y
      const ateHazard = head.x === hazard.x && head.y === hazard.y

      let newSnake, newFood, newHazard, newScore

      if (ateFood) {
        // Ate food: grow snake, increase score, generate new food
        newSnake = [head, ...snake]
        newScore = state.score + food.score
        newHazard = hazard
        newFood = randFood(newSnake, newHazard)
      } else if (ateHazard) {
        // Ate hazard: don't grow, decrease score (min 0), generate new hazard
        newSnake = [head, ...snake.slice(0, -1)]
        newScore = Math.max(0, state.score - hazard.penalty)
        newFood = food
        newHazard = randHazard(newSnake, newFood)
      } else {
        // Normal move: no growth
        newSnake = [head, ...snake.slice(0, -1)]
        newScore = state.score
        newFood = food
        newHazard = hazard
      }

      return {
        ...state,
        snake: newSnake,
        food: newFood,
        hazard: newHazard,
        score: newScore,
      }
    }

    case 'DEAD':
      if (state.status === 'dying') return { ...state, status: 'gameover' }
      return state

    default:
      return state
  }
}

function drawBgAndGrid(ctx, theme) {
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.strokeStyle = theme.grid
  ctx.lineWidth = 0.5
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke()
  }
}

function drawFood(ctx, food) {
  const cx = food.x * CELL + CELL / 2
  const cy = food.y * CELL + CELL / 2
  const radius = CELL / 2 - 3

  ctx.fillStyle = food.color

  switch (food.shape) {
    case 'circle': // Apple - simple circle
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
      break

    case 'double': // Cherry - two small circles
      ctx.beginPath()
      ctx.arc(cx - 4, cy + 2, radius * 0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + 4, cy + 2, radius * 0.6, 0, Math.PI * 2)
      ctx.fill()
      break

    case 'cluster': // Grape - cluster of small circles
      const positions = [
        { x: 0, y: -3 },
        { x: -4, y: 2 },
        { x: 4, y: 2 },
        { x: 0, y: 5 }
      ]
      positions.forEach(pos => {
        ctx.beginPath()
        ctx.arc(cx + pos.x, cy + pos.y, radius * 0.5, 0, Math.PI * 2)
        ctx.fill()
      })
      break

    case 'oval': // Lemon - oval shape
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1.2, 0.8)
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      break

    case 'star': // Berry - star shape
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.fill()
      break

    default:
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fill()
  }
}

function drawHazard(ctx, hazard) {
  const cx = hazard.x * CELL + CELL / 2
  const cy = hazard.y * CELL + CELL / 2
  const size = CELL / 2 - 2

  ctx.fillStyle = hazard.color
  ctx.strokeStyle = hazard.color
  ctx.lineWidth = 2.5

  switch (hazard.shape) {
    case 'skull': // Skull shape
      // Head circle
      ctx.beginPath()
      ctx.arc(cx, cy - 2, size * 0.7, 0, Math.PI * 2)
      ctx.fill()

      // Eyes (using theme background would be better, but we'll use black)
      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath()
      ctx.arc(cx - 3, cy - 4, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx + 3, cy - 4, 2, 0, Math.PI * 2)
      ctx.fill()

      // Jaw
      ctx.fillStyle = hazard.color
      ctx.fillRect(cx - 4, cy + 3, 8, 4)
      break

    case 'cross': // X mark (poison)
      ctx.beginPath()
      ctx.moveTo(cx - size, cy - size)
      ctx.lineTo(cx + size, cy + size)
      ctx.moveTo(cx + size, cy - size)
      ctx.lineTo(cx - size, cy + size)
      ctx.stroke()

      // Add circle border
      ctx.beginPath()
      ctx.arc(cx, cy, size, 0, Math.PI * 2)
      ctx.stroke()
      break

    case 'triangle': // Warning triangle with exclamation
      // Triangle
      ctx.beginPath()
      ctx.moveTo(cx, cy - size)
      ctx.lineTo(cx - size, cy + size)
      ctx.lineTo(cx + size, cy + size)
      ctx.closePath()
      ctx.fill()

      // Exclamation mark
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(cx - 1.5, cy - 4, 3, 6)
      ctx.fillRect(cx - 1.5, cy + 4, 3, 2)
      break

    default:
      ctx.beginPath()
      ctx.arc(cx, cy, size, 0, Math.PI * 2)
      ctx.fill()
  }
}

function drawCanvas(ctx, state, snakeColor) {
  const { snake, food, hazard, dir } = state
  const theme = getTheme(state.score)
  const customSnake = SNAKE_COLORS[snakeColor]

  drawBgAndGrid(ctx, theme)

  // Food - draw with different shapes
  drawFood(ctx, food)

  // Hazard - draw dangerous items
  if (hazard) {
    drawHazard(ctx, hazard)
  }

  // Snake body - use custom color
  const [r, g, b] = customSnake.body
  snake.slice(1).forEach(({ x, y }, i) => {
    const alpha = 1 - (i / snake.length) * 0.6
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.beginPath()
    ctx.roundRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4, 3)
    ctx.fill()
  })

  // Snake head - use custom color
  const h = snake[0]
  ctx.fillStyle = customSnake.head
  ctx.beginPath()
  ctx.roundRect(h.x * CELL + 1, h.y * CELL + 1, CELL - 2, CELL - 2, 5)
  ctx.fill()

  // Eyes - use theme background color for contrast
  ctx.fillStyle = theme.eye
  const cx = h.x * CELL + CELL / 2
  const cy = h.y * CELL + CELL / 2
  const perp = { x: dir.y, y: -dir.x }
  const eyeForward = 5
  const eyeSide = 4
  ctx.beginPath()
  ctx.arc(cx + dir.x * eyeForward + perp.x * eyeSide, cy + dir.y * eyeForward + perp.y * eyeSide, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + dir.x * eyeForward - perp.x * eyeSide, cy + dir.y * eyeForward - perp.y * eyeSide, 2, 0, Math.PI * 2)
  ctx.fill()
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, makeIdle)
  const [highScore, setHighScore] = useState(() => +(localStorage.getItem('snakeHighScore') || 0))
  const canvasRef = useRef(null)
  const [isNewRecord, setIsNewRecord] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [snakeColor, setSnakeColor] = useState('green')

  // Handle difficulty change - update difficulty and restart if not idle
  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty)
    if (state.status !== 'idle') {
      dispatch({ type: 'TOGGLE' }) // Restart game
    }
  }

  // Update high score
  useEffect(() => {
    if (state.score > 0 && state.score > highScore) {
      setHighScore(state.score)
      localStorage.setItem('snakeHighScore', state.score)
    }
  }, [state.score])

  // Track new record on game over
  useEffect(() => {
    if (state.status === 'dying' && state.score > 0) {
      setIsNewRecord(state.score >= highScore)
    } else if (state.status === 'running') {
      setIsNewRecord(false)
    }
  }, [state.status])

  // Game loop (speed increases with score, based on difficulty)
  const { baseSpeed, minSpeed } = DIFFICULTIES[difficulty]
  const speed = Math.max(minSpeed, baseSpeed - Math.floor(state.score / 10) * 5)
  useEffect(() => {
    if (state.status !== 'running') return
    const id = setInterval(() => dispatch({ type: 'TICK' }), speed)
    return () => clearInterval(id)
  }, [state.status, speed])

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        dispatch({ type: 'TOGGLE' })
        return
      }
      const dir = DIRS[e.key]
      if (dir) {
        e.preventDefault()
        dispatch({ type: 'DIR', dir })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Death animation
  useEffect(() => {
    if (state.status !== 'dying') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const wrap = canvas.parentElement
    wrap.classList.add('shaking')

    const startTime = performance.now()
    const duration = 800
    const { snake, food, hazard } = state
    const theme = getTheme(state.score)
    const customSnake = SNAKE_COLORS[snakeColor]
    const [br, bg, bb] = customSnake.body

    const particles = snake.map(() => ({
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 0.5,
      rot: (Math.random() - 0.5) * 8,
    }))

    let rafId
    const animate = (now) => {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = 1 - (1 - t) * (1 - t)

      drawBgAndGrid(ctx, theme)

      if (t < 0.3) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.4 * (1 - t / 0.3)})`
        ctx.fillRect(0, 0, SIZE, SIZE)
      }

      drawFood(ctx, food)
      if (hazard) {
        drawHazard(ctx, hazard)
      }

      const fadeAlpha = 1 - ease
      particles.forEach((p, i) => {
        const seg = snake[i]
        const ox = p.vx * ease * CELL * 2.5
        const oy = p.vy * ease * CELL * 2.5
        const scale = 1 - ease * 0.5
        const halfSize = (CELL - 4) * scale / 2

        if (i === 0) {
          ctx.fillStyle = `rgba(239, 68, 68, ${fadeAlpha})`
        } else {
          const a = (1 - (i / snake.length) * 0.6) * fadeAlpha
          ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${a})`
        }

        ctx.save()
        ctx.translate(seg.x * CELL + CELL / 2 + ox, seg.y * CELL + CELL / 2 + oy)
        ctx.rotate(p.rot * ease)
        ctx.beginPath()
        ctx.roundRect(-halfSize, -halfSize, halfSize * 2, halfSize * 2, i === 0 ? 5 : 3)
        ctx.fill()
        ctx.restore()
      })

      if (t < 1) {
        rafId = requestAnimationFrame(animate)
      } else {
        wrap.classList.remove('shaking')
        dispatch({ type: 'DEAD' })
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(rafId)
      wrap.classList.remove('shaking')
    }
  }, [state.status, snakeColor])

  // Draw
  useEffect(() => {
    if (state.status === 'dying') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    drawCanvas(ctx, state, snakeColor)
  }, [state, snakeColor])

  return (
    <div className="app">
      <h1 className="title">貪食蛇</h1>

      <div className="scores">
        <div className="score-box">
          <div className="score-label">分數</div>
          <div className="score-num">{state.score}</div>
        </div>
        <div className="score-box">
          <div className="score-label">最高分</div>
          <div className="score-num">{highScore}</div>
        </div>
      </div>

      <div className="settings-row">
        <div className="setting-group">
          <div className="setting-label">難度</div>
          <div className="difficulty-selector">
            {Object.entries(DIFFICULTIES).map(([key, { label }]) => (
              <button
                key={key}
                className={`diff-btn ${difficulty === key ? 'active' : ''}`}
                onClick={() => handleDifficultyChange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">蛇的顏色</div>
          <div className="color-selector">
            {Object.entries(SNAKE_COLORS).map(([key, { label, preview }]) => (
              <button
                key={key}
                className={`color-btn ${snakeColor === key ? 'active' : ''}`}
                style={{ '--color': preview }}
                onClick={() => setSnakeColor(key)}
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

        {state.status !== 'running' && state.status !== 'dying' && (
          <div className="overlay">
            {state.status === 'idle' && (
              <>
                <div className="ov-icon">🐍</div>
                <div className="ov-title">貪食蛇</div>
                <div className="ov-hint">按 Space / Enter 開始</div>
              </>
            )}
            {state.status === 'paused' && (
              <>
                <div className="ov-title">暫停中</div>
                <div className="ov-hint">按 Space / Enter 繼續</div>
              </>
            )}
            {state.status === 'gameover' && (
              <>
                <div className="ov-title">遊戲結束</div>
                <div className="ov-score">得分 {state.score}</div>
                {isNewRecord && <div className="ov-record">🎉 新紀錄！</div>}
                <div className="ov-hint">按 Space / Enter 重新開始</div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="hint">
        <span>方向鍵 / WASD 控制方向</span>
        <span>•</span>
        <span>Space / Enter 開始/暫停</span>
      </p>
    </div>
  )
}
