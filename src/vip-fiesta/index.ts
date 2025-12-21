import { VIPFiestaState, CONFIG, createInitialState, getWinningTeamId } from './state.ts';
import {
    selectInitialVIPs,
    handleVIPDeath,
    maintainVIPSpotting,
    isPlayerVIP,
    removeVIPSpotting,
    selectRandomVIP,
    applyVIPSpotting,
    getTeamById,
    getPlayerById,
} from './vip-manager.ts';
import { VIPFiestaScoreUI } from './score-ui.ts';

export class VIPFiesta {
    private state: VIPFiestaState;
    private scoreUI: VIPFiestaScoreUI;

    constructor() {
        this.state = createInitialState();
        this.scoreUI = new VIPFiestaScoreUI();
    }

    // Initialize the game mode - call from OnGameModeStarted
    public initialize(): void {
        // Set game mode rules
        mod.SetGameModeTargetScore(CONFIG.WIN_SCORE); // 20 points to win
        mod.SetGameModeTimeLimit(CONFIG.TIME_LIMIT_SECONDS); // 20 minutes

        // Initialize score UI
        this.scoreUI.initialize();

        // Mark game as started
        this.state.gameStarted = true;

        // Announce game start to all players
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.gameStarting));

        // Select initial VIPs after a short delay to let players spawn
        mod.Wait(5).then(() => {
            this.selectAllInitialVIPs();
        });
    }

    // Select VIPs for all teams
    private selectAllInitialVIPs(): void {
        selectInitialVIPs(this.state, (player, teamId) => {
            this.announceNewVIP(player, teamId);
        });
    }

    // Announce new VIP to players
    private announceNewVIP(player: mod.Player, teamId: number): void {
        const team = getTeamById(teamId);

        // Notify the VIP player
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.youAreVip), player);

        // Notify all other players
        if (team) {
            mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.newVip, player));
        }
    }

    // Handle player death - call from OnPlayerDied
    public onPlayerDied(deadPlayer: mod.Player, killer: mod.Player): void {
        if (this.state.gameEnded) return;

        const deadPlayerId = mod.GetObjId(deadPlayer);
        const deadPlayerTeam = mod.GetTeam(deadPlayer);
        const deadPlayerTeamId = mod.GetObjId(deadPlayerTeam);

        // Check if dead player was a VIP
        if (this.state.teamVIPs.get(deadPlayerTeamId) !== deadPlayerId) {
            return; // Not a VIP, nothing to do
        }

        // VIP was killed!
        const killerTeam = mod.GetTeam(killer);
        const killerTeamId = mod.GetObjId(killerTeam);

        // Remove VIP spotting
        removeVIPSpotting(deadPlayer);

        // Only award points if killed by different team (not suicide/team kill)
        if (killerTeamId !== deadPlayerTeamId && killerTeamId >= 1 && killerTeamId <= CONFIG.TEAM_COUNT) {
            this.awardPoint(killerTeamId);
        }

        // Notify dead VIP's team
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.vipDied), deadPlayerTeam);

        // Notify that new VIP is being selected
        mod.DisplayNotificationMessage(
            mod.Message(mod.stringkeys.vipFiesta.notifications.selectingNewVip),
            deadPlayerTeam
        );

        // Handle VIP death - select new VIP after delay
        handleVIPDeath(deadPlayerTeamId, this.state, (newVIP, teamId) => {
            this.announceNewVIP(newVIP, teamId);
        });
    }

    // Award a point to a team
    private awardPoint(teamId: number): void {
        const currentScore = this.state.teamScores.get(teamId) ?? 0;
        const newScore = currentScore + 1;
        this.state.teamScores.set(teamId, newScore);

        // Update UI
        this.scoreUI.updateScore(teamId, newScore);

        // Announce the score
        mod.DisplayNotificationMessage(
            mod.Message(mod.stringkeys.vipFiesta.notifications.vipKilled, teamId, newScore)
        );

        // Check win condition
        if (newScore >= CONFIG.WIN_SCORE) {
            this.endGame(teamId);
        }
    }

    // End the game with a winning team
    private endGame(winningTeamId: number): void {
        if (this.state.gameEnded) return;

        this.state.gameEnded = true;

        // Highlight winning team in UI
        this.scoreUI.highlightTeam(winningTeamId);

        // Announce winner
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.teamWins, winningTeamId));

        // End the game mode with winning team
        const winningTeam = getTeamById(winningTeamId);
        if (winningTeam) {
            mod.EndGameMode(winningTeam);
        }
    }

    // Handle time limit reached - call from OnTimeLimitReached
    public onTimeLimitReached(): void {
        if (this.state.gameEnded) return;

        // Find team with highest score
        const winningTeamId = getWinningTeamId(this.state);
        this.endGame(winningTeamId);
    }

    // Handle player deployed - call from OnPlayerDeployed
    public onPlayerDeployed(player: mod.Player): void {
        if (this.state.gameEnded || !this.state.gameStarted) return;

        const team = mod.GetTeam(player);
        const teamId = mod.GetObjId(team);

        // Check if team has no VIP and is not in cooldown
        if (
            this.state.teamVIPs.get(teamId) === null &&
            !this.state.vipCooldowns.has(teamId) &&
            teamId >= 1 &&
            teamId <= CONFIG.TEAM_COUNT
        ) {
            // Select this player as VIP
            const playerId = mod.GetObjId(player);
            this.state.teamVIPs.set(teamId, playerId);
            applyVIPSpotting(player);
            this.announceNewVIP(player, teamId);
        }

        // If this player is the VIP, re-apply spotting
        if (isPlayerVIP(player, this.state)) {
            applyVIPSpotting(player);
        }
    }

    // Handle player join - call from OnPlayerJoinGame
    public onPlayerJoinGame(player: mod.Player): void {
        // Nothing specific needed - VIP selection happens on deploy
    }

    // Handle player leave - call from OnPlayerLeaveGame
    public onPlayerLeaveGame(eventNumber: number): void {
        if (this.state.gameEnded) return;

        // Check if any team's VIP left
        for (const [teamId, vipId] of this.state.teamVIPs) {
            if (vipId === eventNumber) {
                // This team's VIP left - select new one
                this.state.teamVIPs.set(teamId, null);

                // Select new VIP immediately (no cooldown for leaving)
                const newVIP = selectRandomVIP(teamId, this.state);
                if (newVIP) {
                    const newVipId = mod.GetObjId(newVIP);
                    this.state.teamVIPs.set(teamId, newVipId);
                    applyVIPSpotting(newVIP);
                    this.announceNewVIP(newVIP, teamId);
                }
            }
        }
    }

    // Handle team switch - call from OnPlayerSwitchTeam
    public onPlayerSwitchTeam(player: mod.Player, newTeam: mod.Team): void {
        if (this.state.gameEnded) return;

        const playerId = mod.GetObjId(player);
        const newTeamId = mod.GetObjId(newTeam);

        // Check all teams - if player was VIP of old team, select new VIP
        for (const [teamId, vipId] of this.state.teamVIPs) {
            if (vipId === playerId && teamId !== newTeamId) {
                // Player was VIP of this team and switched away
                removeVIPSpotting(player);
                this.state.teamVIPs.set(teamId, null);

                // Select new VIP for old team
                const newVIP = selectRandomVIP(teamId, this.state);
                if (newVIP) {
                    const newVipId = mod.GetObjId(newVIP);
                    this.state.teamVIPs.set(teamId, newVipId);
                    applyVIPSpotting(newVIP);
                    this.announceNewVIP(newVIP, teamId);
                }
            }
        }
    }

    // Maintain VIP spotting - call from OngoingPlayer (30x/sec)
    public ongoingPlayer(player: mod.Player): void {
        if (this.state.gameEnded || !this.state.gameStarted) return;

        // Keep VIP spotted
        maintainVIPSpotting(player, this.state);
    }

    // Get current state (for debugging)
    public getState(): VIPFiestaState {
        return this.state;
    }
}
