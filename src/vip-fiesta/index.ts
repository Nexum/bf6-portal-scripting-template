import type { VIPFiestaState } from './state.ts';
import {
    getConfig,
    createInitialState,
    getWinningTeamId,
    calculateActiveTeamIds,
    activeTeamsChanged,
    incrementVipKillForPlayer,
    incrementKillForPlayer,
    incrementDeathForPlayer,
    getPlayerStats,
} from './state.ts';
import {
    selectInitialVIPs,
    handleVIPDeath,
    maintainVIPSpotting,
    isPlayerVIP,
    removeVIPSpotting,
    selectRandomVIP,
    applyVIPSpotting,
    getTeamById,
} from './vip-manager.ts';
import { VIPFiestaScoreUI } from './score-ui.ts';
import { addFriendlyVipWorldIcon } from './vip-manager.ts';
import { getPlayerById } from './vip-manager.ts';

export class VIPFiesta {
    private state: VIPFiestaState;
    private scoreUI: VIPFiestaScoreUI;

    constructor() {
        this.state = createInitialState();
        this.scoreUI = new VIPFiestaScoreUI();
    }

    // Initialize the game mode - call from OnGameModeStarted
    public initialize(): void {
        // Set time limit from config - we handle scoring ourselves
        mod.SetGameModeTimeLimit(getConfig().timeLimitSeconds);

        // NOTE: We don't use SetGameModeTargetScore because we track scores ourselves
        // Portal's built-in score system may conflict with our custom scoring

        // Initialize score UI
        this.scoreUI.initialize();

        // Mark game as started
        this.state.gameStarted = true;

        // Announce game start to all players
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.gameStarting));

        // Configure built-in scoreboard (CustomFFA)
        mod.SetScoreboardType(mod.ScoreboardType.CustomFFA);
        mod.SetScoreboardHeader(mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardTitle));
        mod.SetScoreboardColumnNames(
            mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColTeam),
            mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColVipKills),
            mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColKills),
            mod.Message(mod.stringkeys.vipFiesta.ui.scoreboardColDeaths)
        );
        mod.SetScoreboardColumnWidths(1.0, 1.0, 1.0, 1.0);
        // Sort primarily by VIP Kills (column 2), then Kills (column 3)
        mod.SetScoreboardSorting(2, true);

        // Wait for players to be assigned to teams, then detect active teams and select VIPs
        mod.Wait(5).then(() => {
            this.refreshActiveTeams();
            this.selectAllInitialVIPs();
        });
    }

    // Select VIPs for all active teams
    private selectAllInitialVIPs(): void {
        selectInitialVIPs(this.state, (player, teamId) => {
            this.announceNewVIP(player, teamId);
        });
    }

    // Refresh active teams and update UI
    private refreshActiveTeams(): void {
        const newActiveTeams = calculateActiveTeamIds();

        if (activeTeamsChanged(this.state.activeTeamIds, newActiveTeams)) {
            const previousTeams = [...this.state.activeTeamIds];
            this.state.activeTeamIds = newActiveTeams;

            // Update UI to show only active teams
            this.scoreUI.updateActiveTeams(this.state);

            // Handle newly active teams (need VIP selection)
            for (const teamId of newActiveTeams) {
                if (!previousTeams.includes(teamId)) {
                    // New team became active - check if needs VIP
                    if (this.state.teamVIPs.get(teamId) === null && !this.state.vipCooldowns.has(teamId)) {
                        const newVIP = selectRandomVIP(teamId, this.state);
                        if (newVIP) {
                            const vipId = mod.GetObjId(newVIP);
                            this.state.teamVIPs.set(teamId, vipId);
                            applyVIPSpotting(newVIP);
                            this.announceNewVIP(newVIP, teamId);
                        }
                    }
                }
            }
        }
    }

    // Announce new VIP to players
    private announceNewVIP(player: mod.Player, teamId: number): void {
        // Notify the VIP player (important - use notification)
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.youAreVip), player);

        // Notify all other players (less intrusive - use world log)
        mod.DisplayHighlightedWorldLogMessage(mod.Message(mod.stringkeys.vipFiesta.notifications.newVip, player));

        // Add friendly world icon for the VIP visible to their team only
        const team = mod.GetTeam(player);
        const teamColor = mod.CreateVector(0.2, 0.8, 0.2);
        const msg = mod.Message(mod.stringkeys.vipFiesta.ui.vipMarker);
        addFriendlyVipWorldIcon(player, team, teamColor, msg);
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

        // Track deaths/kills for scoreboard
        incrementDeathForPlayer(this.state, deadPlayer);
        incrementKillForPlayer(this.state, killer);

        // VIP was killed!
        const killerTeam = mod.GetTeam(killer);
        const killerTeamId = mod.GetObjId(killerTeam);

        // Remove VIP spotting
        removeVIPSpotting(deadPlayer);

        // Only award points if killed by different team (not suicide/team kill)
        if (killerTeamId !== deadPlayerTeamId && killerTeamId >= 1 && killerTeamId <= getConfig().teamCount) {
            // Team point
            this.awardPoint(killerTeamId);
            // Per-player VIP kill stat
            incrementVipKillForPlayer(this.state, killer);
            // Update scoreboard row for killer
            const stats = getPlayerStats(this.state, killer);
            mod.SetScoreboardPlayerValues(killer, killerTeamId, stats.vipKills, stats.kills, stats.deaths);
        }

        // Notify dead VIP's team (world log - less intrusive)
        mod.DisplayHighlightedWorldLogMessage(
            mod.Message(mod.stringkeys.vipFiesta.notifications.vipDied),
            deadPlayerTeam
        );

        // Notify that new VIP is being selected (world log)
        mod.DisplayHighlightedWorldLogMessage(
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
        // Only award points to active teams
        if (!this.state.activeTeamIds.includes(teamId)) return;

        const currentScore = this.state.teamScores.get(teamId) ?? 0;
        const newScore = currentScore + 1;
        this.state.teamScores.set(teamId, newScore);

        // Update UI
        this.scoreUI.updateScore(teamId, newScore, this.state);

        // Announce the score (world log - scrolling message)
        mod.DisplayHighlightedWorldLogMessage(
            mod.Message(
                mod.stringkeys.vipFiesta.notifications.vipKilled,
                teamId,
                newScore,
                getConfig().targetVipKills
            )
        );

        // Check win condition
        if (newScore >= getConfig().targetVipKills) {
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
        if (!this.state.gameStarted) return; // Don't end if game hasn't properly started

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
            teamId <= getConfig().teamCount
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

        // Update per-player HUD: show current team VIP or self-highlight
        const playerTeam = mod.GetTeam(player);
        const playerTeamId = mod.GetObjId(playerTeam);
        const vipId = this.state.teamVIPs.get(playerTeamId);
        const widgetName = `vipfiesta_hud_${mod.GetObjId(player)}`;
        const existing = mod.FindUIWidgetWithName(widgetName);
        const parent = mod.GetUIRoot();
        const hudMessage = isPlayerVIP(player, this.state)
            ? mod.Message(mod.stringkeys.vipFiesta.hud.youAreVipShort)
            : (vipId ? mod.Message(mod.stringkeys.vipFiesta.hud.yourVip, getPlayerById(vipId) as mod.Player) : mod.Message(mod.stringkeys.vipFiesta.hud.yourVip, mod.stringkeys.vipFiesta.ui.vipMarker));

        if (!existing) {
            mod.AddUIText(
                widgetName,
                mod.CreateVector(10, 70, 0),
                mod.CreateVector(300, 24, 0),
                mod.UIAnchor.TopLeft,
                parent,
                true,
                4,
                mod.CreateVector(0, 0, 0),
                0.4,
                mod.UIBgFill.Blur,
                hudMessage,
                16,
                mod.CreateVector(1, 1, 1),
                1,
                mod.UIAnchor.CenterLeft,
                mod.UIDepth.AboveGameUI,
                player
            );
        } else {
            mod.SetUITextLabel(existing, hudMessage);
            mod.SetUIWidgetVisible(existing, true);
        }

        // Initialize/update scoreboard row for this player
        const stats = getPlayerStats(this.state, player);
        mod.SetScoreboardPlayerValues(player, playerTeamId, stats.vipKills, stats.kills, stats.deaths);

        // One-time introduction UI per player
        const pid = mod.GetObjId(player);
        if (!this.state.introShownForPlayerIds.has(pid)) {
            const introName = `vipfiesta_intro_${pid}`;
            const existingIntro = mod.FindUIWidgetWithName(introName);
            const introMessage = mod.Message(mod.stringkeys.vipFiesta.notifications.gameStarting);
            if (!existingIntro) {
                mod.AddUIText(
                    introName,
                    mod.CreateVector(0, 120, 0),
                    mod.CreateVector(520, 26, 0),
                    mod.UIAnchor.TopCenter,
                    mod.GetUIRoot(),
                    true,
                    6,
                    mod.CreateVector(0, 0, 0),
                    0.5,
                    mod.UIBgFill.Blur,
                    introMessage,
                    18,
                    mod.CreateVector(1, 1, 1),
                    1,
                    mod.UIAnchor.Center,
                    mod.UIDepth.AboveGameUI,
                    player
                );
            }
            // Hide after 3 seconds and mark as shown
            mod.Wait(3).then(() => {
                const w = mod.FindUIWidgetWithName(introName);
                if (w) mod.SetUIWidgetVisible(w, false);
                this.state.introShownForPlayerIds.add(pid);
            });
        }
    }

    // Handle player join - call from OnPlayerJoinGame
    public onPlayerJoinGame(player: mod.Player): void {
        if (!this.state.gameStarted) return;

        // Delay to allow Portal to assign player to team, then refresh active teams
        mod.Wait(1).then(() => {
            this.refreshActiveTeams();
        });
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

        // Refresh active teams after player leaves
        mod.Wait(0.5).then(() => {
            this.refreshActiveTeams();
        });
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

        // Refresh active teams after team switch
        this.refreshActiveTeams();
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
