# Battlefield 6 Portal TypeScript Template

A ready-to-use template for creating Battlefield 6 Portal experiences using TypeScript. This template provides a solid foundation with all the necessary tools, utilities, and example code to help you get started quickly.

## What is This?

This template is a starting point for building custom game modes, experiences, and modifications in Battlefield 6 Portal. Instead of starting from scratch, you can clone this repository and immediately begin coding your ideas.

**What's Included:**

- ✅ Complete TypeScript setup with type definitions
- ✅ Pre-configured build tools and bundler
- ✅ Code quality tools (ESLint, Prettier)
- ✅ Example debug tool with logging capabilities
- ✅ Helper utilities for common Portal tasks
- ✅ All Portal event handlers pre-wired
- ✅ Working examples you can learn from

## Prerequisites

Before you begin, make sure you have:

1. **Node.js** (version 23.0.0 or higher)
    - Download from [nodejs.org](https://nodejs.org/)
    - Verify installation: `node --version`

2. **npm** (comes with Node.js)
    - Verify installation: `npm --version`

3. **A Battlefield 6 Portal account**
    - Access to the Portal Experience Editor

4. **Basic familiarity with:**
    - JavaScript or TypeScript (helpful but not required)
    - Using a code editor (VS Code recommended)
    - Command line/terminal basics

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/deluca-mike/bf6-portal-scripting-template.git
cd bf6-portal-scripting-template
```

### 2. Update Project Information

Edit `package.json` and update these fields with your project details:

```json
{
    "name": "your-experience-name",
    "description": "Your experience description",
    "author": "Your Name",
    "repository": {
        "url": "your-repo-url"
    }
}
```

### 3. Install Dependencies

```bash
npm install
```

This downloads all the required packages and tools.

### 4. Build Your Experience

```bash
npm run build
```

This creates two files in the `dist/` folder:

- `bundle.ts` - Your compiled TypeScript code
- `bundle.strings.json` - All text strings used in your experience

### 5. Upload to Portal

1. Open the Battlefield 6 Portal Experience Editor
2. Navigate to the Scripting section
3. Click the "Manage Scripts" button.
4. Upload `dist/bundle.ts` via the "Custom Script" section.
5. Upload `dist/bundle.strings.json` via the "Text Strings" section.
6. Click "Import Files".
7. Save and test your experience!

## Project Structure

Understanding the folder structure will help you navigate and customize the template:

```
bf-portal-scripting-template/
├── src/                         # Your source code goes here
│   ├── index.ts                 # Main entry point - start here!
│   ├── debug-tool/              # Example debug tool (optional)
│   │   ├── index.ts
│   │   └── strings.json
│   ├── helpers/                 # Helper functions
│   │   └── index.ts
│   ├── modlib/                  # Official Portal helper library
│   │   └── index.ts
│   └── strings.json             # Text strings for your experience
├── dist/                        # Build output (generated)
│   ├── bundle.ts                # Upload this to Portal
│   └── bundle.strings.json      # Upload this to Portal
├── node_modules/                # Dependencies (auto-generated)
├── package.json                 # Project configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

### Key Files Explained

- **`src/index.ts`** - This is your main file. All Portal event handlers (like `OnPlayerDeployed`, `OnPlayerDied`, etc.) are defined here. This is where you'll write most of your game logic.

- **`src/strings.json`** - Contains all text strings that appear in-game. Portal requires strings to be pre-defined, so any text you want to display must be added here first.
    - Note that you can define a file that ends in `strings.json` anywhere beside code that is used, and the bundler will pick it up and include it in the final output.

- **`dist/bundle.ts`** - After running `npm run build`, this file contains all your code bundled together. This is what you upload to Portal in the "Custom Script" section.

- **`dist/bundle.strings.json`** - After running `npm run build`, this file contains all your strings bundled together. This is what you upload to Portal in the "Text Strings" section.

- **`package.json`** - Defines your project name, dependencies, and build scripts. You'll update this when you first clone the template.

## What This Template Does Out of the Box

When you first run this template, it provides:

### Debug Tool (Admin Only)

The first player to join a non-persistent test server (the "admin") can:

- **Triple-click the interact key** (E by default) anywhere to open a debug menu
- Toggle a **static logger** (fixed rows) showing position and facing direction
- Toggle a **dynamic logger** (scrolling console) showing game events
- Clear both loggers

### Event Logging

All major Portal events are automatically logged to the dynamic logger, including:

- Player deployment, death, and team switches
- Vehicle spawns and destruction
- Capture point events
- MCOM arming/defusing
- And many more...

### Map Detection

When a player deploys, they receive a notification showing:

- Their player name
- The current map name (using a working map detector, since Portal's built-in one is currently broken)

### Position Tracking

The admin's position and facing direction are logged every 0.5 seconds to the static logger (rows 0 and 1).

## Understanding the Code

### Event Handlers

Portal uses event handlers - functions that get called automatically when certain things happen in the game. The template includes all available handlers:

```typescript
// Called when a player spawns into the game
export function OnPlayerDeployed(eventPlayer: mod.Player): void {
    // Your code here
}

// Called when a player dies
export function OnPlayerDied(
    eventPlayer: mod.Player, // Who died
    eventOtherPlayer: mod.Player, // Who killed them
    eventDeathType: mod.DeathType,
    eventWeaponUnlock: mod.WeaponUnlock
): void {
    // Your code here
}
```

### Ongoing Functions

These run every server tick (30 times per second). Use them sparingly and keep the code minimal:

```typescript
// Called 30 times per second for each player
export function OngoingPlayer(eventPlayer: mod.Player): void {
    // Keep this code fast and minimal!
}
```

### The `mod` Namespace

All Portal functionality is accessed through the `mod` namespace:

```typescript
// Get a player's position
const position = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);

// Check if a player is alive
const isAlive = mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive);

// Display a notification
mod.DisplayNotificationMessage(message, player);
```

## Available Utilities

This template includes several helpful utility libraries:

### UI Module (`bf6-portal-utils/ui`)

An object-oriented wrapper around Portal's UI system. Makes creating buttons, text, and containers much easier:

```typescript
import { UI } from 'bf6-portal-utils/ui';

// Create a button
const button = new UI.Button(
    {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        onClick: async (player) => {
            // Handle click
        },
        label: {
            message: mod.Message(mod.stringkeys.your.buttonText),
            textColor: UI.COLORS.WHITE,
        },
    },
    player
);
```

### Logger Module (`bf6-portal-utils/logger`)

Display runtime text directly in-game, perfect for debugging:

```typescript
import { Logger } from 'bf6-portal-utils/logger';

// Create a logger
const logger = new Logger(player, {
    staticRows: false, // Dynamic scrolling mode
    visible: true,
    anchor: mod.UIAnchor.TopLeft,
});

// Log messages
logger.log('Player id: ' + mod.GetObjId(player));
```

### Map Detector (`bf6-portal-utils/map-detector`)

Detect which map is currently active (Portal's built-in function is broken):

```typescript
import { MapDetector } from 'bf6-portal-utils/map-detector';

const map = MapDetector.currentMap();

if (map === MapDetector.Map.Downtown) {
    // Downtown-specific logic
}
```

### Interact Multi-Click Detector (`bf6-portal-utils/interact-multi-click-detector`)

Detect when players multi-click the interact key (useful for opening menus):

```typescript
import { InteractMultiClickDetector } from 'bf6-portal-utils/interact-multi-click-detector';

export function OngoingPlayer(player: mod.Player): void {
    if (InteractMultiClickDetector.checkMultiClick(player)) {
        // Player triple-clicked interact key
        openMenu(player);
    }
}
```

### Official Modlib (`src/modlib`)

Helper functions provided by the official Portal developers:

```typescript
import { getPlayerId, getPlayersInTeam } from './modlib';

const playerId = getPlayerId(player);
const teammates = getPlayersInTeam(team);
```

## Customizing the Template

### Adding Your Own Code

Start by editing `src/index.ts`. You can:

1. **Remove the debug tool** if you don't need it (delete the `DebugTool` import and related code)
2. **Modify event handlers** to implement your game logic
3. **Add new event handlers** for events you want to respond to
4. **Create new files** in `src/` for organizing your code

### Adding New Strings

1. Edit `src/strings.json`:

```json
{
    "template": {
        "yourSection": {
            "yourKey": "Your text here"
        }
    }
}
```

2. Use it in code:

```typescript
mod.Message(mod.stringkeys.template.yourSection.yourKey);
```

### Creating New Modules

You can organize your code into separate files:

1. Create `src/your-module/index.ts`
2. Export functions or classes:

```typescript
export function yourFunction(): void {
    // Your code
}
```

3. Import in `src/index.ts`:

```typescript
import { yourFunction } from './your-module';
```

## Building and Development

### Build Commands

```bash
# Build your experience (creates dist/bundle.ts and dist/bundle.strings.json)
npm run build

# Check code for errors
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run prettier
```

### Development Workflow

1. **Edit code** in `src/`
2. **Run `npm run build`** to compile
3. **Copy `dist/bundle.ts`** to Portal's scripts section
4. **Upload `dist/bundle.strings.json`** to Portal's strings section
5. **Test in Portal**
6. **Repeat!**

### Hot Reloading

Unfortunately, Portal doesn't support hot reloading. You'll need to quit or take down the server, manually upload your code after each build, and re-host the experience. Consider keeping Portal's editor open in one window and your code editor in another for faster iteration, or use a community tool to automate script/strings uploading.

## Common Tasks

### Display a Notification to a Player

```typescript
export function OnPlayerDeployed(player: mod.Player): void {
    const message = mod.Message(mod.stringkeys.template.notifications.deployed, player);
    mod.DisplayNotificationMessage(message, player);
}
```

### Check Player State

```typescript
// Is the player alive?
const isAlive = mod.GetSoldierState(player, mod.SoldierStateBool.IsAlive);

// Get player position
const position = mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition);

// Get player health
const health = mod.GetSoldierState(player, mod.SoldierStateNumber.Health);
```

### Create a Simple UI Button

```typescript
import { UI } from 'bf6-portal-utils/ui';

const button = new UI.Button(
    {
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        anchor: mod.UIAnchor.Center,
        onClick: async (player) => {
            mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.your.buttonClicked), player);
        },
        label: {
            message: mod.Message(mod.stringkeys.your.buttonLabel),
            textColor: UI.COLORS.WHITE,
        },
    },
    player
);

// Don't forget to register the global button handler in OnPlayerUIButtonEvent!
```

### Wait for a Condition

```typescript
export async function OnPlayerDeployed(player: mod.Player): Promise<void> {
    // Wait until player is jumping
    while (!mod.GetSoldierState(player, mod.SoldierStateBool.isJumping)) {
        await mod.Wait(0.1);
    }

    // Player is now jumping, do something
}
```

## Troubleshooting

### Build Errors

- **"Cannot find module"** - Run `npm install` to install dependencies
- **Type errors** - Check that you're using Portal types correctly. Refer to the type definitions in `node_modules/bf6-portal-mod-types/`

### Portal Errors

- **Code not running**
    - First, check that all your `mod.Message` usages use only strings that exist in your `strings.json`. Portal tends to completely die as soonas you try to create a `mod.Message` with a string not defined this way.
    - Next, if you are on PC, check the lof file for errors. It should be at `C:\Users\username\AppData\Local\Temp\Battlefieldâ„¢ 6\PortalLog.txt`
    - Now, some common issues:
        - Syntax errors
        - Calling `mod` functions incorrectly
        - Missing string keys

### Performance Issues

- **Game lagging** - Check your `Ongoing*` functions. They run 30 times per second, so keep them fast!

## Learning Resources

### Understanding Portal Types

All Portal types are defined in `bf6-portal-mod-types`. You can explore them in:

- `node_modules/bf6-portal-mod-types/index.d.ts`

### Utility Documentation

Each utility module has detailed documentation:

- **UI Module**: `node_modules/bf6-portal-utils/ui/README.md`
- **Logger Module**: `node_modules/bf6-portal-utils/logger/README.md`
- **Map Detector**: `node_modules/bf6-portal-utils/map-detector/README.md`
- **Interact Detector**: `node_modules/bf6-portal-utils/interact-multi-click-detector/README.md`

### Portal Official Resources

- [Battlefield Portal Documentation](https://www.ea.com/games/battlefield/battlefield-6/onboarding-hub/bf6-portal-hub)
- [Portal Community Discord](https://discord.com/invite/battlefield-portal-community-870246147455877181)
- [Portal Community Reddit](https://www.reddit.com/r/BattlefieldPortal/)

## Next Steps

1. **Explore the code** - Read through `src/index.ts` to see how things work
2. **Try modifying** - Change the debug tool or add your own event handlers
3. **Build and test** - Run `npm run build` and upload to Portal
4. **Experiment** - Try creating your own UI, detecting events, or modifying player behavior
5. **Join the community** - Share your experiences and learn from others!

## Removing the Debug Tool

If you don't need the debug tool, you can remove it:

1. Delete `src/debug-tool/` folder
2. Remove the import from `src/index.ts`:
    ```typescript
    // Delete this line:
    import { DebugTool } from './debug-tool';
    ```
3. Remove all `adminDebugTool` references in `src/index.ts`

## Contributing

Found a bug or have a suggestion? Please open an issue on GitHub! Or message us on Discord!

## Support

- **Issues**: [GitHub Issues](https://github.com/deluca-mike/bf6-portal-scripting-template/issues)
- **Questions**: Open a discussion on GitHub

---

Happy coding! 🎮
