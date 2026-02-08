// Sky Runner - Themes Data
// 3종 배경 테마 데이터

const THEMES_DATA = [
    {
        id: "space",
        name: "우주",
        nameEn: "Space",
        description: "끝없이 펼쳐진 신비로운 우주",
        descriptionEn: "The endless mysterious universe",
        unlockCondition: "기본 제공",
        unlockType: "default",
        unlockValue: 0,
        background: {
            type: "gradient",
            colors: ["#1e3c72", "#2a5298", "#0f0f1e"],
            direction: "135deg",
            stars: true,
            starCount: 100
        },
        obstacles: {
            pipe: "#2ed573",
            meteor: "#ff6348",
            enemy: "#ff4757",
            laser: "#00d2d3",
            blackhole: "#0c0c0c"
        },
        particles: {
            type: "stars",
            count: 50,
            speed: 0.5,
            color: "#ffffff",
            size: [1, 3]
        }
    },
    {
        id: "neon",
        name: "네온 시티",
        nameEn: "Neon City",
        description: "사이버펑크 도시의 밤하늘",
        descriptionEn: "The night sky of a cyberpunk city",
        unlockCondition: "점수 2,000점 달성",
        unlockType: "score",
        unlockValue: 2000,
        background: {
            type: "gradient",
            colors: ["#0f0f23", "#1a1a2e", "#16213e"],
            direction: "180deg",
            grid: true,
            gridColor: "#00d2d3",
            buildings: true
        },
        obstacles: {
            pipe: "#00d2d3",
            meteor: "#ff006e",
            enemy: "#8338ec",
            laser: "#06ffa5",
            blackhole: "#ffbe0b"
        },
        particles: {
            type: "neon_glow",
            count: 30,
            colors: ["#00d2d3", "#ff006e", "#8338ec"],
            effect: "blur(10px)"
        }
    },
    {
        id: "retro",
        name: "레트로 아케이드",
        nameEn: "Retro Arcade",
        description: "80년대 아케이드 게임의 향수",
        descriptionEn: "Nostalgia of 80s arcade games",
        unlockCondition: "점수 5,000점 달성",
        unlockType: "score",
        unlockValue: 5000,
        background: {
            type: "solid",
            color: "#000000",
            grid: true,
            gridColor: "#00ff00",
            scanlines: true
        },
        obstacles: {
            pipe: "#ff0000",
            meteor: "#ff8800",
            enemy: "#ffff00",
            laser: "#00ff00",
            blackhole: "#0000ff"
        },
        particles: {
            type: "pixels",
            count: 20,
            colors: ["#ff0000", "#00ff00", "#0000ff"],
            effect: "8bit"
        }
    }
];
