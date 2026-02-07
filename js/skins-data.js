// Sky Runner - Skins Data
// 10종 우주선 스킨 데이터

const SKINS_DATA = [
    {
        id: "classic",
        name: "클래식 로켓",
        nameEn: "Classic Rocket",
        description: "모든 조종사의 시작점. 신뢰할 수 있는 기본 우주선.",
        rarity: "common",
        color: "#5f27cd",
        emoji: "🚀",
        unlockCondition: "기본 제공",
        unlockType: "default",
        unlockValue: 0
    },
    {
        id: "neon",
        name: "네온 스타",
        nameEn: "Neon Star",
        description: "네온 도시의 밤하늘을 수놓는 빛나는 별.",
        rarity: "rare",
        color: "#00d2d3",
        emoji: "⭐",
        unlockCondition: "점수 500점 달성",
        unlockType: "score",
        unlockValue: 500
    },
    {
        id: "phoenix",
        name: "황금 불사조",
        nameEn: "Golden Phoenix",
        description: "전설의 불사조처럼 어떤 장애물도 뚫고 나간다.",
        rarity: "epic",
        color: "#ffa502",
        emoji: "🔥",
        unlockCondition: "광고 시청",
        unlockType: "rewarded_ad",
        unlockValue: 0
    },
    {
        id: "comet",
        name: "얼음 혜성",
        nameEn: "Ice Comet",
        description: "우주의 차가운 심연에서 온 신비로운 혜성.",
        rarity: "rare",
        color: "#74b9ff",
        emoji: "☄️",
        unlockCondition: "점수 1,000점 달성",
        unlockType: "score",
        unlockValue: 1000
    },
    {
        id: "retro",
        name: "레트로 아케이드",
        nameEn: "Retro Arcade",
        description: "80년대 아케이드 게임의 향수를 담은 픽셀 우주선.",
        rarity: "uncommon",
        color: "#ff6b6b",
        emoji: "🎮",
        unlockCondition: "10회 플레이",
        unlockType: "play_count",
        unlockValue: 10
    },
    {
        id: "stealth",
        name: "스텔스 전투기",
        nameEn: "Stealth Fighter",
        description: "어둠 속에 숨어 적을 제압하는 비밀 병기.",
        rarity: "epic",
        color: "#2d3436",
        emoji: "🛸",
        unlockCondition: "광고 시청",
        unlockType: "rewarded_ad",
        unlockValue: 0
    },
    {
        id: "rainbow",
        name: "레인보우 대시",
        nameEn: "Rainbow Dash",
        description: "무지개 색상으로 우주를 수놓는 행복한 우주선.",
        rarity: "legendary",
        color: "rainbow",
        emoji: "🌈",
        unlockCondition: "점수 5,000점 달성",
        unlockType: "score",
        unlockValue: 5000
    },
    {
        id: "blackhole",
        name: "블랙홀",
        nameEn: "Black Hole",
        description: "모든 것을 흡수하는 우주의 절대 존재.",
        rarity: "legendary",
        color: "#0c0c0c",
        emoji: "🕳️",
        unlockCondition: "점수 10,000점 달성",
        unlockType: "score",
        unlockValue: 10000
    },
    {
        id: "ufo",
        name: "UFO",
        nameEn: "UFO",
        description: "외계인이 남기고 간 미스터리한 비행 접시.",
        rarity: "rare",
        color: "#27ae60",
        emoji: "🛸",
        unlockCondition: "20회 플레이",
        unlockType: "play_count",
        unlockValue: 20
    },
    {
        id: "dragon",
        name: "우주 드래곤",
        nameEn: "Space Dragon",
        description: "전설 속 용의 힘을 가진 최강 우주선.",
        rarity: "mythic",
        color: "#c0392b",
        emoji: "🐉",
        unlockCondition: "점수 20,000점 달성",
        unlockType: "score",
        unlockValue: 20000
    }
];

// 희귀도별 색상 매핑
const RARITY_COLORS = {
    common: "#95a5a6",
    uncommon: "#27ae60",
    rare: "#3498db",
    epic: "#9b59b6",
    legendary: "#f39c12",
    mythic: "#e74c3c"
};

// 희귀도별 이름
const RARITY_NAMES = {
    common: "일반",
    uncommon: "고급",
    rare: "희귀",
    epic: "영웅",
    legendary: "전설",
    mythic: "신화"
};
