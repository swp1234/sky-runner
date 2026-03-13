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
    const MAX_SPEED = 8;
    const SPAWN_BASE_INTERVAL = 2000;
    const STAR_COUNT = 50;
    const MAX_PARTICLES = 40;

    // === IMAGE ASSETS ===
    let bgScrollX = 0;
    const shipImg = new Image();
    let shipImgLoaded = false;
    shipImg.onload = function () { shipImgLoaded = true; };
    shipImg.src = 'assets/ship-opt.png';

    const spaceBgImg = new Image();
    let spaceBgImgLoaded = false;
    spaceBgImg.onload = function () { spaceBgImgLoaded = true; };
    spaceBgImg.src = 'assets/space-bg-opt.jpg';

    // === TITLES (from titles-data.js) ===
    // TITLES_DATA is loaded from titles-data.js

    // === SKINS (from skins-data.js) ===
    // SKINS_DATA is loaded from skins-data.js
    const SKINS = SKINS_DATA; // Use new data

    // Helper: get localized name from data objects (uses nameEn for non-Korean)
    function localName(obj) {
        const lang = (typeof i18n !== 'undefined' && i18n.currentLang) ? i18n.currentLang : 'en';
        return (lang === 'ko' ? obj.name : (obj.nameEn || obj.name));
    }

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

    // === LEADERBOARD SYSTEM ===
    let leaderboard = null;
    if (typeof LeaderboardManager !== 'undefined') {
        leaderboard = new LeaderboardManager('sky-runner', 10);
    }

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
    let powerUps = [];
    let speedLines = [];

    // === POWER-UP STATE ===
    let activeShield = false;
    let slowMoTimer = 0;
    let slowMoActive = false;

    // === DOPAMINE ENHANCEMENT STATE ===
    let currentCombo = 0;
    let comboDisplayActive = false;
    let shakeActive = false;
    let currentStage = 1;
    let stageDisplayActive = false;

    const OBSTACLE_COLORS = ['#2ed573', '#00d2d3', '#5f27cd', '#ff6348', '#ffa502'];

    // Stage 계산
    function calculateStage(passed) {
        if (passed < 10) return 1;
        if (passed < 25) return 2;
        if (passed < 50) return 3;
        return 4;
    }

    // Stage 전환 체크
    function checkStageTransition(prevPassed, newPassed) {
        const prevStage = calculateStage(prevPassed);
        const newStage = calculateStage(newPassed);
        if (prevStage !== newStage) {
            currentStage = newStage;
            showStageBanner(newStage);
        }
    }

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

        try { render(); } catch(e) { console.error('Render error:', e); }
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

        // Game speed (난이도 곡선 개선: 속도 증가율 향상)
        gameSpeed = Math.min(BASE_SPEED + passedCount * 0.08, MAX_SPEED);

        // Slow-Mo power-up: reduce speed to 60%
        slowMoActive = slowMoTimer > 0;
        if (slowMoActive) {
            gameSpeed *= 0.6;
            slowMoTimer -= deltaMs / 1000;
            if (slowMoTimer <= 0) { slowMoTimer = 0; slowMoActive = false; }
        }

        // Speed lines (appear at higher speeds for visual intensity)
        const speedRatio = (gameSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
        if (speedRatio > 0.3 && Math.random() < speedRatio * 0.4 && speedLines.length < 15) {
            speedLines.push({
                x: canvas.width + 10,
                y: Math.random() * canvas.height,
                len: 30 + Math.random() * 60 * speedRatio,
                alpha: 0.1 + speedRatio * 0.2,
                speed: gameSpeed * (1.5 + Math.random())
            });
        }
        for (let i = speedLines.length - 1; i >= 0; i--) {
            speedLines[i].x -= speedLines[i].speed * dt;
            if (speedLines[i].x + speedLines[i].len < 0) speedLines.splice(i, 1);
        }

        // Spawn (장애물 간격 최소값 감소: 1000ms → 800ms)
        spawnTimer += deltaMs;
        const interval = Math.max(SPAWN_BASE_INTERVAL - passedCount * 20, 800);
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
                    color: getObstacleColor('pipe'),
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
                    const prevPassed = passedCount;
                    passedCount++;
                    const baseReward = obs.scoreReward || 20;
                    score += baseReward;
                    if (typeof Haptic !== 'undefined') Haptic.light();
                    currentCombo++;

                    if (sfx) sfx.coin();
                    if (currentStreak > bestStreak) bestStreak = currentStreak;

                    // Stage 전환 체크
                    checkStageTransition(prevPassed, passedCount);

                    // 점수 팝업 차등화 (색상과 이펙트)
                    const popupType = baseReward < 30 ? 'small' : (baseReward < 50 ? 'medium' : 'large');
                    spawnScorePopup(player.x, player.y - 40, `+${baseReward}`, popupType);

                    // Combo bonus: 5연속 +50, 10연속 +150
                    if (currentCombo === 5) {
                        const comboBonus = 50;
                        score += comboBonus;
                        triggerScreenShake(250);
                        spawnConfetti(canvas.width / 2, canvas.height / 2, 15);
                        spawnComboIndicator(canvas.width / 2, canvas.height / 2, 5, 'gold');
                        spawnScorePopup(player.x, player.y - 100, `+${comboBonus} COMBO x5!`, 'combo5');
                    } else if (currentCombo === 10) {
                        const comboBonus = 150;
                        score += comboBonus;
                        triggerScreenShake(400, 1.5);
                        spawnConfetti(canvas.width / 2, canvas.height / 2, 25);
                        spawnComboIndicator(canvas.width / 2, canvas.height / 2, 10, 'gold');
                        spawnScorePopup(player.x, player.y - 100, `+${comboBonus} COMBO x10!`, 'combo10');
                    } else if (currentCombo > 10 && currentCombo % 5 === 0) {
                        const comboBonus = currentCombo * 15;
                        score += comboBonus;
                        triggerScreenShake(300, 1.2);
                        spawnConfetti(canvas.width / 2, canvas.height / 2, 20);
                        spawnComboIndicator(canvas.width / 2, canvas.height / 2, currentCombo, 'gold');
                        spawnScorePopup(player.x, player.y - 100, `+${comboBonus} COMBO x${currentCombo}!`, 'combo10');
                    }

                    // Milestone every 100 points (조정)
                    if (Math.floor(score / 100) > Math.floor((score - baseReward) / 100)) {
                        const milestone = Math.floor(score / 100) * 100;
                        showMilestoneBanner(milestone);
                        triggerScreenFlash('flash-success', 150);
                    }

                    if (currentStreak >= 3 && currentStreak % 3 === 0) {
                        score += 5;
                        spawnParticles(player.x + player.size, player.y + player.size / 2, '#ffa502', 6);
                    }
                    const centerY = obs.gapY ? obs.gapY + obs.gap / 2 : obs.y;
                    spawnParticles(obs.x + (obs.width || obs.size || 0), centerY, obs.color, 4);

                    // 15% chance to spawn a power-up after passing an obstacle
                    if (Math.random() < 0.15) {
                        const puType = (powerUps.length % 2 === 0) ? 'shield' : 'slowmo';
                        powerUps.push({
                            type: puType,
                            x: canvas.width + 60,
                            y: 50 + Math.random() * (canvas.height - 100),
                            size: 25,
                            collected: false,
                            pulsePhase: 0
                        });
                    }
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

        // Power-ups: move, pulse, collect
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const pu = powerUps[i];
            pu.x -= gameSpeed * dt;
            pu.pulsePhase += 0.08 * dt;

            // Off-screen removal
            if (pu.x < -50) { powerUps.splice(i, 1); continue; }

            // Circle collision with player
            const dx = (player.x + player.size / 2) - pu.x;
            const dy = (player.y + player.size / 2) - pu.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < pu.size + player.size * 0.35) {
                if (pu.type === 'shield') {
                    activeShield = true;
                    spawnParticles(pu.x, pu.y, '#4fc3f7', 8);
                } else {
                    slowMoTimer = 5;
                    spawnParticles(pu.x, pu.y, '#66bb6a', 8);
                }
                if (sfx) sfx.coin();
                if (typeof Haptic !== 'undefined') Haptic.light();
                powerUps.splice(i, 1);
            }
        }

        // Stars
        updateStars(dt);

        // Collision
        checkCollisions();

        // Continuous score (비중 축소: 0.4 → 0.1, 장애물 회피 중심)
        scoreAccum += dt * 0.1;
        if (scoreAccum >= 1) {
            const oldScore = score;
            score += Math.floor(scoreAccum);
            scoreAccum -= Math.floor(scoreAccum);

            // 점수 증가 시 테마 언락 체크
            if (score > oldScore) {
                checkThemeUnlock();
                // Score milestones
                const milestones = [500, 1000, 2000, 5000, 10000];
                for (const m of milestones) {
                    if (oldScore < m && score >= m) {
                        spawnConfetti(canvas.width / 2, canvas.height / 3, 30);
                        triggerScreenShake(400, 1.5);
                        spawnScorePopup(canvas.width / 2, canvas.height / 3, `🎉 ${m}!`, 'combo10');
                        if (typeof Haptic !== 'undefined') Haptic.heavy();
                    }
                }
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
            hudScore.classList.remove('score-pop');
            // Force reflow to restart animation
            void hudScore.offsetWidth;
            hudScore.classList.add('score-pop');
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
                if (activeShield) {
                    // Shield absorbs the hit
                    activeShield = false;
                    spawnParticles(player.x + player.size / 2, player.y + player.size / 2, '#4fc3f7', 10);
                    triggerScreenShake(200);
                    if (sfx) sfx.coin();
                    if (typeof Haptic !== 'undefined') Haptic.medium();
                    // Remove the obstacle that was hit
                    obstacles.splice(i, 1);
                    return;
                }
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

        // Space theme with loaded background image: tile horizontally with parallax
        if (spaceBgImgLoaded && currentTheme === 'space') {
            bgScrollX -= 0.3;
            const imgW = spaceBgImg.width;
            const imgH = spaceBgImg.height;
            // Scale to fill canvas height, tile horizontally
            const scale = canvas.height / imgH;
            const drawW = imgW * scale;
            const offset = ((bgScrollX % drawW) + drawW) % drawW;
            for (let x = -offset; x < canvas.width; x += drawW) {
                ctx.drawImage(spaceBgImg, x, 0, drawW, canvas.height);
            }
        } else if (bg.type === 'gradient') {
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

        // Nebula clouds (non-space themes or fallback when image not loaded)
        if (!bg.grid && !bg.scanlines && !(spaceBgImgLoaded && currentTheme === 'space')) {
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
        // Use ship sprite for classic skin when image is loaded
        if (shipImgLoaded && skinId === 'classic') {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation * Math.PI / 180);
            const drawSize = size * 1.4; // slightly larger to match procedural feel
            ctx.drawImage(shipImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            ctx.restore();
            return;
        }

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

    // === DOPAMINE EFFECT FUNCTIONS ===

    function triggerScreenShake(duration = 300, intensity = 1) {
        if (shakeActive) return;
        shakeActive = true;
        gameScreen.classList.add('shake');
        setTimeout(() => {
            gameScreen.classList.remove('shake');
            shakeActive = false;
        }, duration);
    }

    function triggerScreenFlash(color = 'flash', duration = 200) {
        gameScreen.classList.add(color);
        setTimeout(() => gameScreen.classList.remove(color), duration);
    }

    function spawnScorePopup(x, y, text, type = 'normal') {
        const popup = document.createElement('div');
        popup.className = `score-popup ${type}`;
        popup.textContent = text;
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        gameScreen.appendChild(popup);

        // 타입별 애니메이션 시간
        const duration = (type === 'combo10' || type === 'combo5') ? 1200 : 800;
        setTimeout(() => popup.remove(), duration);
    }

    function spawnComboIndicator(x, y, comboCount, color = 'gold') {
        const indicator = document.createElement('div');
        indicator.className = `combo-indicator combo-${color}`;
        indicator.style.left = x + 'px';
        indicator.style.top = y + 'px';

        const text = document.createElement('div');
        text.className = `combo-text combo-${color}`;
        text.textContent = (window.i18n?.t('game.combo') || 'COMBO') + ' x' + comboCount + '!';

        indicator.appendChild(text);
        gameScreen.appendChild(indicator);

        setTimeout(() => indicator.remove(), 800);
    }

    function spawnConfetti(x, y, count = 12) {
        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            confetti.className = `confetti type-${(i % 5) + 1}`;
            confetti.style.left = x + 'px';
            confetti.style.top = y + 'px';
            confetti.style.transform = `translate(${(Math.random() - 0.5) * 200}px, 0) rotateZ(${Math.random() * 360}deg)`;

            gameScreen.appendChild(confetti);

            // Animate confetti fall
            const duration = 800 + Math.random() * 400;
            confetti.style.animation = `confetti-fall ${duration}ms linear forwards`;

            setTimeout(() => confetti.remove(), duration);
        }
    }

    function showMilestoneBanner(milestone) {
        const banner = document.createElement('div');
        banner.className = 'milestone-banner';
        banner.innerHTML = `
            <span class="icon">🎉</span>
            <div>${(window.i18n?.t('game.milestone') || '{score} points reached!').replace('{score}', milestone)}</div>
        `;
        gameScreen.appendChild(banner);
        setTimeout(() => banner.remove(), 2000);
    }

    function showStageBanner(stage) {
        const banner = document.createElement('div');
        banner.className = 'stage-banner';
        const stageText = window.i18n?.t('game.stage' + stage) || ['Stage 1: Beginner', 'Stage 2: Challenger', 'Stage 3: Master', 'Stage 4: Legend'][stage - 1];
        banner.innerHTML = `
            <div class="stage-text">${stageText}</div>
        `;
        gameScreen.appendChild(banner);
        setTimeout(() => banner.remove(), 1500);
    }

    // Color utility helpers
    function lightenColor(hex, amount) {
        if (!hex || hex === 'rainbow') return '#ffffff';
        if (!hex.startsWith('#')) return hex;
        const num = parseInt(hex.replace('#', ''), 16);
        if (isNaN(num)) return '#ffffff';
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0xff) + amount);
        const b = Math.min(255, (num & 0xff) + amount);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    function darkenColor(hex, amount) {
        if (!hex || hex === 'rainbow') return '#333333';
        if (!hex.startsWith('#')) return hex;
        const num = parseInt(hex.replace('#', ''), 16);
        if (isNaN(num)) return '#333333';
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

        // Speed lines
        for (let i = 0; i < speedLines.length; i++) {
            const sl = speedLines[i];
            ctx.globalAlpha = sl.alpha;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sl.x, sl.y);
            ctx.lineTo(sl.x + sl.len, sl.y);
            ctx.stroke();
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

        // Power-ups (pulsing orbs with glow)
        for (let i = 0; i < powerUps.length; i++) {
            const pu = powerUps[i];
            const pulse = 1 + Math.sin(pu.pulsePhase) * 0.2;
            const r = pu.size * pulse;
            const color = pu.type === 'shield' ? '#4fc3f7' : '#66bb6a';
            const glowColor = pu.type === 'shield' ? 'rgba(79,195,247,' : 'rgba(102,187,106,';

            // Outer glow
            ctx.globalAlpha = 0.25;
            const orbGlow = ctx.createRadialGradient(pu.x, pu.y, 0, pu.x, pu.y, r * 2);
            orbGlow.addColorStop(0, glowColor + '0.5)');
            orbGlow.addColorStop(1, glowColor + '0)');
            ctx.fillStyle = orbGlow;
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, r * 2, 0, Math.PI * 2);
            ctx.fill();

            // Main orb
            ctx.globalAlpha = 0.9;
            const orbGrad = ctx.createRadialGradient(pu.x - r * 0.2, pu.y - r * 0.2, 0, pu.x, pu.y, r);
            orbGrad.addColorStop(0, '#ffffff');
            orbGrad.addColorStop(0.4, color);
            orbGrad.addColorStop(1, glowColor + '0.6)');
            ctx.fillStyle = orbGrad;
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Icon text
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pu.type === 'shield' ? '\u{1F6E1}' : '\u{23F3}', pu.x, pu.y);
        }
        ctx.globalAlpha = 1;

        // Slow-Mo screen tint
        if (slowMoActive) {
            ctx.globalAlpha = 0.08;
            ctx.fillStyle = '#66bb6a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }

        // Particles (simple circles with alpha - performance optimized)
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const pr = p.size * p.life;
            // Outer glow
            ctx.globalAlpha = p.life * 0.3;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, pr * 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Bright center
            ctx.globalAlpha = p.life;
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

            // Ship glow halo (lightweight radial gradient instead of shadowBlur)
            const glowColor = skin.color === 'rainbow' ? '#ff7f00' : (skin.color || '#ffffff');
            const gcx = player.x + player.size / 2;
            const gcy = player.y + player.size / 2;
            const glowR = player.size * 0.8;
            ctx.globalAlpha = 0.25;
            const shipGlow = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, glowR);
            shipGlow.addColorStop(0, glowColor);
            shipGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = shipGlow;
            ctx.beginPath();
            ctx.arc(gcx, gcy, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Draw detailed spaceship
            drawSpaceship(
                gcx,
                gcy,
                player.size,
                skin.color,
                player.rotation,
                skin.id
            );

            // Shield indicator (blue ring around ship)
            if (activeShield) {
                const shieldPulse = 1 + Math.sin(Date.now() * 0.006) * 0.08;
                const shieldR = player.size * 0.65 * shieldPulse;
                ctx.globalAlpha = 0.35;
                const shieldGrad = ctx.createRadialGradient(gcx, gcy, shieldR * 0.7, gcx, gcy, shieldR);
                shieldGrad.addColorStop(0, 'rgba(79,195,247,0)');
                shieldGrad.addColorStop(0.7, 'rgba(79,195,247,0.2)');
                shieldGrad.addColorStop(1, 'rgba(79,195,247,0.5)');
                ctx.fillStyle = shieldGrad;
                ctx.beginPath();
                ctx.arc(gcx, gcy, shieldR, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = '#4fc3f7';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(gcx, gcy, shieldR, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Slow-Mo timer bar
            if (slowMoTimer > 0) {
                const barW = 50;
                const barH = 5;
                const barX = gcx - barW / 2;
                const barY = gcy - player.size * 0.6 - 10;
                const fill = slowMoTimer / 5;
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = '#66bb6a';
                ctx.fillRect(barX, barY, barW * fill, barH);
                ctx.globalAlpha = 1;
            }
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
        i18n.updateUI();
    }

    function startGame() {
        showScreen(gameScreen);
        state = 'ready';
        score = 0; passedCount = 0; currentStreak = 0; scoreAccum = 0;
        gameSpeed = BASE_SPEED; spawnTimer = 0;
        obstacles = []; particles = []; powerUps = []; speedLines = [];
        activeShield = false; slowMoTimer = 0; slowMoActive = false;
        hasRevived = false; prevTimestamp = 0;
        currentCombo = 0; // Reset combo at game start
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
        if (state !== 'playing') return;
        state = 'gameover';
        // 게임 오버 시 테마 언락 체크
        checkThemeUnlock();
        cancelAnimationFrame(animFrameId);

        playCount++;
        totalScore += score;
        const isNewRecord = score > highScore;
        const previousHighScore = highScore;
        if (isNewRecord) highScore = score;
        skinTokens += Math.floor(score / 10);
        saveData();

        // Daily streak reporting
        if (typeof DailyStreak !== 'undefined') DailyStreak.report(score);

        if (typeof GameAchievements !== 'undefined') GameAchievements.report({
          highScore: highScore,
          playCount: playCount,
          bestStreak: bestStreak
        });

        // Dopamine effects on game over
        if (isNewRecord) {
            // Flash "NEW BEST!" overlay
            showNewBest();
            // Confetti and stronger effect for new record
            triggerScreenShake(700, 2);
            triggerScreenFlash('flash-success', 400);
            for (let i = 0; i < 30; i++) {
                setTimeout(() => spawnConfetti(Math.random() * canvas.width, -20, 1), i * 20);
            }
            if (sfx) sfx.coin();
        } else {
            triggerScreenShake(500, 1.5);
            triggerScreenFlash('flash-danger', 300);
            if (sfx) sfx.gameOver();
        }
        spawnParticles(player.x + player.size / 2, player.y + player.size / 2, '#ff6348', 12);
        if (typeof Haptic !== 'undefined') Haptic.heavy();
        currentCombo = 0; // Reset combo on game over
        powerUps = []; activeShield = false; slowMoTimer = 0; slowMoActive = false;

        setTimeout(() => {
            if (typeof GameAds !== 'undefined') {
                GameAds.showInterstitial({ onComplete: () => showGameOver(isNewRecord, previousHighScore) });
            } else {
                showGameOver(isNewRecord, previousHighScore);
            }
        }, 300);
    }

    function showNewBest() {
        let el = document.getElementById('new-best-flash');
        if (!el) {
            el = document.createElement('div');
            el.id = 'new-best-flash';
            el.style.cssText = 'position:fixed;top:20%;left:50%;transform:translate(-50%,-50%) scale(0);font-size:32px;font-weight:800;color:#fbbf24;text-shadow:0 0 30px rgba(251,191,36,0.6);pointer-events:none;z-index:200;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.4s;opacity:0;white-space:nowrap;';
            document.body.appendChild(el);
        }
        el.textContent = window.i18n?.t('game.newBest') || '\uD83D\uDE80 NEW BEST!';
        el.style.transform = 'translate(-50%,-50%) scale(1.2)';
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.transform = 'translate(-50%,-50%) scale(0.8)';
            el.style.opacity = '0';
        }, 1200);
    }

    function showGameOver(isNewRecord, previousHighScore) {
        // Add score to leaderboard
        let leaderboardResult = null;
        if (leaderboard) {
            leaderboardResult = leaderboard.addScore(score, {
                stage: currentStage,
                combo: currentCombo
            });
        }

        showScreen(gameoverScreen);
        goScore.textContent = score;
        goBest.textContent = highScore;
        const rank = getRank(score);
        goRank.innerHTML = `<span class="rank-icon">${rank.emoji}</span><span class="rank-title">${localName(rank)}</span>`;
        if (isNewRecord) {
            goNewRecord.textContent = i18n.t('gameover.newRecord');
            // Show improvement
            const improvement = score - previousHighScore;
            const improveEl = document.createElement('div');
            improveEl.style.cssText = 'text-align:center;color:#2ed573;font-weight:700;margin-top:8px;font-size:14px;';
            improveEl.textContent = i18n.t('records.improvement', { diff: improvement });
            goNewRecord.parentElement.insertBefore(improveEl, goNewRecord.nextSibling);
        }
        goNewRecord.classList.toggle('hidden', !isNewRecord);
        document.getElementById('btn-revive').classList.toggle('hidden', hasRevived);

        // Display leaderboard
        if (leaderboardResult) {
            displaySkyRunnerLeaderboard(leaderboardResult);
        }

        if (playCount >= 3 && playCount % 3 === 0) showInterstitialAd();
    }

    function displaySkyRunnerLeaderboard(leaderboardResult) {
        if (!leaderboard) return;

        const topScores = leaderboard.getTopScores(5);
        let html = '<div class="leaderboard-title">' + (window.i18n?.t('game.leaderboardTitle') || '🏆 Top 5 Scores') + '</div>';
        html += '<div class="leaderboard-list">';

        topScores.forEach((entry, index) => {
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
            const isCurrentScore = entry.score === score && leaderboardResult.isNewRecord;
            const classes = isCurrentScore ? 'leaderboard-item highlight' : 'leaderboard-item';

            html += `
                <div class="${classes}">
                    <span class="medal">${medals[index] || (index + 1) + '.'}</span>
                    <span class="score-value">${entry.score}</span>
                    <span class="score-date">${entry.date}</span>
                </div>
            `;
        });

        html += '</div>';

        let leaderboardContainer = gameoverScreen.querySelector('.leaderboard-section');
        if (!leaderboardContainer) {
            leaderboardContainer = document.createElement('div');
            leaderboardContainer.className = 'leaderboard-section';
            gameoverScreen.appendChild(leaderboardContainer);
        }

        leaderboardContainer.innerHTML = html;
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
        i18n.updateUI();
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
    let adInterval = null;
    function showInterstitialAd(callback) {
        interstitialOverlay.classList.remove('hidden');
        const countdownEl = document.getElementById('ad-countdown');
        const closeBtn = document.getElementById('btn-close-ad');
        let count = 5;
        closeBtn.classList.add('hidden');
        countdownEl.textContent = count;
        if (adInterval) clearInterval(adInterval);
        adInterval = setInterval(() => {
            count--;
            countdownEl.textContent = count;
            if (count <= 0) { clearInterval(adInterval); adInterval = null; closeBtn.classList.remove('hidden'); }
        }, 1000);
        closeBtn.onclick = () => {
            if (adInterval) { clearInterval(adInterval); adInterval = null; }
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
                    unlockText = `<div class="skin-unlock">${i18n.t('skins.scoreRequired').replace('{0}', skin.unlockValue)}</div>`;
                } else if (skin.unlockType === 'play_count') {
                    unlockText = `<div class="skin-unlock">${i18n.t('skins.playRequired').replace('{0}', skin.unlockValue)}</div>`;
                } else if (skin.unlockType === 'rewarded_ad') {
                    unlockText = `<button class="skin-unlock-btn" data-skin="${skin.id}">${i18n.t('skins.watchAdUnlock')}</button>`;
                }
            }

            return `
                <div class="skin-card ${active ? 'active' : ''} ${owned ? 'owned' : 'locked'}" data-skin="${skin.id}" style="border-color: ${rarityColor}">
                    <div class="skin-emoji">${skin.emoji}</div>
                    <div class="skin-name">${localName(skin)}</div>
                    <div class="skin-rarity" style="color: ${rarityColor}">${rarityName}</div>
                    <div class="skin-description">${skin.description}</div>
                    ${owned
                        ? (active ? `<div class="skin-status">${i18n.t('skins.inUse')}</div>` : `<button class="skin-select-btn" data-skin="${skin.id}">${i18n.t('skins.select')}</button>`)
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
                <div class="stat-row"><span data-i18n="stats.totalPlays">${i18n.t('stats.totalPlays')}</span><strong>${playCount}${i18n.t('stats.timesUnit')}</strong></div>
                <div class="stat-row"><span data-i18n="stats.highScore">${i18n.t('stats.highScore')}</span><strong>${highScore}</strong></div>
                <div class="stat-row"><span data-i18n="stats.avgScore">${i18n.t('stats.avgScore')}</span><strong>${avg}</strong></div>
                <div class="stat-row"><span data-i18n="stats.totalScore">${i18n.t('stats.totalScore')}</span><strong>${totalScore.toLocaleString()}</strong></div>
                <div class="stat-row"><span data-i18n="stats.bestStreak">${i18n.t('stats.bestStreak')}</span><strong>${bestStreak}${i18n.t('stats.timesUnit')}</strong></div>
                <div class="stat-row"><span data-i18n="stats.tokens">${i18n.t('stats.tokens')}</span><strong>🎫 ${skinTokens}</strong></div>
                <div class="stat-row"><span data-i18n="stats.unlockedSkins">${i18n.t('stats.unlockedSkins')}</span><strong>${unlockedSkins.length}/${SKINS.length}</strong></div>
                <div class="stat-row"><span data-i18n="stats.rank">${i18n.t('stats.rank')}</span><strong>${rank.emoji} ${localName(rank)}</strong></div>
            </div>`;
        i18n.updateUI();
    }

    // === SHARE ===
    function shareResult() {
        const rank = getRank(score);
        const text = `🚀 Sky Runner ${score}${i18n.t('share.points')}\n${rank.emoji} ${localName(rank)}\n${i18n.t('share.challenge')}`;
        const url = 'https://dopabrain.com/sky-runner/';
        if (navigator.share) { navigator.share({ title: 'Sky Runner', text, url }).catch(() => {}); }
        else { navigator.clipboard.writeText(text + '\n' + url).then(() => alert(i18n.t('share.copied'))).catch(() => {}); }
    }

    // === STORAGE ===
    function saveData() {
        try {
            localStorage.setItem('skyrunner_data', JSON.stringify({
                highScore, playCount, totalScore, bestStreak,
                selectedSkin, unlockedSkins, skinTokens,
                currentTheme, unlockedThemes
            }));
            localStorage.setItem('skyrunner_best', String(highScore));
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
            const selectedText = isSelected ? `<div class="theme-selected-badge">✓ ${i18n.t('themes.selected') || '선택됨'}</div>` : '';
            info.innerHTML = `
                <div class="theme-name">${localName(theme)}</div>
                <div class="theme-description">${i18n.currentLang === 'ko' ? theme.description : (theme.descriptionEn || theme.description)}</div>
                ${!isUnlocked ? `<div class="theme-unlock">${theme.unlockCondition}</div>` : ''}
                ${selectedText}
            `;

            if (isUnlocked) {
                card.addEventListener('click', () => {
                    currentTheme = theme.id;
                    saveData();
                    renderThemes();
                    i18n.updateUI();
                });
            } else {
                card.style.opacity = '0.6';
            }

            card.appendChild(preview);
            card.appendChild(info);
            grid.appendChild(card);
        });
        i18n.updateUI();
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
        if (typeof GameAds !== 'undefined') {
            GameAds.showRewarded({
                onReward: () => revivePlayer(),
                onSkip: () => {} // user declined
            });
        } else {
            showInterstitialAd(() => revivePlayer());
        }
    });

    window.addEventListener('resize', () => { if (state !== 'playing') resizeCanvas(); });

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

    // === THEME TOGGLE (dark/light mode) ===
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('app-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeToggle.textContent = savedTheme === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}';
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('app-theme', next);
            themeToggle.textContent = next === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}';
        });
    }

    // === INIT ===
    loadData();
    // Save dedicated bestScore key for daily-streak system
    try { localStorage.setItem('skyrunner_best', String(highScore)); } catch(e) {}
    hsValue.textContent = highScore;
    resizeCanvas();
    showScreen(menuScreen);

    // Daily streak init
    if (typeof DailyStreak !== 'undefined') {
        DailyStreak.init({ gameId: 'sky-runner', bestScoreKey: 'skyrunner_best', minTarget: 5 });
    }

    if (typeof GameAds !== 'undefined') GameAds.init();

    if (typeof GameAchievements !== 'undefined') GameAchievements.init({
      gameId: 'sky-runner',
      defs: [
        { id: 'score_20', stat: 'highScore', target: 20, icon: '\u2601\uFE0F', name: 'Cloud Jumper' },
        { id: 'score_50', stat: 'highScore', target: 50, icon: '\u2601\uFE0F', name: 'Sky Walker' },
        { id: 'score_100', stat: 'highScore', target: 100, icon: '\u2601\uFE0F', name: 'Sky Legend' },
        { id: 'plays_10', stat: 'playCount', target: 10, icon: '\uD83C\uDFAE', name: 'Regular' },
        { id: 'plays_50', stat: 'playCount', target: 50, icon: '\uD83C\uDFAE', name: 'Dedicated' },
        { id: 'streak_5', stat: 'bestStreak', target: 5, icon: '\uD83D\uDD25', name: 'Streak Starter' },
        { id: 'streak_15', stat: 'bestStreak', target: 15, icon: '\uD83D\uDD25', name: 'On Fire' },
      ]
    });

    // Score pop animation cleanup
    hudScore.addEventListener('animationend', () => hudScore.classList.remove('score-pop'));

    // === LANGUAGE SUPPORT ===
    async function initLanguageSelector() {
        try {
            await i18n.loadTranslations(i18n.currentLang);
            i18n.updateUI();

            const langBtn = document.getElementById('langBtn');
            const langMenu = document.getElementById('langMenu');

            if (!langBtn || !langMenu) return;

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

            langBtn.addEventListener('click', () => {
                langMenu.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.language-selector')) {
                    langMenu.classList.add('hidden');
                }
            });
        } catch (e) {
            console.warn('i18n init failed:', e);
        }
    }

    initLanguageSelector();

    // Hide app loader
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 300);
    }
})();
