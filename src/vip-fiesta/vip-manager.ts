import { getPlayersInTeam } from '../modlib/index.ts';
import { VIPFiestaState, CONFIG } from './state.ts';

// Get team by ID - uses mod.GetTeam(teamId) directly
export function getTeamById(teamId: number): mod.Team {
    return mod.GetTeam(teamId);
}

// Get alive players from a team
function getAlivePlayersInTeam(team: mod.Team): mod.Player[] {
    const members = getPlayersInTeam(team);
    return members.filter((player) => mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive));
}

// Select a random VIP from team members
export function selectRandomVIP(teamId: number, state: VIPFiestaState): mod.Player | null {
    const team = getTeamById(teamId);
    const alivePlayers = getAlivePlayersInTeam(team);

    // Exclude current VIP if exists (for re-selection scenarios)
    const currentVipId = state.teamVIPs.get(teamId);
    const eligiblePlayers = alivePlayers.filter((player) => mod.GetObjId(player) !== currentVipId);

    // If no other players available, keep current VIP or pick from all alive
    const candidates = eligiblePlayers.length > 0 ? eligiblePlayers : alivePlayers;

    if (candidates.length === 0) return null;

    // Random selection
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
}

// Apply VIP spotting marker - makes VIP visible to all players
export function applyVIPSpotting(player: mod.Player): void {
    // Spot the VIP for all players with a 10 second duration
    // This will be refreshed every tick in OngoingPlayer
    mod.SpotTarget(player, 10, mod.SpotStatus.SpotInBoth);
}

// Remove VIP spotting
export function removeVIPSpotting(player: mod.Player): void {
    mod.SpotTarget(player, mod.SpotStatus.Unspot);
}

// Get player by ID from all players
export function getPlayerById(playerId: number): mod.Player | null {
    const allPlayers = mod.AllPlayers();
    const count = mod.CountOf(allPlayers);
    for (let i = 0; i < count; i++) {
        const player = mod.ValueInArray(allPlayers, i) as mod.Player;
        if (mod.GetObjId(player) === playerId) {
            return player;
        }
    }
    return null;
}

// Handle VIP death - initiate cooldown then select new VIP
export async function handleVIPDeath(
    teamId: number,
    state: VIPFiestaState,
    onNewVIPSelected: (player: mod.Player, teamId: number) => void
): Promise<void> {
    // Mark team as in cooldown
    state.vipCooldowns.add(teamId);
    state.teamVIPs.set(teamId, null);

    // Wait for respawn delay
    await mod.Wait(CONFIG.VIP_RESPAWN_DELAY_SECONDS);

    // Remove from cooldown
    state.vipCooldowns.delete(teamId);

    // Select new VIP
    const newVIP = selectRandomVIP(teamId, state);
    if (newVIP) {
        const newVipId = mod.GetObjId(newVIP);
        state.teamVIPs.set(teamId, newVipId);
        applyVIPSpotting(newVIP);
        onNewVIPSelected(newVIP, teamId);
    }
}

// Select initial VIPs for all teams
export function selectInitialVIPs(
    state: VIPFiestaState,
    onVIPSelected: (player: mod.Player, teamId: number) => void
): void {
    // Iterate through all configured teams (1-8)
    for (let teamId = 1; teamId <= CONFIG.TEAM_COUNT; teamId++) {
        const team = getTeamById(teamId);
        const members = getPlayersInTeam(team);
        if (members.length === 0) continue;

        // Select random VIP
        const vip = selectRandomVIP(teamId, state);
        if (vip) {
            const vipId = mod.GetObjId(vip);
            state.teamVIPs.set(teamId, vipId);
            applyVIPSpotting(vip);
            onVIPSelected(vip, teamId);
        }
    }
}

// Check if a player is the VIP of their team
export function isPlayerVIP(player: mod.Player, state: VIPFiestaState): boolean {
    const playerId = mod.GetObjId(player);
    const team = mod.GetTeam(player);
    const teamId = mod.GetObjId(team);
    return state.teamVIPs.get(teamId) === playerId;
}

// Maintain VIP spotting (call this in OngoingPlayer)
export function maintainVIPSpotting(player: mod.Player, state: VIPFiestaState): void {
    if (isPlayerVIP(player, state)) {
        // Refresh spotting to keep VIP visible
        mod.SpotTarget(player, 10, mod.SpotStatus.SpotInBoth);
    }
}
