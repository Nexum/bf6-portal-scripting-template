import { CONFIG } from './state.ts';

// Team colors for the 8 teams
const TEAM_COLORS: mod.Vector[] = [
    mod.CreateVector(1, 0.2, 0.2), // Team 1: Red
    mod.CreateVector(0.2, 0.4, 1), // Team 2: Blue
    mod.CreateVector(0.2, 1, 0.2), // Team 3: Green
    mod.CreateVector(1, 1, 0.2), // Team 4: Yellow
    mod.CreateVector(0.2, 1, 1), // Team 5: Cyan
    mod.CreateVector(1, 0.2, 1), // Team 6: Magenta
    mod.CreateVector(1, 0.6, 0.2), // Team 7: Orange
    mod.CreateVector(0.6, 0.2, 1), // Team 8: Purple
];

// Widget names for each team score
function getScoreWidgetName(teamId: number): string {
    return `vipfiesta_score_team_${teamId}`;
}

const CONTAINER_NAME = 'vipfiesta_scoreboard';

export class VIPFiestaScoreUI {
    private initialized = false;

    // Initialize the scoreboard UI for all players
    public initialize(): void {
        if (this.initialized) return;

        // Create main container at top of screen
        mod.AddUIContainer(
            CONTAINER_NAME,
            mod.CreateVector(0, 10, 0), // Position: top center with small margin
            mod.CreateVector(640, 70, 0), // Size: wide enough for 8 teams in 2 rows
            mod.UIAnchor.TopCenter,
            mod.GetUIRoot(),
            true, // visible
            4, // padding
            mod.CreateVector(0, 0, 0), // bgColor: black
            0.6, // bgAlpha
            mod.UIBgFill.Blur
        );

        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);

        // Create score displays for each team (2 rows of 4)
        for (let teamId = 1; teamId <= CONFIG.TEAM_COUNT; teamId++) {
            const col = (teamId - 1) % 4;
            const row = Math.floor((teamId - 1) / 4);

            const xPos = col * 155 + 10; // 155px per column with padding
            const yPos = row * 32 + 5; // 32px per row with padding

            const teamColor = TEAM_COLORS[teamId - 1] ?? mod.CreateVector(1, 1, 1);

            mod.AddUIText(
                getScoreWidgetName(teamId),
                mod.CreateVector(xPos, yPos, 0),
                mod.CreateVector(145, 28, 0),
                mod.UIAnchor.TopLeft,
                container,
                true, // visible
                4, // padding
                teamColor, // bgColor: team color
                0.3, // bgAlpha: subtle background
                mod.UIBgFill.Solid,
                mod.Message(mod.stringkeys.vipFiesta.ui.teamScore, teamId, 0),
                18, // textSize
                mod.CreateVector(1, 1, 1), // textColor: white
                1, // textAlpha
                mod.UIAnchor.Center
            );
        }

        this.initialized = true;
    }

    // Update score display for a specific team
    public updateScore(teamId: number, score: number): void {
        if (!this.initialized) return;
        if (teamId < 1 || teamId > CONFIG.TEAM_COUNT) return;

        const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamId));
        if (widget) {
            mod.SetUITextLabel(widget, mod.Message(mod.stringkeys.vipFiesta.ui.teamScore, teamId, score));
        }
    }

    // Update all scores at once
    public updateAllScores(scores: Map<number, number>): void {
        for (const [teamId, score] of scores) {
            this.updateScore(teamId, score);
        }
    }

    // Highlight winning team (optional visual feedback)
    public highlightTeam(teamId: number): void {
        if (!this.initialized) return;
        if (teamId < 1 || teamId > CONFIG.TEAM_COUNT) return;

        const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamId));
        if (widget) {
            // Set brighter background to highlight the winning team
            const teamColor = TEAM_COLORS[teamId - 1] ?? mod.CreateVector(1, 1, 1);
            mod.SetUIWidgetBgColor(widget, teamColor);
            mod.SetUIWidgetBgAlpha(widget, 0.8);
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
        for (let teamId = 1; teamId <= CONFIG.TEAM_COUNT; teamId++) {
            const widget = mod.FindUIWidgetWithName(getScoreWidgetName(teamId));
            if (widget) {
                mod.DeleteUIWidget(widget);
            }
        }

        // Delete container
        const container = mod.FindUIWidgetWithName(CONTAINER_NAME);
        if (container) {
            mod.DeleteUIWidget(container);
        }

        this.initialized = false;
    }
}
