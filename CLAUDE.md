# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript template for creating Battlefield 6 Portal experiences (custom game modes/mods). Code is compiled via a custom bundler and manually uploaded to Portal's web editor.

**Key Technologies:**

- TypeScript 5.9.3 with strict mode
- Node.js 23.0.0+ required
- QuickJS runtime (Portal's JavaScript engine)
- bf6-portal-bundler for Portal-specific compilation
- bf6-portal-mod-types for game API type definitions
- bf6-portal-utils for UI, logging, map detection utilities

## Common Commands

```bash
npm run build              # Compile to dist/bundle.ts and dist/bundle.strings.json
npm run lint               # Check for linting errors
npm run lint:fix           # Auto-fix linting issues
npm run prettier           # Format code
npm run export-thumbnail   # Resize/compress thumbnail to Portal specs (352x248px, 78KB max)
npm run minify-spatials    # Minify spatial JSON files in ./spatials/ to ./dist/spatials/
```

## Architecture

### Event-Driven Model

Portal executes code through event handler functions exported from `src/index.ts`. The game engine calls these automatically:

- **One-time events**: `OnPlayerDeployed`, `OnPlayerDied`, `OnPlayerTeamSwitch`, `OnVehicleSpawned`, etc.
- **Ongoing events**: `OngoingPlayer`, `OngoingGlobal` - run 30x/second (keep minimal!)

### String System

All in-game text must be pre-defined in `*.strings.json` files. The bundler collects all `*strings.json` files and outputs `bundle.strings.json`. Access strings via `mod.Message(mod.stringkeys.path.to.key)`.

### The `mod` Namespace

All Portal API functionality is accessed through the global `mod` namespace:

- `mod.GetSoldierState()` - Query player state (position, health, etc.)
- `mod.DisplayNotificationMessage()` - Show UI messages
- `mod.Message()` - Create string references
- `mod.Wait()` - Async delay

### Key Directories

- `src/` - Source code; `index.ts` is the entry point with all event handlers
- `src/helpers/` - Custom utility functions
- `src/modlib/` - Official Portal helper library (excluded from linting)
- `src/debug-tool/` - Optional admin debug menu (can be removed)
- `spatials/` - Spatial Editor JSON map files (optional)
- `dist/` - Build output (upload these files to Portal)

### Utility Libraries (bf6-portal-utils)

- `bf6-portal-utils/ui` - Object-oriented UI system wrapper
- `bf6-portal-utils/logger` - In-game debug logging (static rows or scrolling)
- `bf6-portal-utils/map-detector` - Working map detection (built-in is broken)
- `bf6-portal-utils/interact-multi-click-detector` - Detect triple-click for menus

## Development Notes

- No hot reload - must rebuild, upload bundle.ts and bundle.strings.json to Portal editor, restart server
- `Ongoing*` functions run 30x/second; keep them fast to avoid lag
- Portal scripts fail silently if `mod.Message()` references undefined string keys
- Type definitions in `node_modules/bf6-portal-mod-types/index.d.ts`
- Portal log file (PC): `C:\Users\username\AppData\Local\Temp\Battlefield™ 6\PortalLog.txt`

## Types and Libraries

### bf6-portal-mod-types

- Type definitions for the Portal API

# IMPORTANT

Always start by reading the types in node_modules/bf6-portal-mod-types/index.d.ts

---

## API Lessons Learned

### Player State Queries

**CRITICAL: Check if player is deployed before querying soldier state!**

```typescript
// BAD - throws "PlayerNotDeployed" exception if player not spawned
mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive);

// GOOD - check IsAlive first, or wrap in try/catch
if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive)) {
    // Safe to query other states
}
```

The error `Exception: PlayerNotDeployed` occurs when calling `GetSoldierState()` on a player who hasn't spawned yet (e.g., in deploy screen).

### Teams API

**There is NO `mod.AllTeams()` function!**

```typescript
// BAD - does not exist
const teams = mod.AllTeams();

// GOOD - get team by ID directly (teams are 1-indexed)
const team = mod.GetTeam(teamId); // teamId: number
```

To iterate teams, use a for loop with known team count:
```typescript
for (let teamId = 1; teamId <= TEAM_COUNT; teamId++) {
    const team = mod.GetTeam(teamId);
    // ...
}
```

### UI Widget Functions

**Correct function names:**

| Wrong | Correct |
|-------|---------|
| `mod.SetUIWidgetText()` | `mod.SetUITextLabel(widget, message)` |
| `mod.SetUIWidgetVisibility()` | `mod.SetUIWidgetVisible(widget, bool)` |

### Player Spotting

```typescript
// Spot a player for all players (visible on minimap + 3D marker)
mod.SpotTarget(player, duration, mod.SpotStatus.SpotInBoth);

// SpotStatus options:
// - SpotInBoth: minimap + 3D world marker
// - SpotInMinimap: minimap only
// - SpotInWorld: 3D marker only
// - Unspot: remove spotting

// Remove spotting
mod.SpotTarget(player, mod.SpotStatus.Unspot);
```

### Game Mode Settings

```typescript
// Set via code (cannot be set in Portal Editor for custom modes)
mod.SetGameModeTargetScore(20);      // Score to win
mod.SetGameModeTimeLimit(1200);      // Time limit in seconds
mod.EndGameMode(winningTeam);        // End game with winner
```

### Function Name Conflicts

**Avoid duplicate exported function names across files!**

The bundler merges all files into one bundle. If two files export functions with the same name, you get:
```
Cannot redeclare exported variable 'functionName'
Duplicate function implementation
```

Solution: Use unique names or don't export helper functions that are only used internally.

### Useful Helper from modlib

```typescript
import { getPlayersInTeam } from '../modlib/index.ts';

// Returns array of players on a team
const players: mod.Player[] = getPlayersInTeam(team);
```

### Array Iteration Pattern

Portal uses its own array type. Convert or iterate manually:

```typescript
// Manual iteration
const allPlayers = mod.AllPlayers();
const count = mod.CountOf(allPlayers);
for (let i = 0; i < count; i++) {
    const player = mod.ValueInArray(allPlayers, i) as mod.Player;
    // ...
}

// Or use modlib helper
import { ConvertArray } from '../modlib/index.ts';
const playersArray = ConvertArray(mod.AllPlayers());
```

### Async/Await with mod.Wait()

```typescript
// Using .then()
mod.Wait(3).then(() => {
    // Runs after 3 seconds
});

// Using async/await
async function example() {
    await mod.Wait(3);
    // Runs after 3 seconds
}
```

### UI Best Practices

1. Use unique widget names to find/update widgets later
2. Store widget names as constants
3. UI is global - widgets are visible to all players unless restricted
4. Use `mod.GetUIRoot()` as parent for top-level containers

```typescript
const WIDGET_NAME = 'my_unique_widget';
mod.AddUIText(WIDGET_NAME, ...);

// Later, find and update
const widget = mod.FindUIWidgetWithName(WIDGET_NAME);
mod.SetUITextLabel(widget, newMessage);
```

---

## Game Mode Development Checklist

1. **Create module folder** under `src/` (e.g., `src/my-mode/`)
2. **Create strings.json** for all UI text
3. **Create state.ts** for game state management
4. **Create main controller class** with methods for each event
5. **Integrate in src/index.ts** - import and call controller methods from event handlers
6. **Run `npm run build`** and check for TypeScript errors
7. **Test in Portal** - check `PortalLog.txt` for runtime errors
