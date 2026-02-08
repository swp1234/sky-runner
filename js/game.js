// ============================================
// Sky Runner - Main Game Logic (Optimized)
// Flappy Bird-style space arcade game
// HTML5 Canvas + Vanilla JS
// ============================================
(function () {
    'use strict';

    // === CONSTANTS ===
    const GRAVITY = 0.35;
    const JUMP_POWER = -6.5;
    const MAX_FALL_SPEED = 9;
    const PLAYER_SIZE = 36;
    const PIPE_WIDTH = 55;
    const BASE_GAP = 155;
    const MIN_GAP = 100;
    const BASE_SPEED = 2.5;
    const MAX_SPEED = 6;
    const SPAWN_BASE_INTERVAL = 2000;
    const STAR_COUNT = 50;
    const MAX_PARTICLES = 40;

    // === TITLES (from titles-data.js) ===
    // TITLES_DATA is loaded from titles-data.js

    // === SKINS (from skins-data.js) ===
    // SKINS_DATA is loaded from skins-data.js
    const SKINS = SKINS_DATA; // Use new data

    // === DOM ===
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const menuScreen = document.getElementById('menu-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const skinsScreen = document.getElementById('skins-screen');
    const themesScreen = document.getElementById('themes-screen');
    const statsScreen = document.getElementById('stats-screen');
    const pauseOverlay = document.getElementById('pause-overlay');
    const interstitialOverlay = document.getElementById('interstitial-overlay');
    const hudScore = document.getElementById('hud-score');
    const tapHint = document.getElementById('tap-hint');
    const hsValue = document.getElementById('hs-value');
    const goScore = document.getElementById('go-score');
    const goBest = document.getElementById('go-best');
    const goRank = document.getElementById('go-rank');
    const goNewRecord = document.getElementById('go-new-record');

    // === GAME STATE ===
    let state = 'menu';
    let score = 0;
    let passedCount = 0;
    let highScore = 0;
    let playCount = 0;
    let totalScore = 0;
    let bestStreak = 0;
    let currentStreak = 0;
    let gameSpeed = BASE_SPEED;
    let spawnTimer = 0;
    let animFrameId = null;
    let prevTimestamp = 0;
    let hasRevived = false;
    let selectedSkin = 'classic';
    let unlockedSkins = ['classic'];
    let skinTokens = 0;
    let scoreAccum = 0;
    let currentTheme = 'space';
    let unlockedThemes = ['space'];

    // === PLAYER ===
    const player = {
        x: 70, y: 0, velocity: 0, size: PLAYER_SIZE, rotation: 0,
        reset() { this.y = canvas.height / 2 - this.size / 2; this.velocity = 0; this.rotation = 0; },
        jump() { this.velocity = JUMP_POWER; },
        motionTrail: [] // Store last 4 y-positions for motion trail
    };

    // === OBJECT POOLS ===
    let obstacles = [];
    let particles = [];
    let stars = [];

    const OBSTACLE_COLORS = ['#2ed573', '#00d2d3', '#5f27cd', '#ff6348', '#ffa502'];

    function createObstacle() {
        // 점수에 따라 장애물 타입 선택
        const obstacleType = getObstacleTypeByScore(score);
        const obsData = OBSTACLES_DATA[obstacleType];
        
        // 점수 임계값 체크
        if (obsData.spawnLogic && obsData.spawnLogic.scoreThreshold && score < obsData.spawnLogic.scoreThreshold) {
            // 임계값 미달 시 파이프 생성
            const pipeData = OBSTACLES_DATA.pipe;
            const gap = Math.max(BASE_GAP - passedCount * 1.0, MIN_GAP);
            const minY = 50;
            const maxY = canvas.height - gap - 50;
            const gapY = Math.random() * (maxY - minY) + minY;
            obstacles.push({
                type: 'pipe',
                x: canvas.width + 10, 
                gapY, 
                gap, 
                width: PIPE_WIDTH, 
                passed: false,
                color: getObstacleColor('pipe'),
                scoreReward: pipeData.scoreReward
            });
            return;
        }
        
        if (obstacleType === 'pipe') {
            // 기본 파이프 장애물
            const gap = Math.max(BASE_GAP - passedCount * 1.0, MIN_GAP);
            const minY = 50;
            const maxY = canvas.height - gap - 50;
            const gapY = Math.random() * (maxY - minY) + minY;
            obstacles.push({
                type: 'pipe',
                x: canvas.width + 10, 
                gapY, 
                gap, 
                width: PIPE_WIDTH, 
                passed: false,
                color: getObstacleColor('pipe'),
                scoreReward: obsData.scoreReward
            });
        } else if (obstacleType === 'meteor') {
            // 운석 장애물
            const positions = [
                { y: 50 },
                { y: canvas.height / 2 },
                { y: canvas.height - 50 }
            ];
            const pos = positions[Math.floor(Math.random() * positions.length)];
            obstacles.push({
                type: 'meteor',
                x: canvas.width + 10,
                y: pos.y,
                size: obsData.visual.size,
                rotation: 0,
                passed: false,
                color: getObstacleColor('meteor'),
                scoreReward: obsData.scoreReward,
                vx: -gameSpeed * obsData.behavior.speed,
                vy: Math.sin(Math.random() * Math.PI * 2) * 1.5
            });
        } else if (obstacleType === 'enemy') {
            // 적 우주선
            obstacles.push({
                type: 'enemy',
                x: canvas.width + 10,
                baseY: canvas.height / 2,
                y: canvas.height / 2,
                size: obsData.visual.size,
                amplitude: obsData.behavior.amplitude,
                frequency: obsData.behavior.frequency,
                phase: Math.random() * Math.PI * 2,
                passed: false,
                color: getObstacleColor('enemy'),
                scoreReward: obsData.scoreReward
            });
        } else if (obstacleType === 'laser') {
            // 레이저 벽
            const pattern = obsData.spawnLogic.patterns[Math.floor(Math.random() * obsData.spawnLogic.patterns.length)];
            obstacles.push({
                type: 'laser',
                x: canvas.width + 10,
                y: canvas.height / 2,
                width: obsData.visual.width,
                height: obsData.visual.height,
                angle: 0,
                rotationSpeed: obsData.behavior.rotationSpeed,
                count: pattern.count,
                patternAngle: pattern.angle,
                passed: false,
                color: getObstacleColor('laser'),
                scoreReward: obsData.scoreReward
            });
        } else if (obstacleType === 'blackhole') {
            // 블랙홀
            const minY = 100;
            const maxY = canvas.height - 100;
            obstacles.push({
                type: 'blackhole',
                x: canvas.width + 10,
                y: Math.random() * (maxY - minY) + minY,
                size: obsData.visual.size,
                gravityRadius: obsData.behavior.gravityRadius,
                gravityStrength: obsData.behavior.gravityStrength,
                rotation: 0,
                passed: false,
                color: getObstacleColor('blackhole'),
                scoreReward: obsData.scoreReward
            });
        }
    }

    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                size: Math.random() * 3 + 1.5,
                color, life: 1.0,
                decay: Math.random() * 0.04 + 0.03
            });
        }
    }

    function initStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2.5 + 0.5, // Vary sizes more (0.5-3px)
                speed: Math.random() * 0.4 + 0.1,
                alpha: Math.random() * 0.5 + 0.3,
                twinklePhase: Math.random() * Math.PI * 2, // For twinkling
                isShootingStar: false
            });
        }
    }

    // === CANVAS ===
    function resizeCanvas() {
        canvas.width = Math.min(window.innerWidth, 480);
        canvas.height = Math.min(window.innerHeight - 60, 700);
        if (state === 'menu' || state === 'ready') {
            player.reset();
            player.motionTrail = [];
        }
        initStars();
        nebulaClouds = []; // Reset nebulae on resize
    }

    // === POLYFILL roundRect ===
    if (!ctx.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
            const r = Array.isArray(radii) ? radii[0] || 0 : radii || 0;
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            this.closePath();
        };
    }

    // === GAME LOOP (Fixed timestep) ===
    function gameLoop(timestamp) {
        if (state !== 'playing' && state !== 'ready') return;

        // Delta time in ms, capped to avoid spiral of death
        let deltaMs = prevTimestamp ? (timestamp - prevTimestamp) : 16.67;
        if (deltaMs > 50) deltaMs = 16.67; // cap at ~20fps worth to prevent huge jumps
        prevTimestamp = timestamp;

        const dt = deltaMs / 16.67; // normalized to 60fps

        if (state === 'playing') {
            update(dt, deltaMs);
        } else if (state === 'ready') {
            // Floating animation for ready state
            player.y = canvas.height / 2 - player.size / 2 + Math.sin(timestamp / 300) * 8;
            updateStars(dt * 0.3);
        }

        render();
        animFrameId = requestAnimationFrame(gameLoop);
    }

    function update(dt, deltaMs) {
        // Player physics
        player.velocity += GRAVITY * dt;
        player.velocity = Math.min(player.velocity, MAX_FALL_SPEED);
        player.y += player.velocity * dt;
        player.rotation = Math.min(Math.max(player.velocity * 3, -25), 60);

        if (player.y < 0) { player.y = 0; player.velocity = 0; }
        if (player.y + player.size > canvas.height) { triggerGameOver(); return; }

        // Game speed
        gameSpeed = Math.min(BASE_SPEED + passedCount * 0.07, MAX_SPEED);

        // Spawn
        spawnTimer += deltaMs;
        const interval = Math.max(SPAWN_BASE_INTERVAL - passedCount * 20, 1000);
        if (spawnTimer >= interval) {
            // 점수에 따라 장애물 타입 선택 및 확률 체크
            const obstacleType = getObstacleTypeByScore(score);
            const obsData = OBSTACLES_DATA[obstacleType];
            
            // 확률 체크
            const spawnChance = obsData.spawnLogic ? obsData.spawnLogic.spawnChance : 1.0;
            if (Math.random() < spawnChance) {
                createObstacle();
            } else {
                // 확률 실패 시 파이프 생성
                const pipeData = OBSTACLES_DATA.pipe;
                const gap = Math.max(BASE_GAP - passedCount * 1.0, MIN_GAP);
                const minY = 50;
                const maxY = canvas.height - gap - 50;
                const gapY = Math.random() * (maxY - minY) + minY;
                obstacles.push({
                    type: 'pipe',
                    x: canvas.width + 10, 
                    gapY, 
                    gap, 
                    width: PIPE_WIDTH, 
                    passed: false,
                    color: pipeData.visual.color,
                    scoreReward: pipeData.scoreReward
                });
            }
            
            spawnTimer = 0;
        }

        // Obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            const baseSpeed = gameSpeed * dt;
            
            // 타입별 업데이트
            if (obs.type === 'pipe') {
                obs.x -= baseSpeed;
            } else if (obs.type === 'meteor') {
                obs.x += obs.vx * dt;
                obs.y += obs.vy * dt;
                obs.rotation += 3 * dt;
                // 화면 밖으로 나가면 제거
                if (obs.x < -obs.size || obs.y < -obs.size || obs.y > canvas.height + obs.size) {
                    obstacles.splice(i, 1);
                    continue;
                }
            } else if (obs.type === 'enemy') {
                obs.x -= baseSpeed;
                obs.y = obs.baseY + Math.sin(obs.x * obs.frequency + obs.phase) * obs.amplitude;
            } else if (obs.type === 'laser') {
                obs.x -= baseSpeed;
                obs.angle += obs.rotationSpeed * dt;
            } else if (obs.type === 'blackhole') {
                obs.x -= baseSpeed;
                obs.rotation += 2 * dt;
                // 블랙홀 중력 효과
                const dx = obs.x - player.x;
                const dy = obs.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < obs.gravityRadius && distance > 0) {
                    const force = obs.gravityStrength * (1 - distance / obs.gravityRadius) * dt;
                    player.velocity += (dy / distance) * force;
                }
            } else {
                // 기본 파이프 (하위 호환)
                obs.x -= baseSpeed;
            }

            // 통과 체크
            if (!obs.passed) {
                let passed = false;
                if (obs.type === 'pipe') {
                    passed = obs.x + obs.width < player.x;
                } else {
                    passed = obs.x + (obs.size || obs.width || 0) < player.x;
                }
                
                if (passed) {
                    obs.passed = true;
                    passedCount++;
                    score += obs.scoreReward || 10;
                    currentStreak++;
                    if (sfx) sfx.coin();
                    if (currentStreak > bestStreak) bestStreak = currentStreak;
                    if (currentStreak >= 3 && currentStreak % 3 === 0) {
                        score += 5;
                        spawnParticles(player.x + player.size, player.y + player.size / 2, '#ffa502', 6);
                    }
                    const centerY = obs.gapY ? obs.gapY + obs.gap / 2 : obs.y;
                    spawnParticles(obs.x + (obs.width || obs.size || 0), centerY, obs.color, 4);
                }
            }

            // 화면 밖으로 나간 장애물 제거
            const removeX = obs.type === 'pipe' ? -obs.width - 20 : -100;
            if (obs.x < removeX) {
                obstacles.splice(i, 1);
            }
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.decay * dt;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Stars
        updateStars(dt);

        // Collision
        checkCollisions();

        // Continuous score
        scoreAccum += dt * 0.4;
        if (scoreAccum >= 1) {
            const oldScore = score;
            score += Math.floor(scoreAccum);
            scoreAccum -= Math.floor(scoreAccum);

            // 점수 증가 시 테마 언락 체크
            if (score > oldScore) {
                checkThemeUnlock();
            }
        }

        // Update motion trail (store last 4 y-positions)
        player.motionTrail.push(player.y);
        if (player.motionTrail.length > 4) {
            player.motionTrail.shift();
        }

        // Score display update with pop effect
        if (hudScore.textContent !== score.toString()) {
            hudScore.textContent = score;
            hudScore.classList.add('score-pop');
            setTimeout(() => hudScore.classList.remove('score-pop'), 300);
        }
    }

    function updateStars(dt) {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.x -= (s.speed + gameSpeed * 0.1) * dt;
            if (s.x < -2) { s.x = canvas.width + 2; s.y = Math.random() * canvas.height; }

            // Twinkling effect - randomly change alpha
            if (Math.random() < 0.05) {
                s.twinklePhase = Math.random() * Math.PI * 2;
            }
            s.alpha = Math.abs(Math.sin(s.twinklePhase + dt * 2)) * 0.5 + 0.2;

            // 1% chance per frame to create a shooting star
            if (!s.isShootingStar && Math.random() < 0.01) {
                s.isShootingStar = true;
                s.shootingStartX = s.x;
                s.shootingStartY = s.y;
                s.shootingLife = 1.0;
            }
        }
    }

    function checkCollisions() {
        const px = player.x + player.size * 0.15;
        const py = player.y + player.size * 0.15;
        const ps = player.size * 0.7;

        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            let collision = false;

            if (obs.type === 'pipe' || !obs.type) {
                // 파이프 충돌
                if (px + ps > obs.x && px < obs.x + obs.width) {
                    if (py < obs.gapY || py + ps > obs.gapY + obs.gap) {
                        collision = true;
                    }
                }
            } else if (obs.type === 'meteor') {
                // 운석 충돌 (원형)
                const dx = px + ps / 2 - obs.x;
                const dy = py + ps / 2 - obs.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const radius = (obs.size || 50) / 2;
                if (distance < radius + ps / 2) {
                    collision = true;
                }
            } else if (obs.type === 'enemy') {
                // 적 우주선 충돌 (삼각형 근사)
                const dx = px + ps / 2 - obs.x;
                const dy = py + ps / 2 - obs.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const radius = (obs.size || 45) / 2;
                if (distance < radius + ps / 2) {
                    collision = true;
                }
            } else if (obs.type === 'laser') {
                // 레이저 충돌 (회전하는 직선)
                const centerX = obs.x;
                const centerY = obs.y;
                const angle = obs.angle * Math.PI / 180;
                const halfHeight = obs.height / 2;
                
                for (let j = 0; j < obs.count; j++) {
                    const laserAngle = angle + (j * 360 / obs.count + obs.patternAngle) * Math.PI / 180;
                    const cos = Math.cos(laserAngle);
                    const sin = Math.sin(laserAngle);
                    
                    // 레이저 선분과 플레이어 충돌 체크 (단순화)
                    const dist = Math.abs((px + ps / 2 - centerX) * sin - (py + ps / 2 - centerY) * cos);
                    if (dist < obs.width / 2 + ps / 2) {
                        const proj = (px + ps / 2 - centerX) * cos + (py + ps / 2 - centerY) * sin;
                        if (Math.abs(proj) < halfHeight + ps / 2) {
                            collision = true;
                            break;
                        }
                    }
                }
            } else if (obs.type === 'blackhole') {
                // 블랙홀 충돌 (원형)
                const dx = px + ps / 2 - obs.x;
                const dy = py + ps / 2 - obs.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const radius = (obs.size || 80) / 2;
                if (distance < radius + ps / 2) {
                    collision = true;
                }
            }

            if (collision) {
                triggerGameOver();
                return;
            }
        }
    }

    // === THEME FUNCTIONS ===
    function getCurrentThemeData() {
        return THEMES_DATA.find(t => t.id === currentTheme) || THEMES_DATA[0];
    }

    function checkThemeUnlock() {
        const themes = THEMES_DATA;
        // 게임 중에는 현재 점수, 게임 오버 후에는 최고 점수 기준
        const checkScore = state === 'playing' || state === 'ready' ? score : highScore;
        
        for (let i = 0; i < themes.length; i++) {
            const theme = themes[i];
            if (unlockedThemes.includes(theme.id)) continue;
            
            if (theme.unlockType === 'default') {
                if (!unlockedThemes.includes(theme.id)) {
                    unlockedThemes.push(theme.id);
                }
            } else if (theme.unlockType === 'score' && checkScore >= theme.unlockValue) {
                if (!unlockedThemes.includes(theme.id)) {
                    unlockedThemes.push(theme.id);
                    // 새 테마 언락 알림 (선택적)
                }
            }
        }
    }

    // Pre-computed nebula cloud positions (stable across frames)
    let nebulaClouds = [];
    function initNebulae() {
        nebulaClouds = [];
        for (let i = 0; i < 4; i++) {
            nebulaClouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: 60 + Math.random() * 100,
                hue: 220 + Math.random() * 80, // blue-purple range
                speed: 0.08 + Math.random() * 0.12
            });
        }
    }

    function renderBackground() {
        const theme = getCurrentThemeData();
        const bg = theme.background;

        if (bg.type === 'gradient') {
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            bg.colors.forEach((color, index) => {
                gradient.addColorStop(index / (bg.colors.length - 1), color);
            });
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bg.type === 'solid') {
            ctx.fillStyle = bg.color || '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Nebula clouds (space theme only, subtle)
        if (!bg.grid && !bg.scanlines) {
            if (nebulaClouds.length === 0) initNebulae();
            for (let i = 0; i < nebulaClouds.length; i++) {
                const n = nebulaClouds[i];
                n.x -= n.speed;
                if (n.x + n.r < 0) { n.x = canvas.width + n.r; n.y = Math.random() * canvas.height; }
                ctx.globalAlpha = 0.04;
                const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
                ng.addColorStop(0, `hsla(${n.hue},60%,50%,0.3)`);
                ng.addColorStop(0.5, `hsla(${n.hue},50%,40%,0.1)`);
                ng.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = ng;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // Grid effect (neon/retro themes)
        if (bg.grid) {
            ctx.strokeStyle = bg.gridColor || '#00d2d3';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            const gridSize = 40;
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Scanline effect (retro theme)
        if (bg.scanlines) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.1;
            for (let y = 0; y < canvas.height; y += 4) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }

    function getObstacleColor(obstacleType) {
        const theme = getCurrentThemeData();
        if (theme.obstacles && theme.obstacles[obstacleType]) {
            return theme.obstacles[obstacleType];
        }
        // 기본 색상 (fallback)
        const defaults = {
            pipe: '#2ed573',
            meteor: '#ff6348',
            enemy: '#ff4757',
            laser: '#00d2d3',
            blackhole: '#0c0c0c'
        };
        return defaults[obstacleType] || '#ffffff';
    }

    // === RENDER HELPERS ===
    // Draw detailed spaceship body (used for player)
    function drawSpaceship(cx, cy, size, color, rotation, skinId) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation * Math.PI / 180);
        const s = size;
        const half = s / 2;

        // Engine exhaust flame (animated)
        const flameFlicker = Math.sin(Date.now() * 0.02) * 3;
        const flameLen = half * 0.7 + flameFlicker;
        ctx.globalAlpha = 0.7;
        const flameGrad = ctx.createLinearGradient(-half, 0, -half - flameLen, 0);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.2, '#ffdd57');
        flameGrad.addColorStop(0.5, '#ff8c00');
        flameGrad.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(-half * 0.6, -s * 0.12);
        ctx.quadraticCurveTo(-half - flameLen * 0.6, 0, -half * 0.6, s * 0.12);
        ctx.lineTo(-half - flameLen, 0);
        ctx.closePath();
        ctx.fill();
        // Inner flame (white-hot core)
        ctx.globalAlpha = 0.5;
        const innerGrad = ctx.createLinearGradient(-half * 0.6, 0, -half - flameLen * 0.4, 0);
        innerGrad.addColorStop(0, '#ffffff');
        innerGrad.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.moveTo(-half * 0.55, -s * 0.05);
        ctx.quadraticCurveTo(-half - flameLen * 0.3, 0, -half * 0.55, s * 0.05);
        ctx.lineTo(-half - flameLen * 0.4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Ship body gradient
        const bodyGrad = ctx.createLinearGradient(0, -half, 0, half);
        if (color === 'rainbow') {
            bodyGrad.addColorStop(0, '#ff0000');
            bodyGrad.addColorStop(0.2, '#ff7f00');
            bodyGrad.addColorStop(0.4, '#ffff00');
            bodyGrad.addColorStop(0.6, '#00ff00');
            bodyGrad.addColorStop(0.8, '#0000ff');
            bodyGrad.addColorStop(1, '#9400d3');
        } else {
            bodyGrad.addColorStop(0, lightenColor(color, 40));
            bodyGrad.addColorStop(0.5, color);
            bodyGrad.addColorStop(1, darkenColor(color, 40));
        }

        // Main fuselage (streamlined shape)
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(half, 0);                               // Nose tip
        ctx.quadraticCurveTo(half * 0.6, -s * 0.2, 0, -s * 0.22); // Upper nose curve
        ctx.lineTo(-half * 0.6, -s * 0.18);               // Upper body
        ctx.lineTo(-half * 0.6, s * 0.18);                // Lower body
        ctx.lineTo(0, s * 0.22);                           // Lower nose curve
        ctx.quadraticCurveTo(half * 0.6, s * 0.2, half, 0);
        ctx.closePath();
        ctx.fill();

        // Top wing
        ctx.fillStyle = darkenColor(color === 'rainbow' ? '#3498db' : color, 20);
        ctx.beginPath();
        ctx.moveTo(-half * 0.1, -s * 0.18);
        ctx.lineTo(-half * 0.55, -half * 0.95);
        ctx.lineTo(-half * 0.7, -half * 0.9);
        ctx.lineTo(-half * 0.6, -s * 0.16);
        ctx.closePath();
        ctx.fill();

        // Bottom wing
        ctx.beginPath();
        ctx.moveTo(-half * 0.1, s * 0.18);
        ctx.lineTo(-half * 0.55, half * 0.95);
        ctx.lineTo(-half * 0.7, half * 0.9);
        ctx.lineTo(-half * 0.6, s * 0.16);
        ctx.closePath();
        ctx.fill();

        // Cockpit window (glossy)
        const cockpitGrad = ctx.createRadialGradient(half * 0.25, -s * 0.02, 0, half * 0.25, -s * 0.02, s * 0.12);
        cockpitGrad.addColorStop(0, 'rgba(180,230,255,0.9)');
        cockpitGrad.addColorStop(0.5, 'rgba(100,180,255,0.7)');
        cockpitGrad.addColorStop(1, 'rgba(40,80,160,0.5)');
        ctx.fillStyle = cockpitGrad;
        ctx.beginPath();
        ctx.ellipse(half * 0.25, 0, s * 0.09, s * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cockpit highlight
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.ellipse(half * 0.3, -s * 0.02, s * 0.03, s * 0.02, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Hull highlight (specular)
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(half * 0.8, -s * 0.03);
        ctx.quadraticCurveTo(half * 0.2, -s * 0.15, -half * 0.3, -s * 0.12);
        ctx.lineTo(-half * 0.3, -s * 0.08);
        ctx.quadraticCurveTo(half * 0.2, -s * 0.1, half * 0.8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    // Draw enemy fighter (detailed)
    function drawEnemyShip(cx, cy, size, color) {
        ctx.save();
        ctx.translate(cx, cy);
        const s = size;
        const half = s / 2;

        // Enemy faces LEFT (approaching player)
        // Engine glow
        ctx.globalAlpha = 0.5;
        const eGrad = ctx.createRadialGradient(half * 0.4, 0, 0, half * 0.4, 0, s * 0.3);
        eGrad.addColorStop(0, '#ff4444');
        eGrad.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = eGrad;
        ctx.beginPath();
        ctx.arc(half * 0.4, 0, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Body
        const bGrad = ctx.createLinearGradient(0, -half, 0, half);
        bGrad.addColorStop(0, lightenColor(color, 30));
        bGrad.addColorStop(0.5, color);
        bGrad.addColorStop(1, darkenColor(color, 30));
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.moveTo(-half, 0);                              // Nose (pointed left)
        ctx.lineTo(-half * 0.2, -s * 0.15);
        ctx.lineTo(half * 0.5, -s * 0.12);
        ctx.lineTo(half * 0.5, s * 0.12);
        ctx.lineTo(-half * 0.2, s * 0.15);
        ctx.closePath();
        ctx.fill();

        // Top wing (angled aggressively)
        ctx.fillStyle = darkenColor(color, 30);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.13);
        ctx.lineTo(half * 0.5, -half);
        ctx.lineTo(half * 0.6, -half * 0.85);
        ctx.lineTo(half * 0.4, -s * 0.1);
        ctx.closePath();
        ctx.fill();

        // Bottom wing
        ctx.beginPath();
        ctx.moveTo(0, s * 0.13);
        ctx.lineTo(half * 0.5, half);
        ctx.lineTo(half * 0.6, half * 0.85);
        ctx.lineTo(half * 0.4, s * 0.1);
        ctx.closePath();
        ctx.fill();

        // Red cockpit (menacing)
        ctx.fillStyle = 'rgba(255,50,50,0.8)';
        ctx.beginPath();
        ctx.ellipse(-half * 0.35, 0, s * 0.06, s * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Draw meteor with surface detail
    function drawMeteor(cx, cy, size, color, rotation) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation * Math.PI / 180);
        const r = size / 2;

        // Fire trail (behind meteor)
        const trailGrad = ctx.createLinearGradient(r, 0, r + size, 0);
        trailGrad.addColorStop(0, 'rgba(255,120,0,0.6)');
        trailGrad.addColorStop(0.3, 'rgba(255,80,0,0.3)');
        trailGrad.addColorStop(1, 'rgba(255,40,0,0)');
        ctx.fillStyle = trailGrad;
        ctx.beginPath();
        ctx.moveTo(r * 0.5, -r * 0.4);
        ctx.quadraticCurveTo(r + size * 0.6, -r * 0.1, r + size, 0);
        ctx.quadraticCurveTo(r + size * 0.6, r * 0.1, r * 0.5, r * 0.4);
        ctx.closePath();
        ctx.fill();

        // Outer glow
        ctx.globalAlpha = 0.3;
        const glowGrad = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.4);
        glowGrad.addColorStop(0, color);
        glowGrad.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main body (irregular)
        const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
        bodyGrad.addColorStop(0, lightenColor(color, 40));
        bodyGrad.addColorStop(0.5, color);
        bodyGrad.addColorStop(1, darkenColor(color, 50));
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        // Irregular rocky shape
        const points = 10;
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const wobble = 1 + Math.sin(angle * 3 + 1) * 0.12 + Math.cos(angle * 5 + 2) * 0.08;
            const px = Math.cos(angle) * r * wobble;
            const py = Math.sin(angle) * r * wobble;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Craters
        ctx.fillStyle = darkenColor(color, 60);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(-r * 0.2, r * 0.1, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(r * 0.25, -r * 0.25, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-r * 0.05, -r * 0.35, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.3, -r * 0.3, r * 0.3, r * 0.15, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Draw black hole with accretion disk
    function drawBlackHole(cx, cy, size, rotation) {
        ctx.save();
        ctx.translate(cx, cy);
        const r = size / 2;

        // Outer accretion disk (rotating)
        for (let ring = 3; ring >= 1; ring--) {
            ctx.save();
            ctx.rotate(rotation + ring * 0.5);
            const ringR = r + ring * 8;
            const ringGrad = ctx.createLinearGradient(-ringR, 0, ringR, 0);
            const hue = 270 + ring * 20;
            ringGrad.addColorStop(0, `hsla(${hue},80%,60%,0)`);
            ringGrad.addColorStop(0.3, `hsla(${hue},80%,60%,${0.15 + ring * 0.05})`);
            ringGrad.addColorStop(0.5, `hsla(${hue},90%,70%,${0.3 + ring * 0.05})`);
            ringGrad.addColorStop(0.7, `hsla(${hue},80%,60%,${0.15 + ring * 0.05})`);
            ringGrad.addColorStop(1, `hsla(${hue},80%,60%,0)`);
            ctx.strokeStyle = ringGrad;
            ctx.lineWidth = 3 - ring * 0.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, ringR, ringR * 0.35, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Gravitational lensing glow
        const lensGrad = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.6);
        lensGrad.addColorStop(0, 'rgba(120,50,200,0)');
        lensGrad.addColorStop(0.5, 'rgba(140,70,220,0.15)');
        lensGrad.addColorStop(0.8, 'rgba(160,80,240,0.08)');
        lensGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lensGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon (pure black center)
        const bhGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        bhGrad.addColorStop(0, '#000000');
        bhGrad.addColorStop(0.7, '#050510');
        bhGrad.addColorStop(1, '#1a0a30');
        ctx.fillStyle = bhGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring highlight
        ctx.strokeStyle = 'rgba(180,100,255,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // Draw laser with energy glow
    function drawLaser(cx, cy, angle, color, w, h, count, patternAngle) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle * Math.PI / 180);

        for (let j = 0; j < count; j++) {
            ctx.save();
            ctx.rotate((j * 360 / count + patternAngle) * Math.PI / 180);

            // Outer glow
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = color;
            ctx.fillRect(-w, -h / 2, w * 2, h);
            ctx.globalAlpha = 0.3;
            ctx.fillRect(-w * 0.7, -h / 2, w * 1.4, h);

            // Core beam
            ctx.globalAlpha = 0.9;
            const beamGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
            beamGrad.addColorStop(0, color + '88');
            beamGrad.addColorStop(0.5, '#ffffff');
            beamGrad.addColorStop(1, color + '88');
            ctx.fillStyle = beamGrad;
            ctx.fillRect(-w / 2, -h / 2, w, h);

            // Bright center line
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-1, -h / 2, 2, h);

            ctx.restore();
        }
        ctx.globalAlpha = 1;

        // Central emitter orb
        const orbGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        orbGrad.addColorStop(0, '#ffffff');
        orbGrad.addColorStop(0.4, color);
        orbGrad.addColorStop(1, color + '00');
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Draw pipe as space station column
    function drawPipe(obs) {
        const x = obs.x, w = obs.width, gapY = obs.gapY, gap = obs.gap, color = obs.color;

        // --- Top pipe ---
        const topGrad = ctx.createLinearGradient(x, 0, x + w, 0);
        topGrad.addColorStop(0, darkenColor(color, 50));
        topGrad.addColorStop(0.2, darkenColor(color, 20));
        topGrad.addColorStop(0.5, color);
        topGrad.addColorStop(0.8, darkenColor(color, 20));
        topGrad.addColorStop(1, darkenColor(color, 50));
        ctx.fillStyle = topGrad;
        ctx.fillRect(x, 0, w, gapY);

        // Panel lines (horizontal segments)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        for (let py = 30; py < gapY; py += 30) {
            ctx.beginPath();
            ctx.moveTo(x + 2, py);
            ctx.lineTo(x + w - 2, py);
            ctx.stroke();
        }

        // Top connector (wider, with detail)
        const connGrad = ctx.createLinearGradient(x - 5, gapY - 22, x + w + 5, gapY - 22);
        connGrad.addColorStop(0, darkenColor(color, 30));
        connGrad.addColorStop(0.5, lightenColor(color, 10));
        connGrad.addColorStop(1, darkenColor(color, 30));
        ctx.fillStyle = connGrad;
        ctx.fillRect(x - 5, gapY - 22, w + 10, 22);
        // Warning stripe on connector
        ctx.fillStyle = 'rgba(255,200,0,0.15)';
        ctx.fillRect(x - 5, gapY - 22, w + 10, 4);

        // Gap indicators (danger lights)
        ctx.fillStyle = 'rgba(255,80,80,0.6)';
        const lightFlicker = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.globalAlpha = lightFlicker;
        ctx.beginPath();
        ctx.arc(x + w / 2, gapY - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Left specular highlight
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x + 2, 0, 3, gapY);

        // --- Bottom pipe ---
        const btmY = gapY + gap;
        const btmH = canvas.height - btmY;
        ctx.fillStyle = topGrad; // reuse gradient
        ctx.fillRect(x, btmY, w, btmH);

        // Panel lines
        for (let py = btmY + 30; py < canvas.height; py += 30) {
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.beginPath();
            ctx.moveTo(x + 2, py);
            ctx.lineTo(x + w - 2, py);
            ctx.stroke();
        }

        // Bottom connector
        ctx.fillStyle = connGrad;
        ctx.fillRect(x - 5, btmY, w + 10, 22);
        ctx.fillStyle = 'rgba(255,200,0,0.15)';
        ctx.fillRect(x - 5, btmY + 18, w + 10, 4);

        // Bottom danger light
        ctx.fillStyle = 'rgba(255,80,80,0.6)';
        ctx.globalAlpha = lightFlicker;
        ctx.beginPath();
        ctx.arc(x + w / 2, btmY + 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Left specular
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x + 2, btmY, 3, btmH);
    }

    // Color utility helpers
    function lightenColor(hex, amount) {
        if (hex === 'rainbow') return '#ffffff';
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0xff) + amount);
        const b = Math.min(255, (num & 0xff) + amount);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    function darkenColor(hex, amount) {
        if (hex === 'rainbow') return '#333333';
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - amount);
        const g = Math.max(0, ((num >> 8) & 0xff) - amount);
        const b = Math.max(0, (num & 0xff) - amount);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // === RENDER (Optimized) ===
    function render() {
        // Background
        renderBackground();

        // Stars - round, varied sizes, twinkling
        const theme = getCurrentThemeData();
        const starColor = theme.particles && theme.particles.color ? theme.particles.color : '#ffffff';
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            ctx.globalAlpha = s.alpha;
            ctx.fillStyle = starColor;
            ctx.beginPath();
            ctx.arc(s.x + s.size / 2, s.y + s.size / 2, s.size / 2, 0, Math.PI * 2);
            ctx.fill();

            // Shooting star with gradient trail
            if (s.isShootingStar && s.shootingLife > 0) {
                const len = 50;
                const endX = s.shootingStartX + len;
                const endY = s.shootingStartY + len * 0.6;
                const trailGrad = ctx.createLinearGradient(s.shootingStartX, s.shootingStartY, endX, endY);
                trailGrad.addColorStop(0, starColor);
                trailGrad.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.globalAlpha = s.shootingLife * 0.8;
                ctx.strokeStyle = trailGrad;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(s.shootingStartX, s.shootingStartY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                s.shootingLife -= 0.03;
                if (s.shootingLife <= 0) s.isShootingStar = false;
            }
        }
        ctx.globalAlpha = 1;

        // Obstacles
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];

            if (obs.type === 'pipe' || !obs.type) {
                drawPipe(obs);
            } else if (obs.type === 'meteor') {
                drawMeteor(obs.x, obs.y, obs.size, obs.color, obs.rotation);
            } else if (obs.type === 'enemy') {
                drawEnemyShip(obs.x, obs.y, obs.size, obs.color);
            } else if (obs.type === 'laser') {
                drawLaser(obs.x, obs.y, obs.angle, obs.color, obs.width, obs.height, obs.count, obs.patternAngle);
            } else if (obs.type === 'blackhole') {
                drawBlackHole(obs.x, obs.y, obs.size, obs.rotation);
            }
        }

        // Particles (round, glowing)
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.globalAlpha = p.life;
            // Soft glow
            const pr = p.size * p.life;
            const pGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr * 1.5);
            pGrad.addColorStop(0, p.color);
            pGrad.addColorStop(1, p.color + '00');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pr * 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Bright center
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pr * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Player
        const skin = SKINS.find(s => s.id === selectedSkin) || SKINS[0];
        if (skin) {
            // Engine trail (motion trail as exhaust)
            const trailCount = player.motionTrail.length;
            const trailColor = skin.color === 'rainbow' ? '#ff8c00' : skin.color;
            for (let i = 0; i < trailCount; i++) {
                const t = (i + 1) / (trailCount + 1);
                const trailR = player.size * 0.3 * t;
                ctx.globalAlpha = 0.1 * t;
                const tGrad = ctx.createRadialGradient(
                    player.x + player.size / 2, player.motionTrail[i] + player.size / 2, 0,
                    player.x + player.size / 2, player.motionTrail[i] + player.size / 2, trailR
                );
                tGrad.addColorStop(0, trailColor);
                tGrad.addColorStop(1, trailColor + '00');
                ctx.fillStyle = tGrad;
                ctx.beginPath();
                ctx.arc(player.x + player.size / 2, player.motionTrail[i] + player.size / 2, trailR, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Ship glow halo
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = skin.color === 'rainbow' ? '#ff7f00' : (skin.color || '#ffffff');

            // Draw detailed spaceship
            drawSpaceship(
                player.x + player.size / 2,
                player.y + player.size / 2,
                player.size,
                skin.color,
                player.rotation,
                skin.id
            );

            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.restore();
        }
    }

    // === STATE TRANSITIONS ===
    function showScreen(screen) {
        [menuScreen, gameScreen, gameoverScreen, skinsScreen, themesScreen, statsScreen].forEach(s => {
            s.classList.add('hidden');
            s.classList.remove('active');
        });
        screen.classList.remove('hidden');
        screen.classList.add('active');
    }

    function startGame() {
        showScreen(gameScreen);
        state = 'ready';
        score = 0; passedCount = 0; currentStreak = 0; scoreAccum = 0;
        gameSpeed = BASE_SPEED; spawnTimer = 0;
        obstacles = []; particles = [];
        hasRevived = false; prevTimestamp = 0;
        player.reset();
        hudScore.textContent = '0';
        tapHint.classList.remove('hidden');
        // 테마 언락 체크
        checkThemeUnlock();
        resizeCanvas();
        cancelAnimationFrame(animFrameId);
        animFrameId = requestAnimationFrame(gameLoop);
    }

    function beginPlaying() {
        if (state !== 'ready') return;
        state = 'playing';
        tapHint.classList.add('hidden');
        player.jump();
        prevTimestamp = 0;
    }

    function triggerGameOver() {
        // 게임 오버 시 테마 언락 체크
        checkThemeUnlock();
        if (state !== 'playing') return;
        state = 'gameover';
        cancelAnimationFrame(animFrameId);

        if (sfx) sfx.gameOver();
        spawnParticles(player.x + player.size / 2, player.y + player.size / 2, '#ff6348', 12);

        playCount++;
        totalScore += score;
        const isNewRecord = score > highScore;
        if (isNewRecord) highScore = score;
        skinTokens += Math.floor(score / 10);
        saveData();

        setTimeout(() => showGameOver(isNewRecord), 300);
    }

    function showGameOver(isNewRecord) {
        showScreen(gameoverScreen);
        goScore.textContent = score;
        goBest.textContent = highScore;
        const rank = getRank(score);
        goRank.innerHTML = `<span class="rank-icon">${rank.emoji}</span><span class="rank-title">${rank.name}</span>`;
        goNewRecord.classList.toggle('hidden', !isNewRecord);
        document.getElementById('btn-revive').classList.toggle('hidden', hasRevived);
        if (playCount >= 3 && playCount % 3 === 0) showInterstitialAd();
    }

    function getRank(s) {
        return getTitleByScore(s);
    }

    function revivePlayer() {
        hasRevived = true;
        showScreen(gameScreen);
        state = 'playing';
        player.y = canvas.height / 2; player.velocity = 0;
        obstacles = obstacles.filter(obs => obs.x > player.x + 150 || obs.x + obs.width < player.x - 50);
        prevTimestamp = 0;
        animFrameId = requestAnimationFrame(gameLoop);
    }

    function pauseGame() {
        if (state !== 'playing') return;
        state = 'paused';
        cancelAnimationFrame(animFrameId);
        pauseOverlay.classList.remove('hidden');
    }

    function resumeGame() {
        pauseOverlay.classList.add('hidden');
        state = 'playing';
        prevTimestamp = 0;
        animFrameId = requestAnimationFrame(gameLoop);
    }

    function goToMenu() {
        cancelAnimationFrame(animFrameId);
        state = 'menu';
        pauseOverlay.classList.add('hidden');
        showScreen(menuScreen);
        hsValue.textContent = highScore;
    }

    // === INTERSTITIAL AD ===
    function showInterstitialAd(callback) {
        interstitialOverlay.classList.remove('hidden');
        const countdownEl = document.getElementById('ad-countdown');
        const closeBtn = document.getElementById('btn-close-ad');
        let count = 5;
        closeBtn.classList.add('hidden');
        countdownEl.textContent = count;
        const interval = setInterval(() => {
            count--;
            countdownEl.textContent = count;
            if (count <= 0) { clearInterval(interval); closeBtn.classList.remove('hidden'); }
        }, 1000);
        closeBtn.onclick = () => {
            interstitialOverlay.classList.add('hidden');
            if (callback) callback();
        };
    }

    // === SKINS ===
    function checkSkinUnlock(skin) {
        if (skin.unlockType === 'default') return true;
        if (unlockedSkins.includes(skin.id)) return true;
        
        if (skin.unlockType === 'score') {
            return highScore >= skin.unlockValue;
        }
        if (skin.unlockType === 'play_count') {
            return playCount >= skin.unlockValue;
        }
        if (skin.unlockType === 'rewarded_ad') {
            return false; // 광고 시청은 별도 처리
        }
        return false;
    }

    function unlockSkinByAd(skinId) {
        if (!unlockedSkins.includes(skinId)) {
            unlockedSkins.push(skinId);
            selectedSkin = skinId;
            saveData();
            renderSkins();
        }
    }

    function showSkins() { 
        // 언락 조건 체크 및 자동 언락
        SKINS.forEach(skin => {
            if (checkSkinUnlock(skin) && !unlockedSkins.includes(skin.id)) {
                unlockedSkins.push(skin.id);
            }
        });
        saveData();
        showScreen(skinsScreen); 
        renderSkins(); 
    }

    function renderSkins() {
        const grid = document.getElementById('skins-grid');
        grid.innerHTML = SKINS.map(skin => {
            const owned = unlockedSkins.includes(skin.id);
            const active = selectedSkin === skin.id;
            const rarityColor = RARITY_COLORS[skin.rarity] || '#95a5a6';
            const rarityName = RARITY_NAMES[skin.rarity] || '일반';
            
            let unlockText = '';
            if (!owned) {
                if (skin.unlockType === 'score') {
                    unlockText = `<div class="skin-unlock">점수 ${skin.unlockValue}점 달성 필요</div>`;
                } else if (skin.unlockType === 'play_count') {
                    unlockText = `<div class="skin-unlock">${skin.unlockValue}회 플레이 필요</div>`;
                } else if (skin.unlockType === 'rewarded_ad') {
                    unlockText = `<button class="skin-unlock-btn" data-skin="${skin.id}">광고 시청하여 언락</button>`;
                }
            }
            
            return `
                <div class="skin-card ${active ? 'active' : ''} ${owned ? 'owned' : 'locked'}" data-skin="${skin.id}" style="border-color: ${rarityColor}">
                    <div class="skin-emoji">${skin.emoji}</div>
                    <div class="skin-name">${skin.name}</div>
                    <div class="skin-rarity" style="color: ${rarityColor}">${rarityName}</div>
                    <div class="skin-description">${skin.description}</div>
                    ${owned
                        ? (active ? '<div class="skin-status">사용 중</div>' : '<button class="skin-select-btn" data-skin="' + skin.id + '">선택</button>')
                        : unlockText
                    }
                </div>`;
        }).join('');

        grid.querySelectorAll('.skin-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                selectedSkin = btn.dataset.skin; 
                saveData(); 
                renderSkins(); 
            });
        });
        
        grid.querySelectorAll('.skin-unlock-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                showInterstitialAd(() => unlockSkinByAd(btn.dataset.skin));
            });
        });
    }

    // === STATS ===
    function showStats() {
        showScreen(statsScreen);
        const avg = playCount > 0 ? Math.round(totalScore / playCount) : 0;
        const rank = getRank(highScore);
        document.getElementById('stats-content').innerHTML = `
            <div class="stat-card">
                <div class="stat-row"><span>총 플레이</span><strong>${playCount}회</strong></div>
                <div class="stat-row"><span>최고 점수</span><strong>${highScore}</strong></div>
                <div class="stat-row"><span>평균 점수</span><strong>${avg}</strong></div>
                <div class="stat-row"><span>누적 점수</span><strong>${totalScore.toLocaleString()}</strong></div>
                <div class="stat-row"><span>최고 연속</span><strong>${bestStreak}회</strong></div>
                <div class="stat-row"><span>보유 토큰</span><strong>🎫 ${skinTokens}</strong></div>
                <div class="stat-row"><span>해금 스킨</span><strong>${unlockedSkins.length}/${SKINS.length}</strong></div>
                <div class="stat-row"><span>칭호</span><strong>${rank.icon} ${rank.title}</strong></div>
            </div>`;
    }

    // === SHARE ===
    function shareResult() {
        const rank = getRank(score);
        const text = `🚀 Sky Runner ${score}점!\n${rank.icon} ${rank.title}\n도전해보세요!`;
        const url = 'https://dopabrain.com/sky-runner/';
        if (navigator.share) { navigator.share({ title: 'Sky Runner', text, url }).catch(() => {}); }
        else { navigator.clipboard.writeText(text + '\n' + url).then(() => alert('복사되었습니다!')).catch(() => {}); }
    }

    // === STORAGE ===
    function saveData() {
        try { 
            localStorage.setItem('skyrunner_data', JSON.stringify({ 
                highScore, playCount, totalScore, bestStreak, 
                selectedSkin, unlockedSkins, skinTokens,
                currentTheme, unlockedThemes
            })); 
        } catch (e) {}
    }
    function loadData() {
        try {
            const d = JSON.parse(localStorage.getItem('skyrunner_data'));
            if (d) { 
                highScore = d.highScore || 0; 
                playCount = d.playCount || 0; 
                totalScore = d.totalScore || 0; 
                bestStreak = d.bestStreak || 0; 
                
                // 스킨 마이그레이션 (default -> classic)
                if (d.selectedSkin === 'default') {
                    selectedSkin = 'classic';
                } else {
                    selectedSkin = d.selectedSkin || 'classic';
                }
                
                // 언락된 스킨 마이그레이션
                if (d.unlockedSkins) {
                    unlockedSkins = d.unlockedSkins.map(s => s === 'default' ? 'classic' : s);
                    if (!unlockedSkins.includes('classic')) {
                        unlockedSkins.push('classic');
                    }
                } else {
                    unlockedSkins = ['classic'];
                }
                
                skinTokens = d.skinTokens || 0;
                
                // 테마 정보 로드
                currentTheme = d.currentTheme || 'space';
                if (d.unlockedThemes) {
                    unlockedThemes = d.unlockedThemes;
                    if (!unlockedThemes.includes('space')) {
                        unlockedThemes.push('space');
                    }
                } else {
                    unlockedThemes = ['space'];
                }
            }
        } catch (e) {}
        
        // 기본 테마 언락 확인
        checkThemeUnlock();
    }

    // === INPUT ===
    function handleInput(e) {
        if (e) e.preventDefault();
        if (state === 'ready') beginPlaying();
        else if (state === 'playing') {
            player.jump();
            if (sfx) sfx.jump();
        }
    }

    canvas.addEventListener('touchstart', handleInput, { passive: false });
    canvas.addEventListener('mousedown', handleInput);
    document.addEventListener('keydown', (e) => {
        if ((e.code === 'Space' || e.code === 'ArrowUp') && (state === 'ready' || state === 'playing')) handleInput(e);
        if (e.code === 'Escape') { if (state === 'playing') pauseGame(); else if (state === 'paused') resumeGame(); }
    });

    // === THEMES ===
    function showThemes() {
        // 테마 언락 조건 체크 및 자동 언락
        checkThemeUnlock();
        saveData();
        showScreen(themesScreen);
        renderThemes();
    }

    function renderThemes() {
        const grid = document.getElementById('themes-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        THEMES_DATA.forEach(theme => {
            const isUnlocked = unlockedThemes.includes(theme.id);
            const isSelected = currentTheme === theme.id;
            
            const card = document.createElement('div');
            card.className = `theme-card ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
            
            // 테마 미리보기 (간단한 그라디언트)
            const preview = document.createElement('div');
            preview.className = 'theme-preview';
            if (theme.background.type === 'gradient') {
                preview.style.background = `linear-gradient(${theme.background.direction || '135deg'}, ${theme.background.colors.join(', ')})`;
            } else {
                preview.style.background = theme.background.color || '#000000';
            }
            
            const info = document.createElement('div');
            info.className = 'theme-info';
            info.innerHTML = `
                <div class="theme-name">${theme.name}</div>
                <div class="theme-description">${theme.description}</div>
                ${!isUnlocked ? `<div class="theme-unlock">${theme.unlockCondition}</div>` : ''}
                ${isSelected ? '<div class="theme-selected-badge">✓ 선택됨</div>' : ''}
            `;
            
            if (isUnlocked) {
                card.addEventListener('click', () => {
                    currentTheme = theme.id;
                    saveData();
                    renderThemes();
                });
            } else {
                card.style.opacity = '0.6';
            }
            
            card.appendChild(preview);
            card.appendChild(info);
            grid.appendChild(card);
        });
    }

    // === BUTTON EVENTS ===
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-skins').addEventListener('click', showSkins);
    document.getElementById('btn-themes').addEventListener('click', showThemes);
    document.getElementById('btn-stats').addEventListener('click', showStats);
    document.getElementById('btn-pause').addEventListener('click', pauseGame);
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-quit').addEventListener('click', goToMenu);
    document.getElementById('btn-retry').addEventListener('click', startGame);
    document.getElementById('btn-menu').addEventListener('click', goToMenu);
    document.getElementById('btn-share').addEventListener('click', shareResult);
    document.getElementById('btn-skins-back').addEventListener('click', goToMenu);
    document.getElementById('btn-themes-back').addEventListener('click', goToMenu);
    document.getElementById('btn-stats-back').addEventListener('click', goToMenu);
    document.getElementById('btn-revive').addEventListener('click', () => {
        showInterstitialAd(() => revivePlayer());
    });

    window.addEventListener('resize', () => { if (state !== 'playing') resizeCanvas(); });

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

    // === INIT ===
    loadData();
    hsValue.textContent = highScore;
    resizeCanvas();
    showScreen(menuScreen);

    // === LANGUAGE SUPPORT ===
    async function initLanguageSelector() {
        await i18n.loadTranslations(i18n.currentLang);
        i18n.updateUI();

        const langBtn = document.getElementById('langBtn');
        const langMenu = document.getElementById('langMenu');

        if (!langBtn || !langMenu) return;

        // Populate language options
        langMenu.innerHTML = '';
        i18n.supportedLanguages.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = `lang-option ${lang === i18n.currentLang ? 'active' : ''}`;
            btn.textContent = i18n.getLanguageName(lang);
            btn.addEventListener('click', async () => {
                await i18n.setLanguage(lang);
                document.querySelectorAll('.lang-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                langMenu.classList.add('hidden');
            });
            langMenu.appendChild(btn);
        });

        // Toggle menu
        langBtn.addEventListener('click', () => {
            langMenu.classList.toggle('hidden');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.language-selector')) {
                langMenu.classList.add('hidden');
            }
        });
    }

    initLanguageSelector();
})();
