import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";

const BALL_TYPES = [
  { level: 1, radius: 22, color: "#ffe94d", emoji: "😐", name: "무표정", score: 10 },
  { level: 2, radius: 28, color: "#ffe94d", emoji: "🙂", name: "웃음", score: 20 },
  { level: 3, radius: 34, color: "#ffe94d", emoji: "😮", name: "놀람", score: 40 },
  { level: 4, radius: 42, color: "#ffe94d", emoji: "😀", name: "기쁨", score: 80 },
  { level: 5, radius: 50, color: "#ffe94d", emoji: "😊", name: "편안함", score: 160 },
  { level: 6, radius: 58, color: "#ffe94d", emoji: "😁", name: "행복", score: 320 },
  { level: 7, radius: 66, color: "#ffe94d", emoji: "🧐", name: "의심", score: 640 },
  { level: 8, radius: 76, color: "#ffe94d", emoji: "😩", name: "불안", score: 1280 },
  { level: 9, radius: 88, color: "#ffe94d", emoji: "😡", name: "분노", score: 2560 },
  { level: 10, radius: 98, color: "#ffe94d", emoji: "🤬", name: "폭발", score: 5000 },
  { level: 11, radius: 108, color: "#ffe94d", emoji: "🤯", name: "멘붕", score: 10000 },
];

function randomLevel() {
  return Math.floor(Math.random() * 4) + 1;
}

const GAME_WIDTH = 360;
const GAME_HEIGHT = 540;
const DEADLINE = 105;
const SAFE_GAP = 1000;

function BubbleWord({ text, colors, size = 62 }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "1px",
        margin: "0 10px",
        whiteSpace: "nowrap",
      }}
    >
      {text.split("").map((ch, i) => (
        <span
          key={`${text}-${i}`}
          style={{
            display: "inline-block",
            position: "relative",
            fontSize: `${size}px`,
            fontWeight: "1000",
            lineHeight: 0.9,
            color: colors[i % colors.length],
            letterSpacing: "-5px",
            transform: `rotate(${i % 2 === 0 ? "-5deg" : "5deg"}) translateY(${i % 3 === 0 ? "3px" : "-2px"})`,
            WebkitTextStroke: "3px #111",
            textShadow:
              "4px 5px 0 rgba(0,0,0,0.18), -3px -3px 0 rgba(255,255,255,0.9), 2px -2px 0 rgba(255,255,255,0.8)",
            filter: "drop-shadow(0 5px 0 rgba(0,0,0,0.14))",
          }}
        >
          {ch}
          <span
            style={{
              position: "absolute",
              top: "12%",
              left: "24%",
              width: `${size * 0.18}px`,
              height: `${size * 0.32}px`,
              borderRadius: "999px",
              background: "rgba(255,255,255,0.9)",
              transform: "rotate(-25deg)",
              pointerEvents: "none",
            }}
          />
        </span>
      ))}
    </span>
  );
}

function BubbleTitle({ small = false }) {
  const size = small ? 38 : 62;

  return (
    <div
      style={{
        textAlign: "center",
        margin: small ? "0 0 12px 0" : "0 0 26px 0",
        transform: small ? "scale(0.95)" : "scale(1)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          rowGap: small ? "2px" : "8px",
        }}
      >
        <BubbleWord text="EMOJI" size={size} colors={["#ff75a8", "#ff8fc2", "#ffb16f", "#ffd85c", "#fff37a"]} />
        <BubbleWord text="MERGE" size={size} colors={["#b5ff8f", "#a2f7a1", "#8cf4db", "#7de8e3", "#94fff1"]} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          marginTop: small ? "-4px" : "-2px",
        }}
      >
        <BubbleWord text="GAME" size={size} colors={["#e574ff", "#d95dff", "#caff7c", "#8df47f"]} />
      </div>
    </div>
  );
}

