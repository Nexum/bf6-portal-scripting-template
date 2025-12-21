// Game configuration constants
export const CONFIG = {
    WIN_SCORE: 20,
    TIME_LIMIT_SECONDS: 1200, // 20 minutes
    VIP_RESPAWN_DELAY_SECONDS: 3,
    TEAM_COUNT: 8,
    PLAYERS_PER_TEAM: 4,
} as const;

// Game state interface
export interface VIPFiestaState {
    // Team scores - Map of teamId (number) to score
    teamScores: Map<number, number>;

    // Current VIP per team - Map of teamId to playerId (or null if no VIP)
    teamVIPs: Map<number, number | null>;

    // VIP selection cooldown - teams where VIP just died and are in cooldown
    vipCooldowns: Set<number>;

    // Game status
    gameStarted: boolean;
    gameEnded: boolean;
}

// Create initial state with all teams initialized
export function createInitialState(): VIPFiestaState {
    const state: VIPFiestaState = {
        teamScores: new Map(),
        teamVIPs: new Map(),
        vipCooldowns: new Set(),
        gameStarted: false,
        gameEnded: false,
    };

    // Initialize all 8 teams with 0 score and no VIP
    for (let teamId = 1; teamId <= CONFIG.TEAM_COUNT; teamId++) {
        state.teamScores.set(teamId, 0);
        state.teamVIPs.set(teamId, null);
    }

    return state;
}

// Helper to get team with highest score
export function getWinningTeamId(state: VIPFiestaState): number {
    let winningTeamId = 1;
    let highestScore = -1;

    for (const [teamId, score] of state.teamScores) {
        if (score > highestScore) {
            highestScore = score;
            winningTeamId = teamId;
        }
    }

    return winningTeamId;
}
