import { getConfig } from './state.ts';
import type { VIPFiestaState } from './state.ts';

// Generate team colors programmatically for up to CONFIG.TEAM_COUNT teams
function generateTeamColors(): mod.Vector[] {
    const colors: mod.Vector[] = [];
    // Predefined colors for first 8 teams
    const predefinedColors = [
        mod.CreateVector(1, 0.2, 0.2), // Team 1: Red
        mod.CreateVector(0.2, 0.4, 1), // Team 2: Blue
        mod.CreateVector(0.2, 1, 0.2), // Team 3: Green
        mod.CreateVector(1, 1, 0.2), // Team 4: Yellow
        mod.CreateVector(0.2, 1, 1), // Team 5: Cyan
        mod.CreateVector(1, 0.2, 1), // Team 6: Magenta
        mod.CreateVector(1, 0.6, 0.2), // Team 7: Orange
        mod.CreateVector(0.6, 0.2, 1), // Team 8: Purple
    ];

    // Add predefined colors
    colors.push(...predefinedColors);

    // Generate additional colors using HSV-like distribution
    for (let i = 8; i < getConfig().teamCount; i++) {
        const hue = (i * 137.5) % 360; // Golden angle approximation for good distribution
        const saturation = 0.7 + (i % 3) * 0.1; // Vary saturation slightly
        const value = 0.8 + (i % 2) * 0.2; // Vary brightness

        // Simple HSV to RGB conversion (approximate)
        const c = value * saturation;
        const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
        const m = value - c;

        let r = 0, g = 0, b = 0;
        if (hue < 60) { r = c; g = x; b = 0; }
        else if (hue < 120) { r = x; g = c; b = 0; }
        else if (hue < 180) { r = 0; g = c; b = x; }
        else if (hue < 240) { r = 0; g = x; b = c; }
        else if (hue < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        colors.push(mod.CreateVector(r + m, g + m, b + m));
    }

    return colors;
}

const TEAM_COLORS: mod.Vector[] = generateTeamColors();

const CONTAINER_NAME = 'vipfiesta_scoreboard';
const BAR_BG_PREFIX = 'vipfiesta_bar_bg_';
const BAR_FILL_PREFIX = 'vipfiesta_bar_fill_';
const LABEL_PREFIX = 'vipfiesta_bar_label_';
// Row height not needed with simple vertical layout
const BAR_WIDTH = 300;
const BAR_HEIGHT = 18;
const BAR_SPACING_Y = 8;

export class VIPFiestaScoreUI {
    private initialized = false;
    private currentActiveTeams: number[] = [];
    private headerName = 'vipfiesta_score_header';

    // Layout is simple vertical list; positioning handled directly per row

    // Initialize the scoreboard UI for all players
    public initialize(): void {
        if (this.initialized) return;

        // Create main container at top of screen (max size, will be resized dynamically)
        mod.AddUIContainer(
            CONTAINER_NAME,
            mod.CreateVector(0, 10, 0), // Position: top center with small margin
            mod.CreateVector(640, 90, 0), // Size: initial size, will be resized based on active teams
            mod.UIAnchor.TopCenter,
            mod.GetUIRoot(),
            true, // visible
            4, // padding
            mod.CreateVector(0, 0, 0), // bgColor: black
            0.6, // bgAlpha
            mod.UIBgFill.Blur
        );

        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);

        // Create row widgets per team (hidden by default)
        for (let teamId = 1; teamId <= getConfig().teamCount; teamId++) {
            const teamColor = TEAM_COLORS[teamId - 1] ?? mod.CreateVector(1, 1, 1);

            // Background bar
            mod.AddUIImage(
                BAR_BG_PREFIX + teamId,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(BAR_WIDTH, BAR_HEIGHT, 0),
                mod.UIAnchor.TopLeft,
                container,
                false,
                2,
                mod.CreateVector(0.15, 0.15, 0.15),
                0.5,
                mod.UIBgFill.Solid,
                mod.UIImageType.None,
                mod.CreateVector(0, 0, 0),
                0.0
            );

            // Fill bar
            mod.AddUIImage(
                BAR_FILL_PREFIX + teamId,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(0, BAR_HEIGHT, 0),
                mod.UIAnchor.TopLeft,
                container,
                false,
                0,
                mod.CreateVector(0, 0, 0),
                0.0,
                mod.UIBgFill.None,
                mod.UIImageType.None,
                teamColor,
                1.0
            );

            // Label
            mod.AddUIText(
                LABEL_PREFIX + teamId,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(640, BAR_HEIGHT, 0),
                mod.UIAnchor.TopLeft,
                container,
                false,
                0,
                mod.CreateVector(0, 0, 0),
                0.0,
                mod.UIBgFill.None,
                mod.Message(mod.stringkeys.vipFiesta.ui.teamScore, teamId, 0),
                18,
                mod.CreateVector(1, 1, 1),
                1,
                mod.UIAnchor.CenterLeft
            );
        }

        // Header showing target kills
        mod.AddUIText(
            this.headerName,
            mod.CreateVector(10, 0, 0),
            mod.CreateVector(640, 20, 0),
            mod.UIAnchor.TopLeft,
            container,
            true,
            0,
            mod.CreateVector(0, 0, 0),
            0.0,
            mod.UIBgFill.None,
            mod.Message(mod.stringkeys.vipFiesta.ui.targetHeader, getConfig().targetVipKills),
            18,
            mod.CreateVector(1, 1, 1),
            1,
            mod.UIAnchor.TopLeft
        );

        this.initialized = true;
    }

    // Update which teams are visible and reposition them
    public updateActiveTeams(state: VIPFiestaState): void {
        if (!this.initialized) return;

        // Sort active teams by score (descending)
        const sortedTeams = state.activeTeamIds
            .map(teamId => ({
                teamId,
                score: state.teamScores.get(teamId) ?? 0
            }))
            .sort((a, b) => b.score - a.score);

        // Select top 3 teams; ensure player's team is included
        const topTeams = sortedTeams.slice(0, 3);
        const localPlayers = mod.AllPlayers();
        const localCount = mod.CountOf(localPlayers);
        let localTeamId = topTeams[0]?.teamId ?? 1;
        if (localCount > 0) {
            const p = mod.ValueInArray(localPlayers, 0) as mod.Player; // assume local client first for visibility
            localTeamId = mod.GetObjId(mod.GetTeam(p));
        }
        if (!topTeams.some(t => t.teamId === localTeamId)) {
            const localScore = state.teamScores.get(localTeamId) ?? 0;
            topTeams.push({ teamId: localTeamId, score: localScore });
        }

        // Hide all row widgets first
        for (let teamId = 1; teamId <= getConfig().teamCount; teamId++) {
            const bg = mod.FindUIWidgetWithName(BAR_BG_PREFIX + teamId);
            const fill = mod.FindUIWidgetWithName(BAR_FILL_PREFIX + teamId);
            const label = mod.FindUIWidgetWithName(LABEL_PREFIX + teamId);
            if (bg) mod.SetUIWidgetVisible(bg, false);
            if (fill) mod.SetUIWidgetVisible(fill, false);
            if (label) mod.SetUIWidgetVisible(label, false);
        }

        // Resize container based on teams to show count
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            const totalHeight = topTeams.length * (BAR_HEIGHT + BAR_SPACING_Y) + 20;
            mod.SetUIWidgetSize(container, mod.CreateVector(640, totalHeight, 0));
        }

        // Show and reposition selected team widgets
        topTeams.forEach((teamInfo, displayIndex) => {
            const y = displayIndex * (BAR_HEIGHT + BAR_SPACING_Y) + 8;
            const bg = mod.FindUIWidgetWithName(BAR_BG_PREFIX + teamInfo.teamId);
            const fill = mod.FindUIWidgetWithName(BAR_FILL_PREFIX + teamInfo.teamId);
            const label = mod.FindUIWidgetWithName(LABEL_PREFIX + teamInfo.teamId);

            const ratio = Math.max(0, Math.min(1, teamInfo.score / getConfig().targetVipKills));
            const fillWidth = Math.floor(BAR_WIDTH * ratio);

            if (bg) {
                mod.SetUIWidgetPosition(bg, mod.CreateVector(170, y, 0));
                mod.SetUIWidgetVisible(bg, true);
            }
            if (fill) {
                mod.SetUIWidgetPosition(fill, mod.CreateVector(170, y, 0));
                mod.SetUIWidgetSize(fill, mod.CreateVector(fillWidth, BAR_HEIGHT, 0));
                mod.SetUIWidgetVisible(fill, true);
            }
            if (label) {
                const teamLabel = mod.Message(
                    mod.stringkeys.vipFiesta.ui.teamScore,
                    teamInfo.teamId,
                    teamInfo.score
                );
                mod.SetUIWidgetPosition(label, mod.CreateVector(10, y - 2, 0));
                mod.SetUITextLabel(label, teamLabel);
                mod.SetUIWidgetVisible(label, true);
            }
        });

        // Update header target dynamically
        const header = mod.FindUIWidgetWithName(this.headerName);
        if (header) {
            mod.SetUITextLabel(header, mod.Message(mod.stringkeys.vipFiesta.ui.targetHeader, getConfig().targetVipKills));
        }

        this.currentActiveTeams = topTeams.map(t => t.teamId);
    }

    // Update score display for a specific team
    public updateScore(teamId: number, score: number, state: VIPFiestaState): void {
        if (!this.initialized) return;

        // Refresh the entire UI to recalculate ranks and visibility
        this.updateActiveTeams(state);
    }

    // Update all scores at once
    public updateAllScores(scores: Map<number, number>, state: VIPFiestaState): void {
        // Refresh the entire UI to recalculate ranks and visibility
        this.updateActiveTeams(state);
    }

    // Highlight winning team (optional visual feedback)
    public highlightTeam(teamId: number): void {
        if (!this.initialized) return;
        if (!this.currentActiveTeams.includes(teamId)) return;

        const fill = mod.FindUIWidgetWithName(BAR_FILL_PREFIX + teamId);
        if (fill) {
            const teamColor = TEAM_COLORS[teamId - 1] ?? mod.CreateVector(1, 1, 1);
            // brighten by raising alpha via label/background
            mod.SetUIImageColor(fill, teamColor);
        }
    }

    // Show the scoreboard
    public show(): void {
        if (!this.initialized) return;
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            mod.SetUIWidgetVisible(container, true);
        }
    }

    // Hide the scoreboard
    public hide(): void {
        if (!this.initialized) return;
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            mod.SetUIWidgetVisible(container, false);
        }
    }

    // Cleanup - remove all UI widgets
    public destroy(): void {
        if (!this.initialized) return;

        // Delete team score widgets
        for (let teamId = 1; teamId <= getConfig().teamCount; teamId++) {
            const bg = mod.FindUIWidgetWithName(BAR_BG_PREFIX + teamId);
            const fill = mod.FindUIWidgetWithName(BAR_FILL_PREFIX + teamId);
            const label = mod.FindUIWidgetWithName(LABEL_PREFIX + teamId);
            if (bg) mod.DeleteUIWidget(bg);
            if (fill) mod.DeleteUIWidget(fill);
            if (label) mod.DeleteUIWidget(label);
        }

        // Delete container
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            mod.DeleteUIWidget(container);
        }

        this.initialized = false;
    }
}
