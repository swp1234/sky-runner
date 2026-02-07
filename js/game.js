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

    // === RANKS ===
    const RANKS = [
        { min: 0, icon: '🌱', title: '초보 조종사' },
        { min: 10, icon: '⭐', title: '견습 조종사' },
        { min: 25, icon: '🚀', title: '베테랑 조종사' },
        { min: 50, icon: '💎', title: '에이스 조종사' },
        { min: 100, icon: '👑', title: '전설의 조종사' }
    ];

    // === SKINS ===
    const SKINS = [
        { id: 'default', name: '기본 우주선', emoji: '🚀', cost: 0 },
        { id: 'ufo', name: 'UFO', emoji: '🛸', cost: 3 },
        { id: 'satellite', name: '위성', emoji: '🛰️', cost: 5 },
        { id: 'star', name: '별똥별', emoji: '🌠', cost: 8 },
        { id: 'comet', name: '혜성', emoji: '☄️', cost: 10 },
        { id: 'moon', name: '달', emoji: '🌙', cost: 15 },
        { id: 'planet', name: '행성', emoji: '🪐', cost: 20 },
        { id: 'alien', name: '외계인', emoji: '👾', cost: 25 },
        { id: 'galaxy', name: '은하', emoji: '🌌', cost: 30 },
        { id: 'blackhole', name: '블랙홀', emoji: '🕳️', cost: 50 }
    ];

    // === DOM ===
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const menuScreen = document.getElementById('menu-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    const skinsScreen = document.getElementById('skins-screen');
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
    let selectedSkin = 'default';
    let unlockedSkins = ['default'];
    let skinTokens = 0;
    let scoreAccum = 0;

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
        const gap = Math.max(BASE_GAP - passedCount * 1.0, MIN_GAP);
        const minY = 50;
        const maxY = canvas.height - gap - 50;
        const gapY = Math.random() * (maxY - minY) + minY;
        obstacles.push({
            x: canvas.width + 10, gapY, gap, width: PIPE_WIDTH, passed: false,
            color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)]
        });
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
            createObstacle();
            spawnTimer = 0;
        }

        // Obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= gameSpeed * dt;

            if (!obs.passed && obs.x + obs.width < player.x) {
                obs.passed = true;
                passedCount++;
                score += 10;
                currentStreak++;
                if (currentStreak > bestStreak) bestStreak = currentStreak;
                if (currentStreak >= 3 && currentStreak % 3 === 0) {
                    score += 5;
                    spawnParticles(player.x + player.size, player.y + player.size / 2, '#ffa502', 6);
                }
                spawnParticles(obs.x + obs.width, obs.gapY + obs.gap / 2, obs.color, 4);
            }

            if (obs.x < -obs.width - 20) {
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
            score += Math.floor(scoreAccum);
            scoreAccum -= Math.floor(scoreAccum);
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
            if (px + ps > obs.x && px < obs.x + obs.width) {
                if (py < obs.gapY || py + ps > obs.gapY + obs.gap) {
                    triggerGameOver();
                    return;
                }
            }
        }
    }

    // === RENDER (Optimized) ===
    function render() {
        ctx.fillStyle = '#0f0f1e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Stars - simple rectangles instead of arcs
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            ctx.globalAlpha = s.alpha;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        }
        ctx.globalAlpha = 1;

        // Obstacles - simplified rendering (no gradients, no shadows)
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];

            // Top pipe
            ctx.fillStyle = obs.color + 'bb';
            ctx.fillRect(obs.x, 0, obs.width, obs.gapY);

            // Top cap
            ctx.fillStyle = obs.color;
            ctx.fillRect(obs.x - 3, obs.gapY - 18, obs.width + 6, 18);

            // Bottom pipe
            ctx.fillStyle = obs.color + 'bb';
            ctx.fillRect(obs.x, obs.gapY + obs.gap, obs.width, canvas.height - obs.gapY - obs.gap);

            // Bottom cap
            ctx.fillStyle = obs.color;
            ctx.fillRect(obs.x - 3, obs.gapY + obs.gap, obs.width + 6, 18);

            // Simple glow line at gap edges
            ctx.fillStyle = obs.color;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(obs.x, obs.gapY - 2, obs.width, 2);
            ctx.fillRect(obs.x, obs.gapY + obs.gap, obs.width, 2);
            ctx.globalAlpha = 1;
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
        ctx.save();
        ctx.translate(player.x + player.size / 2, player.y + player.size / 2);
        ctx.rotate(player.rotation * Math.PI / 180);
        ctx.font = `${player.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(skin.emoji, 0, 0);
        ctx.restore();
    }

    // === STATE TRANSITIONS ===
    function showScreen(screen) {
        [menuScreen, gameScreen, gameoverScreen, skinsScreen, statsScreen].forEach(s => {
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
        goRank.innerHTML = `<span class="rank-icon">${rank.icon}</span><span class="rank-title">${rank.title}</span>`;
        goNewRecord.classList.toggle('hidden', !isNewRecord);
        document.getElementById('btn-revive').classList.toggle('hidden', hasRevived);
        if (playCount >= 3 && playCount % 3 === 0) showInterstitialAd();
    }

    function getRank(s) {
        let rank = RANKS[0];
        for (const r of RANKS) { if (s >= r.min) rank = r; }
        return rank;
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
    function showInterstitialAd() {
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
        closeBtn.onclick = () => interstitialOverlay.classList.add('hidden');
    }

    // === SKINS ===
    function showSkins() { showScreen(skinsScreen); renderSkins(); }

    function renderSkins() {
        const grid = document.getElementById('skins-grid');
        grid.innerHTML = SKINS.map(skin => {
            const owned = unlockedSkins.includes(skin.id);
            const active = selectedSkin === skin.id;
            const canBuy = !owned && skinTokens >= skin.cost;
            return `
                <div class="skin-card ${active ? 'active' : ''} ${owned ? 'owned' : ''}" data-skin="${skin.id}">
                    <div class="skin-emoji">${skin.emoji}</div>
                    <div class="skin-name">${skin.name}</div>
                    ${owned
                        ? (active ? '<div class="skin-status">사용 중</div>' : '<button class="skin-select-btn" data-skin="' + skin.id + '">선택</button>')
                        : `<button class="skin-buy-btn ${canBuy ? '' : 'disabled'}" data-skin="${skin.id}" ${canBuy ? '' : 'disabled'}>🎫 ${skin.cost}</button>`
                    }
                </div>`;
        }).join('');

        const existing = document.querySelector('.token-display');
        if (existing) existing.remove();
        grid.insertAdjacentHTML('beforebegin', `<div class="token-display">보유 토큰: 🎫 <strong>${skinTokens}</strong></div>`);

        grid.querySelectorAll('.skin-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { e.stopPropagation(); selectedSkin = btn.dataset.skin; saveData(); renderSkins(); });
        });
        grid.querySelectorAll('.skin-buy-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const skin = SKINS.find(s => s.id === btn.dataset.skin);
                if (skin && skinTokens >= skin.cost) { skinTokens -= skin.cost; unlockedSkins.push(skin.id); selectedSkin = skin.id; saveData(); renderSkins(); }
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
        const url = 'https://swp1234.github.io/sky-runner/';
        if (navigator.share) { navigator.share({ title: 'Sky Runner', text, url }).catch(() => {}); }
        else { navigator.clipboard.writeText(text + '\n' + url).then(() => alert('복사되었습니다!')).catch(() => {}); }
    }

    // === STORAGE ===
    function saveData() {
        try { localStorage.setItem('skyrunner_data', JSON.stringify({ highScore, playCount, totalScore, bestStreak, selectedSkin, unlockedSkins, skinTokens })); } catch (e) {}
    }
    function loadData() {
        try {
            const d = JSON.parse(localStorage.getItem('skyrunner_data'));
            if (d) { highScore = d.highScore || 0; playCount = d.playCount || 0; totalScore = d.totalScore || 0; bestStreak = d.bestStreak || 0; selectedSkin = d.selectedSkin || 'default'; unlockedSkins = d.unlockedSkins || ['default']; skinTokens = d.skinTokens || 0; }
        } catch (e) {}
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

    // === BUTTON EVENTS ===
    document.getElementById('btn-start').addEventListener('click', startGame);
    document.getElementById('btn-skins').addEventListener('click', showSkins);
    document.getElementById('btn-stats').addEventListener('click', showStats);
    document.getElementById('btn-pause').addEventListener('click', pauseGame);
    document.getElementById('btn-resume').addEventListener('click', resumeGame);
    document.getElementById('btn-quit').addEventListener('click', goToMenu);
    document.getElementById('btn-retry').addEventListener('click', startGame);
    document.getElementById('btn-menu').addEventListener('click', goToMenu);
    document.getElementById('btn-share').addEventListener('click', shareResult);
    document.getElementById('btn-skins-back').addEventListener('click', goToMenu);
    document.getElementById('btn-stats-back').addEventListener('click', goToMenu);
    document.getElementById('btn-revive').addEventListener('click', () => {
        showInterstitialAd();
        setTimeout(() => revivePlayer(), 5500);
    });

    window.addEventListener('resize', () => { if (state !== 'playing') resizeCanvas(); });

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

    // === INIT ===
    loadData();
    hsValue.textContent = highScore;
    resizeCanvas();
    showScreen(menuScreen);
})();
