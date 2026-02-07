// Sky Runner - Obstacles Data
// 5종 장애물 패턴 데이터

const OBSTACLES_DATA = {
    pipe: {
        type: "pipe",
        name: "파이프",
        description: "위아래로 뻗은 기본 장애물",
        difficulty: 1,
        visual: {
            color: "#2ed573",
            width: 60,
            gapSize: 150,
            height: "screen"
        },
        behavior: {
            movement: "static",
            pattern: "random_gap"
        },
        spawnLogic: {
            scoreThreshold: 0,
            spawnChance: 1.0,
            minGapY: 100,
            maxGapY: null, // canvasHeight - 200
            scoreZones: {
                perfect: 20,
                normal: 10
            }
        },
        scoreReward: 10
    },
    meteor: {
        type: "meteor",
        name: "운석",
        description: "랜덤 위치에 나타나는 우주 암석",
        difficulty: 2,
        visual: {
            color: "#ff6348",
            size: 50,
            shape: "circle",
            effect: "burning"
        },
        behavior: {
            movement: "diagonal",
            speed: 1.5,
            rotation: true
        },
        spawnLogic: {
            positions: [
                { x: null, y: 50 }, // canvas.width
                { x: null, y: null }, // canvas.height / 2
                { x: null, y: null } // canvas.height - 50
            ],
            spawnChance: 0.3,
            minInterval: 2000,
            scoreThreshold: 0
        },
        collisionBox: {
            type: "circle",
            radius: 25
        },
        scoreReward: 15
    },
    enemy: {
        type: "enemy",
        name: "적 우주선",
        description: "사인파로 움직이는 적 전투기",
        difficulty: 3,
        visual: {
            color: "#ff4757",
            size: 45,
            shape: "triangle",
            facing: "left"
        },
        behavior: {
            movement: "sine",
            amplitude: 80,
            frequency: 0.03,
            baseY: null // canvas.height / 2
        },
        spawnLogic: {
            scoreThreshold: 300,
            spawnChance: 0.2,
            minInterval: 3000
        },
        scoreReward: 20
    },
    laser: {
        type: "laser",
        name: "레이저 벽",
        description: "회전하는 레이저 장벽",
        difficulty: 4,
        visual: {
            color: "#00d2d3",
            width: 10,
            height: 200,
            effect: "glow"
        },
        behavior: {
            movement: "rotating",
            rotationSpeed: 2,
            anchorPoint: "center"
        },
        spawnLogic: {
            scoreThreshold: 500,
            spawnChance: 0.15,
            minInterval: 3000,
            patterns: [
                { count: 1, angle: 0 },
                { count: 2, angle: 90 },
                { count: 3, angle: 60 }
            ]
        },
        collisionBox: {
            type: "rectangle",
            adjustedWidth: 8
        },
        scoreReward: 25
    },
    blackhole: {
        type: "blackhole",
        name: "블랙홀",
        description: "플레이어를 끌어당기는 중력 장애물",
        difficulty: 5,
        visual: {
            color: "#0c0c0c",
            size: 80,
            shape: "circle",
            effect: "swirl"
        },
        behavior: {
            movement: "static",
            gravity: true,
            gravityRadius: 150,
            gravityStrength: 0.3
        },
        spawnLogic: {
            scoreThreshold: 1000,
            spawnChance: 0.1,
            minInterval: 5000,
            warningTime: 2000
        },
        physics: {
            affectPlayer: true,
            pullStrength: 0.3
        },
        scoreReward: 50
    }
};

// 점수 구간별 장애물 생성 확률
const OBSTACLE_SPAWN_TABLE = [
    { minScore: 0, maxScore: 100, pipe: 1.0, meteor: 0, enemy: 0, laser: 0, blackhole: 0 },
    { minScore: 101, maxScore: 300, pipe: 0.7, meteor: 0.3, enemy: 0, laser: 0, blackhole: 0 },
    { minScore: 301, maxScore: 500, pipe: 0.5, meteor: 0.3, enemy: 0.2, laser: 0, blackhole: 0 },
    { minScore: 501, maxScore: 1000, pipe: 0.4, meteor: 0.25, enemy: 0.2, laser: 0.15, blackhole: 0 },
    { minScore: 1001, maxScore: 999999, pipe: 0.3, meteor: 0.25, enemy: 0.2, laser: 0.15, blackhole: 0.1 }
];

// 점수로 장애물 타입 선택
function getObstacleTypeByScore(score) {
    const table = OBSTACLE_SPAWN_TABLE.find(t => score >= t.minScore && score <= t.maxScore) || OBSTACLE_SPAWN_TABLE[OBSTACLE_SPAWN_TABLE.length - 1];
    const rand = Math.random();
    let acc = 0;
    
    if (rand < (acc += table.pipe)) return 'pipe';
    if (rand < (acc += table.meteor)) return 'meteor';
    if (rand < (acc += table.enemy)) return 'enemy';
    if (rand < (acc += table.laser)) return 'laser';
    return 'blackhole';
}
