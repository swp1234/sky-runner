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
        jump() { this.velocity = JUMP_POWER; }
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
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.4 + 0.1,
                alpha: Math.random() * 0.5 + 0.3
            });
        }
    }

    // === CANVAS ===
    function resizeCanvas() {
        canvas.width = Math.min(window.innerWidth, 480);
        canvas.height = Math.min(window.innerHeight - 60, 700);
        if (state === 'menu' || state === 'ready') player.reset();
        initStars();
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

        hudScore.textContent = score;
    }

    function updateStars(dt) {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.x -= (s.speed + gameSpeed * 0.1) * dt;
            if (s.x < -2) { s.x = canvas.width + 2; s.y = Math.random() * canvas.height; }
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

    function renderBackground() {
        const theme = getCurrentThemeData();
        const bg = theme.background;

        if (bg.type === 'gradient') {
            // 그라디언트 배경
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            bg.colors.forEach((color, index) => {
                gradient.addColorStop(index / (bg.colors.length - 1), color);
            });
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bg.type === 'solid') {
            // 단색 배경
            ctx.fillStyle = bg.color || '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 그리드 효과 (네온/레트로 테마)
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

        // 스캔라인 효과 (레트로 테마)
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

    // === RENDER (Optimized) ===
    function render() {
        // 테마별 배경 렌더링
        renderBackground();

        // Stars - simple rectangles instead of arcs
        const theme = getCurrentThemeData();
        const starColor = theme.particles && theme.particles.color ? theme.particles.color : '#ffffff';
        ctx.fillStyle = starColor;
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            ctx.globalAlpha = s.alpha;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        }
        ctx.globalAlpha = 1;

        // Obstacles - 타입별 렌더링
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            ctx.save();

            if (obs.type === 'pipe' || !obs.type) {
                // 파이프 장애물
                ctx.fillStyle = obs.color + 'bb';
                ctx.fillRect(obs.x, 0, obs.width, obs.gapY);
                ctx.fillStyle = obs.color;
                ctx.fillRect(obs.x - 3, obs.gapY - 18, obs.width + 6, 18);
                ctx.fillStyle = obs.color + 'bb';
                ctx.fillRect(obs.x, obs.gapY + obs.gap, obs.width, canvas.height - obs.gapY - obs.gap);
                ctx.fillStyle = obs.color;
                ctx.fillRect(obs.x - 3, obs.gapY + obs.gap, obs.width + 6, 18);
                ctx.fillStyle = obs.color;
                ctx.globalAlpha = 0.4;
                ctx.fillRect(obs.x, obs.gapY - 2, obs.width, 2);
                ctx.fillRect(obs.x, obs.gapY + obs.gap, obs.width, 2);
                ctx.globalAlpha = 1;
            } else if (obs.type === 'meteor') {
                // 운석
                ctx.translate(obs.x, obs.y);
                ctx.rotate(obs.rotation * Math.PI / 180);
                ctx.fillStyle = obs.color;
                ctx.beginPath();
                ctx.arc(0, 0, obs.size / 2, 0, Math.PI * 2);
                ctx.fill();
                // 불타는 효과
                ctx.fillStyle = '#ff8800';
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(-obs.size / 4, -obs.size / 4, obs.size / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            } else if (obs.type === 'enemy') {
                // 적 우주선 (삼각형)
                ctx.translate(obs.x, obs.y);
                ctx.fillStyle = obs.color;
                ctx.beginPath();
                ctx.moveTo(0, -obs.size / 2);
                ctx.lineTo(-obs.size / 2, obs.size / 2);
                ctx.lineTo(obs.size / 2, obs.size / 2);
                ctx.closePath();
                ctx.fill();
            } else if (obs.type === 'laser') {
                // 레이저 벽
                ctx.translate(obs.x, obs.y);
                ctx.rotate(obs.angle * Math.PI / 180);
                ctx.fillStyle = obs.color;
                ctx.globalAlpha = 0.8;
                for (let j = 0; j < obs.count; j++) {
                    ctx.save();
                    ctx.rotate((j * 360 / obs.count + obs.patternAngle) * Math.PI / 180);
                    ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
                    ctx.restore();
                }
                ctx.globalAlpha = 1;
            } else if (obs.type === 'blackhole') {
                // 블랙홀
                ctx.translate(obs.x, obs.y);
                ctx.rotate(obs.rotation);
                ctx.fillStyle = obs.color;
                ctx.beginPath();
                ctx.arc(0, 0, obs.size / 2, 0, Math.PI * 2);
                ctx.fill();
                // 보라색 테두리
                ctx.strokeStyle = '#8e44ad';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, obs.size / 2 + 5, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        }

        // Particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * p.life, p.size * p.life);
        }
        ctx.globalAlpha = 1;

        // Player
        const skin = SKINS.find(s => s.id === selectedSkin) || SKINS[0];
        if (skin) {
            ctx.save();
            ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
            ctx.rotate(player.rotation * Math.PI / 180);
            
            // Rainbow 스킨 처리
            if (skin.color === 'rainbow') {
                const gradient = ctx.createLinearGradient(-player.size/2, -player.size/2, player.size/2, player.size/2);
                gradient.addColorStop(0, '#ff0000');
                gradient.addColorStop(0.17, '#ff7f00');
                gradient.addColorStop(0.33, '#ffff00');
                gradient.addColorStop(0.5, '#00ff00');
                gradient.addColorStop(0.67, '#0000ff');
                gradient.addColorStop(0.83, '#4b0082');
                gradient.addColorStop(1, '#9400d3');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = skin.color;
            }
            
            ctx.font = `${player.size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(skin.emoji, 0, 0);
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
        else if (state === 'playing') player.jump();
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
})();
