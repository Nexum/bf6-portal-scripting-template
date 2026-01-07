// Game configuration
export interface GameConfig {
    targetVipKills: number;
    timeLimitSeconds: number;
    vipRespawnDelaySeconds: number;
    teamCount: number;
    playersPerTeam: number;
    spottingRefreshHz: number; // desired SpotTarget refresh rate (times per second)
}

const defaultConfig: GameConfig = {
    targetVipKills: 20,
    timeLimitSeconds: 1200,
    vipRespawnDelaySeconds: 5,
    teamCount: 100,
    playersPerTeam: 4,
    spottingRefreshHz: 1,
};

let CONFIG: GameConfig = { ...defaultConfig };

export function getConfig(): GameConfig {
    return CONFIG;
}

export function setConfig(partial: Partial<GameConfig>): void {
    CONFIG = { ...CONFIG, ...partial };
}

// Game state interface
export interface VIPFiestaState {
    // Team scores - Map of teamId (number) to score
    teamScores: Map<number, number>;

    // Current VIP per team - Map of teamId to playerId (or null if no VIP)
    teamVIPs: Map<number, number | null>;

    // VIP selection cooldown - teams where VIP just died and are in cooldown
    vipCooldowns: Set<number>;

    // Active teams - teams with at least one player (dynamically updated)
    activeTeamIds: number[];

    // Game status
    gameStarted: boolean;
    gameEnded: boolean;

    // Per-player stats for scoreboard
    vipKillsByPlayer: Map<number, number>;
    killsByPlayer: Map<number, number>;
    deathsByPlayer: Map<number, number>;

    // Per-player intro shown tracking
    introShownForPlayerIds: Set<number>;
}

// Create initial state with all teams initialized
export function createInitialState(): VIPFiestaState {
    const state: VIPFiestaState = {
        teamScores: new Map(),
        teamVIPs: new Map(),
        vipCooldowns: new Set(),
        activeTeamIds: [],
        gameStarted: false,
        gameEnded: false,
        vipKillsByPlayer: new Map(),
        killsByPlayer: new Map(),
        deathsByPlayer: new Map(),
        introShownForPlayerIds: new Set(),
    };

    // Initialize all teams with 0 score and no VIP
    for (let teamId = 1; teamId <= CONFIG.teamCount; teamId++) {
        state.teamScores.set(teamId, 0);
        state.teamVIPs.set(teamId, null);
    }

    return state;
}

// Calculate active teams based on current player distribution
export function calculateActiveTeamIds(): number[] {
    const activeTeams = new Set<number>();
    const allPlayers = mod.AllPlayers();
    const count = mod.CountOf(allPlayers);

    for (let i = 0; i < count; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);

        if (teamId >= 1 && teamId <= CONFIG.teamCount) {
            activeTeams.add(teamId);
        }
    }

    // Return sorted array for consistent UI ordering
    return Array.from(activeTeams).sort((a, b) => a - b);
}

// Player stats helpers
export function incrementVipKillForPlayer(state: VIPFiestaState, player: mod.Player): void {
    const playerId = mod.GetObjId(player);
    const cur = state.vipKillsByPlayer.get(playerId) ?? 0;
    state.vipKillsByPlayer.set(playerId, cur + 1);
}

export function incrementKillForPlayer(state: VIPFiestaState, player: mod.Player): void {
    const playerId = mod.GetObjId(player);
    const cur = state.killsByPlayer.get(playerId) ?? 0;
    state.killsByPlayer.set(playerId, cur + 1);
}

export function incrementDeathForPlayer(state: VIPFiestaState, player: mod.Player): void {
    const playerId = mod.GetObjId(player);
    const cur = state.deathsByPlayer.get(playerId) ?? 0;
    state.deathsByPlayer.set(playerId, cur + 1);
}

export function getPlayerStats(state: VIPFiestaState, player: mod.Player): { vipKills: number; kills: number; deaths: number } {
    const playerId = mod.GetObjId(player);
    return {
        vipKills: state.vipKillsByPlayer.get(playerId) ?? 0,
        kills: state.killsByPlayer.get(playerId) ?? 0,
        deaths: state.deathsByPlayer.get(playerId) ?? 0,
    };
}

// Check if two arrays of team IDs are different
export function activeTeamsChanged(oldTeams: number[], newTeams: number[]): boolean {
    if (oldTeams.length !== newTeams.length) return true;
    for (let i = 0; i < oldTeams.length; i++) {
        if (oldTeams[i] !== newTeams[i]) return true;
    }
    return false;
}

// Helper to get team with highest score (only considers active teams)
export function getWinningTeamId(state: VIPFiestaState): number {
    let winningTeamId = state.activeTeamIds[0] ?? 1;
    let highestScore = -1;

    // Only check active teams
    for (const teamId of state.activeTeamIds) {
        const score = state.teamScores.get(teamId) ?? 0;
        if (score > highestScore) {
            highestScore = score;
            winningTeamId = teamId;
        }
    }

    return winningTeamId;
}
