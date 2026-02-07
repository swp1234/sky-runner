// Sky Runner - Titles Data
// 20개 칭호 시스템 데이터

const TITLES_DATA = [
    // 초보 단계 (0~500점)
    {
        id: "beginner",
        name: "우주 초보자",
        nameEn: "Space Newbie",
        emoji: "🌱",
        minScore: 0,
        maxScore: 50,
        description: "첫 발을 내딛은 신참 조종사",
        color: "#95a5a6",
        rarity: "common",
        message: "모든 위대한 여정은 첫 걸음부터!"
    },
    {
        id: "explorer",
        name: "별빛 탐험가",
        nameEn: "Starlight Explorer",
        emoji: "⭐",
        minScore: 51,
        maxScore: 100,
        description: "우주의 신비를 탐험하기 시작했어요",
        color: "#3498db",
        rarity: "common",
        message: "좋아요! 계속 나아가세요!"
    },
    {
        id: "apprentice",
        name: "견습 조종사",
        nameEn: "Apprentice Pilot",
        emoji: "🚀",
        minScore: 101,
        maxScore: 200,
        description: "조종 실력이 느는 중입니다",
        color: "#27ae60",
        rarity: "uncommon",
        message: "제법인데요? 점점 나아지고 있어요!"
    },
    {
        id: "rising_star",
        name: "빛나는 신성",
        nameEn: "Rising Star",
        emoji: "🌟",
        minScore: 201,
        maxScore: 300,
        description: "우주에서 빛나는 별처럼 눈부셔요",
        color: "#f39c12",
        rarity: "uncommon",
        message: "대단해요! 실력이 빛나고 있어요!"
    },
    {
        id: "comet",
        name: "혜성 조종사",
        nameEn: "Comet Pilot",
        emoji: "💫",
        minScore: 301,
        maxScore: 500,
        description: "혜성처럼 빠르게 성장하는 중",
        color: "#9b59b6",
        rarity: "rare",
        message: "혜성처럼 빠른 성장! 멋져요!"
    },
    // 중급 단계 (501~2000점)
    {
        id: "veteran",
        name: "베테랑 조종사",
        nameEn: "Veteran Pilot",
        emoji: "🛸",
        minScore: 501,
        maxScore: 750,
        description: "숙련된 비행 기술을 보유한 조종사",
        color: "#16a085",
        rarity: "rare",
        message: "베테랑의 실력! 훌륭합니다!"
    },
    {
        id: "galaxy",
        name: "은하 탐험가",
        nameEn: "Galaxy Explorer",
        emoji: "🌠",
        minScore: 751,
        maxScore: 1000,
        description: "은하계를 누비는 탐험가",
        color: "#8e44ad",
        rarity: "epic",
        message: "은하를 정복하는 중! 계속 가세요!"
    },
    {
        id: "diamond",
        name: "다이아몬드 파일럿",
        nameEn: "Diamond Pilot",
        emoji: "💎",
        minScore: 1001,
        maxScore: 1500,
        description: "다이아몬드처럼 빛나는 실력",
        color: "#74b9ff",
        rarity: "epic",
        message: "다이아몬드급 실력! 최고예요!"
    },
    {
        id: "phoenix",
        name: "불사조 에이스",
        nameEn: "Phoenix Ace",
        emoji: "🔥",
        minScore: 1501,
        maxScore: 2000,
        description: "불사조처럼 부활하는 에이스",
        color: "#e74c3c",
        rarity: "epic",
        message: "불사조의 기운! 놀라운 실력입니다!"
    },
    // 고급 단계 (2001~5000점)
    {
        id: "lightning",
        name: "번개 조종사",
        nameEn: "Lightning Pilot",
        emoji: "⚡",
        minScore: 2001,
        maxScore: 3000,
        description: "번개처럼 빠른 반응 속도",
        color: "#f1c40f",
        rarity: "legendary",
        message: "번개 같은 실력! 경이로워요!"
    },
    {
        id: "nebula",
        name: "성운 마스터",
        nameEn: "Nebula Master",
        emoji: "🌌",
        minScore: 3001,
        maxScore: 4000,
        description: "성운을 자유자재로 조종하는 마스터",
        color: "#a29bfe",
        rarity: "legendary",
        message: "성운을 지배하는 마스터! 전설이에요!"
    },
    {
        id: "king",
        name: "우주 왕",
        nameEn: "Space King",
        emoji: "👑",
        minScore: 4001,
        maxScore: 5000,
        description: "우주를 지배하는 절대 강자",
        color: "#fdcb6e",
        rarity: "legendary",
        message: "우주의 왕! 당신은 전설입니다!"
    },
    // 전설 단계 (5001~10000점)
    {
        id: "supernova",
        name: "슈퍼노바",
        nameEn: "Supernova",
        emoji: "🏅",
        minScore: 5001,
        maxScore: 6000,
        description: "폭발적인 에너지를 가진 별",
        color: "#ff7675",
        rarity: "mythic",
        message: "슈퍼노바급 폭발! 믿을 수 없어요!"
    },
    {
        id: "hunter",
        name: "블랙홀 헌터",
        nameEn: "Black Hole Hunter",
        emoji: "🌑",
        minScore: 6001,
        maxScore: 7500,
        description: "블랙홀조차 두려워하는 사냥꾼",
        color: "#2d3436",
        rarity: "mythic",
        message: "블랙홀도 당신을 피해 도망쳐요!"
    },
    {
        id: "quantum",
        name: "퀀텀 마스터",
        nameEn: "Quantum Master",
        emoji: "🎯",
        minScore: 7501,
        maxScore: 10000,
        description: "양자 영역을 마스터한 초월자",
        color: "#00b894",
        rarity: "mythic",
        message: "양자 영역 마스터! 초월적이에요!"
    },
    // 신화 단계 (10001점 이상)
    {
        id: "spacetime",
        name: "시공간 조종사",
        nameEn: "Spacetime Pilot",
        emoji: "🔮",
        minScore: 10001,
        maxScore: 15000,
        description: "시공간을 자유자재로 다루는 자",
        color: "#6c5ce7",
        rarity: "mythic",
        message: "시공간마저 지배하다니... 신급이에요!"
    },
    {
        id: "rainbow",
        name: "무지개 전설",
        nameEn: "Rainbow Legend",
        emoji: "🌈",
        minScore: 15001,
        maxScore: 20000,
        description: "무지개처럼 아름다운 전설",
        color: "rainbow",
        rarity: "mythic",
        message: "무지개 전설! 당신은 신화 그 자체!"
    },
    {
        id: "eagle",
        name: "우주 독수리",
        nameEn: "Space Eagle",
        emoji: "🦅",
        minScore: 20001,
        maxScore: 30000,
        description: "우주를 날아다니는 최강 독수리",
        color: "#d63031",
        rarity: "mythic",
        message: "우주 독수리! 이건... 인간이 아니야!"
    },
    {
        id: "dragon",
        name: "우주 드래곤",
        nameEn: "Space Dragon",
        emoji: "🐉",
        minScore: 30001,
        maxScore: 50000,
        description: "전설 속 드래곤의 힘을 가진 자",
        color: "#c0392b",
        rarity: "mythic",
        message: "드래곤의 힘! 당신은 신화를 넘어섰어요!"
    },
    {
        id: "infinity",
        name: "무한의 지배자",
        nameEn: "Infinity Master",
        emoji: "♾️",
        minScore: 50001,
        maxScore: 999999,
        description: "무한을 지배하는 절대 존재",
        color: "#ffffff",
        rarity: "mythic",
        message: "무한의 지배자... 당신은 신입니다."
    }
];

// 점수로 칭호 찾기
function getTitleByScore(score) {
    for (let i = TITLES_DATA.length - 1; i >= 0; i--) {
        const title = TITLES_DATA[i];
        if (score >= title.minScore && score <= title.maxScore) {
            return title;
        }
    }
    return TITLES_DATA[0]; // 기본 칭호
}