function createGame({
  scene,
  isAI = false,
  onScore,
  initialLevel,
  getNextLevel,
  onDropped,
  onCombo,
  difficulty,
  onGameOver,
}) {
  const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;
  const engine = Engine.create();
  engine.world.gravity.y = 1.35;

  const render = Render.create({
    element: scene,
    engine,
    options: {
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      wireframes: false,
      background: "transparent",
    },
  });

  let particles = [];

  function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color,
        size: Math.random() * 4 + 2,
      });
    }
  }

  function chooseSafeAiX() {
    const bodies = Matter.Composite.allBodies(engine.world).filter(
      (body) => body.level && !body.isCurrent && !body.isStatic
    );

    const candidates = [];
    for (let x = 45; x <= GAME_WIDTH - 45; x += 22) {
      candidates.push(x);
    }

    let bestX = GAME_WIDTH / 2;
    let bestScore = -Infinity;

    candidates.forEach((x) => {
      let highestTop = GAME_HEIGHT;
      let sameLevelBonus = 0;
      let crowdedPenalty = 0;

      bodies.forEach((body) => {
        const distance = Math.abs(body.position.x - x);
        const bodyTop = body.position.y - (body.circleRadius || 0);

        if (distance < 70) {
          highestTop = Math.min(highestTop, bodyTop);
          crowdedPenalty += Math.max(0, 70 - distance) * 0.15;

          if (currentBall && body.level === currentBall.level) {
            sameLevelBonus += Math.max(0, 70 - distance) * 1.4;
          }
        }
      });

      const heightSafety = highestTop;
      const centerBonus = 40 - Math.abs(x - GAME_WIDTH / 2) * 0.12;
      const dangerPenalty = highestTop < DEADLINE + 95 ? 350 : 0;
      const randomNoise = Math.random() * 20;

      const totalScore =
        heightSafety + centerBonus + sameLevelBonus + randomNoise - crowdedPenalty - dangerPenalty;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestX = x;
      }
    });

    return Math.max(45, Math.min(GAME_WIDTH - 45, bestX));
  }

  Events.on(render, "afterRender", () => {
    const context = render.context;
    const bodies = Matter.Composite.allBodies(engine.world);

    bodies.forEach((body) => {
      if (body.level) {
        const type = BALL_TYPES[body.level - 1];
        const { x, y } = body.position;
        const radius = body.circleRadius;

        context.save();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
        context.font = `${Math.floor(radius * 1.65)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(type.emoji, x, y + radius * 0.04);
        context.restore();
      }
    });

    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;

      context.save();
      context.globalAlpha = p.life;
      context.fillStyle = p.color;
      context.shadowBlur = 5;
      context.shadowColor = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  });

  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 10, GAME_WIDTH, 20, {
    isStatic: true,
    render: { fillStyle: "#1b1b1b" },
  });

  const leftWall = Bodies.rectangle(0, GAME_HEIGHT / 2, 20, GAME_HEIGHT, {
    isStatic: true,
    render: { fillStyle: "#1b1b1b" },
  });

  const rightWall = Bodies.rectangle(GAME_WIDTH, GAME_HEIGHT / 2, 20, GAME_HEIGHT, {
    isStatic: true,
    render: { fillStyle: "#1b1b1b" },
  });

  World.add(engine.world, [ground, leftWall, rightWall]);

  function createBall(x, y, level, isCurrent = false) {
    const type = BALL_TYPES[level - 1];

    const ball = Bodies.circle(x, y, type.radius, {
      restitution: 0.2,
      friction: 0.1,
      render: { visible: false },
    });

    ball.level = level;
    ball.isCurrent = isCurrent;

    if (isCurrent) Body.setStatic(ball, true);

    return ball;
  }

  let currentBall = createBall(GAME_WIDTH / 2, 45, initialLevel, true);
  World.add(engine.world, currentBall);

  let canDrop = true;
  let comboCount = 0;

  const handleDropSequence = (xPos) => {
    if (!canDrop || !currentBall.isCurrent) return;

    canDrop = false;
    comboCount = 0;
    currentBall.isCurrent = false;
    Body.setStatic(currentBall, false);

    const droppedBall = currentBall;
    let checkCount = 0;

    const waitInterval = setInterval(() => {
      checkCount++;

      if (droppedBall.speed < 0.25 || checkCount > 10) {
        clearInterval(waitInterval);

        const levelToCreate = isAI ? randomLevel() : getNextLevel();

        if (!isAI && onDropped) onDropped();

        currentBall = createBall(xPos, 45, levelToCreate, true);
        World.add(engine.world, currentBall);
        canDrop = true;
      }
    }, 100);
  };

  let overTime = 0;

  const checkInterval = setInterval(() => {
    const bodies = Matter.Composite.allBodies(engine.world);
    let isTouching = false;

    for (let body of bodies) {
      if (!body.isStatic && !body.isCurrent && body.position.y < DEADLINE) {
        isTouching = true;
        break;
      }
    }

    if (isTouching) {
      overTime += 500;

      if (overTime > 2000) {
        onGameOver("LINE_OVER");
        clearInterval(checkInterval);
      }
    } else {
      overTime = 0;
    }
  }, 500);

  if (!isAI) {
    const guideLineX = { current: GAME_WIDTH / 2 };

    const mouseMoveHandler = (e) => {
      const rect = scene.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      guideLineX.current = Math.max(35, Math.min(GAME_WIDTH - 35, mouseX));
    };

    const mouseDownHandler = () => handleDropSequence(guideLineX.current);

    scene.addEventListener("mousemove", mouseMoveHandler);
    scene.addEventListener("mousedown", mouseDownHandler);

    Events.on(engine, "beforeUpdate", () => {
      if (!currentBall.isCurrent) return;
      Body.setPosition(currentBall, { x: guideLineX.current, y: 45 });
    });

    engine.cleanupListeners = () => {
      scene.removeEventListener("mousemove", mouseMoveHandler);
      scene.removeEventListener("mousedown", mouseDownHandler);
      clearInterval(checkInterval);
    };
  }

  if (isAI) {
    const diffSettings = {
      Easy: { start: 2500, accel: 30, min: 1000 },
      Normal: { start: 1800, accel: 50, min: 700 },
      Hard: { start: 1000, accel: 100, min: 400 },
    };

    const setting = diffSettings[difficulty] || diffSettings.Normal;
    let aiIntervalTime = setting.start;
    let aiTimer = null;

    engine.isPaused = false;

    const aiLoop = () => {
      if (!engine.isPaused && canDrop) {
        const rx = chooseSafeAiX();
        Body.setPosition(currentBall, { x: rx, y: 45 });
        handleDropSequence(rx);
      }

      aiIntervalTime = Math.max(setting.min, aiIntervalTime - setting.accel);
      aiTimer = setTimeout(aiLoop, aiIntervalTime);
    };

    aiTimer = setTimeout(aiLoop, aiIntervalTime);
    engine.aiTimer = aiTimer;

    engine.cleanupAI = () => {
      clearTimeout(aiTimer);
      clearInterval(checkInterval);
    };

    engine.pauseAI = (duration) => {
      engine.isPaused = true;

      if (engine.pauseTimeout) clearTimeout(engine.pauseTimeout);

      engine.pauseTimeout = setTimeout(() => {
        engine.isPaused = false;
      }, duration);
    };
  }

  Events.on(engine, "collisionStart", (event) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;

      if (bodyA.level && bodyB.level && bodyA.level === bodyB.level) {
        if (bodyA.isCurrent || bodyB.isCurrent) return;

        if (!isAI) {
          comboCount++;
          onCombo(comboCount);
        }

        createParticles(
          (bodyA.position.x + bodyB.position.x) / 2,
          (bodyA.position.y + bodyB.position.y) / 2,
          BALL_TYPES[bodyA.level - 1].color,
          isAI ? 8 : 15 + comboCount * 2
        );

        if (bodyA.level === BALL_TYPES.length) {
          World.remove(engine.world, [bodyA, bodyB]);
          onScore(BALL_TYPES[BALL_TYPES.length - 1].score);
          return;
        }

        const nextLevel = bodyA.level + 1;

        const newBall = createBall(
          (bodyA.position.x + bodyB.position.x) / 2,
          (bodyA.position.y + bodyB.position.y) / 2,
          nextLevel
        );

        World.remove(engine.world, [bodyA, bodyB]);
        World.add(engine.world, newBall);

        onScore(BALL_TYPES[nextLevel - 1].score);
      }
    });
  });

  return { engine, render, runner };
}

function GameCanvas() {
  const [gameState, setGameState] = useState("MENU");
  const [difficulty, setDifficulty] = useState("Normal");
  const [gameOverReason, setGameOverReason] = useState("");
  const [bestScore, setBestScore] = useState(() =>
    parseInt(localStorage.getItem("mergeChase_bestScore") || "0", 10)
  );

  const [score, setScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [nextLevel, setNextLevel] = useState(randomLevel());
  const nextLevelRef = useRef(nextLevel);
  const [comboText, setComboText] = useState("");
  const [comboKey, setComboKey] = useState(0);
  const [isAiPaused, setIsAiPaused] = useState(false);
  const [shake, setShake] = useState(false);

  const aiSceneRef = useRef(null);
  const playerSceneRef = useRef(null);
  const aiGameInstance = useRef(null);
  const playerGameInstance = useRef(null);
  const stunTimeoutRef = useRef(null);

  const scoreGap = score - aiScore;
  const neededGap = Math.max(0, SAFE_GAP - scoreGap);
  const leadPercent = Math.max(0, Math.min(100, Math.round((scoreGap / SAFE_GAP) * 100)));
  const aiCatchPercent = Math.max(0, Math.min(100, Math.round(((SAFE_GAP - scoreGap) / SAFE_GAP) * 100)));

  const isDanger = gameState === "PLAYING" && score >= 1000 && scoreGap >= 0 && scoreGap <= 300;

  useEffect(() => {
    nextLevelRef.current = nextLevel;
  }, [nextLevel]);

  useEffect(() => {
    if (gameState === "PLAYING" && score >= 1000 && aiScore >= score) {
      endGame("AI_WIN");
    }
  }, [aiScore, score, gameState]);

  const handleCombo = (count) => {
    if (count < 2) return;

    setComboText(`COMBO X${count}!`);
    setComboKey((prev) => prev + 1);
    setShake(true);

    setTimeout(() => setShake(false), 200);

    let pauseTime = count === 2 ? 2000 : count === 3 ? 3500 : 5000;

    setIsAiPaused(true);

    if (aiGameInstance.current) aiGameInstance.current.engine.pauseAI(pauseTime);

    if (stunTimeoutRef.current) clearTimeout(stunTimeoutRef.current);

    stunTimeoutRef.current = setTimeout(() => {
      setIsAiPaused(false);
      stunTimeoutRef.current = null;
    }, pauseTime);

    setTimeout(() => setComboText(""), 1200);
  };

  const startGame = () => {
    setScore(0);
    setAiScore(0);
    setGameOverReason("");
    setNextLevel(randomLevel());
    setIsAiPaused(false);
    setGameState("PLAYING");
  };

  const endGame = (reason) => {
    if (gameState !== "PLAYING") return;
    setGameOverReason(reason);
    setGameState("GAMEOVER");
  };

  useEffect(() => {
    if (gameState === "GAMEOVER" && score > bestScore) {
      setBestScore(score);
      localStorage.setItem("mergeChase_bestScore", score.toString());
    }
  }, [gameState, score, bestScore]);

  useEffect(() => {
    if (gameState === "PLAYING") {
      aiGameInstance.current = createGame({
        scene: aiSceneRef.current,
        isAI: true,
        initialLevel: 1,
        difficulty,
        onScore: (s) => setAiScore((p) => p + s),
        onGameOver: () => endGame("AI_LINE"),
      });

      playerGameInstance.current = createGame({
        scene: playerSceneRef.current,
        isAI: false,
        initialLevel: 1,
        getNextLevel: () => nextLevelRef.current,
        onDropped: () => setNextLevel(randomLevel()),
        onScore: (s) => setScore((p) => p + s),
        onCombo: handleCombo,
        onGameOver: () => endGame("PLAYER_LINE"),
      });

      return () => {
        if (aiGameInstance.current) aiGameInstance.current.engine.cleanupAI();
        if (playerGameInstance.current) playerGameInstance.current.engine.cleanupListeners();
      };
    }
  }, [gameState]);

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.65) 0%, transparent 22%), linear-gradient(180deg, #fff36a 0%, #ffd83d 55%, #ffc400 100%)",
        color: "#1b1b1b",
        fontFamily: "'Segoe UI', 'Pretendard', sans-serif",
        overflowX: "hidden",
        position: "relative",
        paddingTop: "18px",
        boxSizing: "border-box",
      }}
    >
      {isDanger && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "radial-gradient(circle, transparent 40%, rgba(255,0,0,0.35) 100%)",
            animation: "blink 0.5s infinite alternate",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      )}

      <style>{`
        @keyframes blink {
          from { opacity: 0.1; }
          to { opacity: 1; }
        }

        @keyframes comboPop {
          0% { opacity: 0; transform: translate(-50%, -40%) scale(0.5); filter: blur(10px); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.4); filter: blur(0px); }
          40% { transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -60%) scale(0.8); }
        }

        @keyframes shakeEffect {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          20% { transform: translate(-3px, 0px) rotate(-1deg); }
          40% { transform: translate(3px, 2px) rotate(1deg); }
          60% { transform: translate(1px, -1px) rotate(0deg); }
          80% { transform: translate(-1px, 2px) rotate(-1deg); }
          100% { transform: translate(1px, -2px) rotate(0deg); }
        }
      `}</style>

      {(gameState === "MENU" || gameState === "GAMEOVER") && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 40px)",
            zIndex: 200,
            textAlign: "center",
            position: "relative",
          }}
        >
          <BubbleTitle />

          <div
            style={{
              marginBottom: "32px",
              padding: "20px 54px",
              border: "3px solid #1b1b1b",
              borderRadius: "32px",
              background: "rgba(255,255,255,0.62)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 0 rgba(0,0,0,0.18)",
            }}
          >
            <p style={{ fontSize: "14px", color: "#1b1b1b", margin: "0 0 5px 0", fontWeight: "900" }}>
              BEST SCORE
            </p>
            <p style={{ fontSize: "50px", color: "#d84315", fontWeight: "900", margin: 0 }}>
              {bestScore.toLocaleString()}
            </p>
          </div>

          {gameState === "GAMEOVER" && (
            <div style={{ marginBottom: "30px" }}>
              <p style={{ fontSize: "24px", color: "#d50000", fontWeight: "900" }}>
                {gameOverReason === "AI_WIN"
                  ? "AI 점수 추월 패배!"
                  : gameOverReason === "PLAYER_LINE"
                  ? "영역 초과 패배!"
                  : "AI 자멸 승리!"}
              </p>
              <p style={{ fontSize: "32px", color: "#1b1b1b", marginTop: "10px", fontWeight: "900" }}>
                SCORE: {score.toLocaleString()}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "15px", marginBottom: "34px" }}>
            {["Easy", "Normal", "Hard"].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDifficulty(lvl)}
                style={{
                  padding: "12px 32px",
                  fontSize: "17px",
                  background: difficulty === lvl ? "#1b1b1b" : "rgba(255,255,255,0.58)",
                  color: difficulty === lvl ? "#ffe94d" : "#1b1b1b",
                  border: "2px solid #1b1b1b",
                  borderRadius: "999px",
                  cursor: "pointer",
                  transition: "0.25s",
                  fontWeight: "900",
                }}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={startGame}
            style={{
              padding: "18px 86px",
              fontSize: "23px",
              background: "#1b1b1b",
              color: "#ffe94d",
              border: "none",
              borderRadius: "999px",
              cursor: "pointer",
              fontWeight: "900",
              boxShadow: "0 10px 0 rgba(0,0,0,0.25)",
            }}
          >
            {gameState === "GAMEOVER" ? "RETRY" : "START"}
          </button>
        </div>
      )}

      {gameState === "PLAYING" && (
        <div
          style={{
            animation: shake ? "shakeEffect 0.2s infinite" : "none",
            position: "relative",
            zIndex: 10,
            paddingBottom: "30px",
          }}
        >
          <BubbleTitle small />

          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                width: "1000px",
                maxWidth: "95vw",
                display: "grid",
                gridTemplateColumns: "180px 1fr 180px",
                gap: "16px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,0.62)",
                  border: "3px solid #1b1b1b",
                  borderRadius: "20px",
                  padding: "12px 15px",
                  boxShadow: "0 6px 0 rgba(0,0,0,0.18)",
                }}
              >
                <p style={{ margin: 0, fontSize: "11px", fontWeight: "900", color: "#d50000" }}>AI</p>
                <p style={{ margin: "3px 0 0", fontSize: "26px", fontWeight: "900", color: "#d50000" }}>
                  {aiScore.toLocaleString()}
                </p>
              </div>

              <div
                style={{
                  background: "rgba(17,18,22,0.96)",
                  border: "3px solid #1b1b1b",
                  borderRadius: "24px",
                  padding: "13px 18px",
                  boxShadow: "0 7px 0 rgba(0,0,0,0.25)",
                  color: "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "900", color: "#ffe94d" }}>
                    CHASE GAUGE
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: neededGap === 0 ? "#73ff8f" : "#ffdf6b" }}>
                    {neededGap === 0 ? "SAFE +1000" : `need +${neededGap.toLocaleString()}`}
                  </span>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "19px",
                    background: "#2d2e35",
                    borderRadius: "999px",
                    overflow: "hidden",
                    border: "2px solid rgba(255,255,255,0.12)",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: `${leadPercent}%`,
                      height: "100%",
                      background:
                        neededGap === 0
                          ? "linear-gradient(90deg, #39ff88 0%, #b6ff3b 100%)"
                          : "linear-gradient(90deg, #ffeb3b 0%, #ff9800 100%)",
                      borderRadius: "999px",
                      transition: "width 0.25s ease",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "7px",
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#b8bbc7",
                  }}
                >
                  <span>AI catch {aiCatchPercent}%</span>
                  <span>gap {scoreGap >= 0 ? "+" : ""}{scoreGap.toLocaleString()}</span>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.62)",
                  border: "3px solid #1b1b1b",
                  borderRadius: "20px",
                  padding: "12px 15px",
                  boxShadow: "0 6px 0 rgba(0,0,0,0.18)",
                  textAlign: "right",
                }}
              >
                <p style={{ margin: 0, fontSize: "11px", fontWeight: "900", color: "#1b1b1b" }}>PLAYER</p>
                <p style={{ margin: "3px 0 0", fontSize: "26px", fontWeight: "900", color: "#1b1b1b" }}>
                  {score.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "28px",
              justifyContent: "center",
              alignItems: "flex-start",
              position: "relative",
              zIndex: 10,
            }}
          >
            {comboText && (
              <div
                key={comboKey}
                style={{
                  position: "absolute",
                  top: "40%",
                  left: "50%",
                  zIndex: 100,
                  color: "#d50000",
                  fontSize: "62px",
                  fontWeight: "900",
                  textShadow: "0 0 20px white, 0 0 5px black",
                  pointerEvents: "none",
                  animation: "comboPop 1.2s forwards",
                  fontStyle: "italic",
                }}
              >
                {comboText}
              </div>
            )}

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  marginBottom: "9px",
                  color: isAiPaused ? "#777" : "#d50000",
                  fontSize: "14px",
                  fontWeight: "900",
                  transition: "0.3s",
                  letterSpacing: "0.4px",
                }}
              >
                {isAiPaused ? "AI STUNNED" : "OPPONENT AI"}
              </div>

              <div
                style={{
                  position: "relative",
                  width: `${GAME_WIDTH}px`,
                  height: `${GAME_HEIGHT}px`,
                  border: "4px solid #1b1b1b",
                  borderRadius: "26px",
                  overflow: "hidden",
                  background: "#fff7a8",
                  filter: isAiPaused ? "brightness(0.45)" : "none",
                  transition: "0.5s",
                  boxShadow: "0 10px 0 rgba(0,0,0,0.25)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: `${DEADLINE}px`,
                    left: 0,
                    width: "100%",
                    height: "5px",
                    background: "rgba(255,0,0,0.35)",
                    zIndex: 10,
                  }}
                />
                <div ref={aiSceneRef} />
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  marginBottom: "9px",
                  color: "#1b1b1b",
                  fontSize: "14px",
                  fontWeight: "900",
                  letterSpacing: "0.4px",
                }}
              >
                PLAYER
              </div>

              <div
                style={{
                  position: "relative",
                  width: `${GAME_WIDTH}px`,
                  height: `${GAME_HEIGHT}px`,
                  border: "4px solid #1b1b1b",
                  borderRadius: "26px",
                  overflow: "hidden",
                  background: "#fff7a8",
                  cursor: "none",
                  boxShadow: "0 10px 0 rgba(0,0,0,0.25)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: `${DEADLINE}px`,
                    left: 0,
                    width: "100%",
                    height: "5px",
                    background: "rgba(255,0,0,0.35)",
                    zIndex: 10,
                  }}
                />
                <div ref={playerSceneRef} />
              </div>
            </div>

            <div style={{ width: "200px" }}>
              <div
                style={{
                  padding: "17px",
                  background: "rgba(255,255,255,0.62)",
                  borderRadius: "24px",
                  border: "3px solid #1b1b1b",
                  boxShadow: "0 7px 0 rgba(0,0,0,0.2)",
                }}
              >
                <h3
                  style={{
                    fontSize: "12px",
                    color: "#1b1b1b",
                    textAlign: "center",
                    marginBottom: "13px",
                    fontWeight: "900",
                  }}
                >
                  EMOTION LEVEL
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                  {BALL_TYPES.map((ball) => (
                    <div
                      key={ball.level}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "11px",
                      }}
                    >
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "18px",
                        }}
                      >
                        {ball.emoji}
                      </div>
                      <span style={{ color: "#1b1b1b", fontWeight: "800" }}>
                        Lv.{ball.level} {ball.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "20px", textAlign: "right", padding: "6px" }}>
                <button
                  onClick={() => setGameState("MENU")}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#1b1b1b",
                    color: "#ffe94d",
                    border: "none",
                    borderRadius: "14px",
                    cursor: "pointer",
                    fontWeight: "900",
                    transition: "0.3s",
                    boxShadow: "0 6px 0 rgba(0,0,0,0.22)",
                  }}
                >
                  QUIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GameCanvas;