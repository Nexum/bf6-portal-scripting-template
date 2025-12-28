const RING_ID = 1;
const MOVE_INTERVAL = 2; // Sekunden zwischen Bewegungen
const MOVE_DISTANCE = 100; // Einheiten pro Bewegung

let ringCenter = { x: 0, y: 0, z: 0 };
let moveDirection = 1;
let lastMoveTime = 0;
let testActive = false;

export function initRingOfFireTest(): void {
    try {
        const ring = mod.GetRingOfFire(RING_ID);
        const pos = mod.GetObjectPosition(ring);

        ringCenter = {
            x: mod.XComponentOf(pos),
            y: mod.YComponentOf(pos),
            z: mod.ZComponentOf(pos),
        };

        testActive = true;
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.ringtest.initialized));
    } catch (e) {
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.ringtest.error));
    }
}

export function updateRingOfFireTest(): void {
    if (!testActive) return;

    const now = mod.GetMatchTimeElapsed();
    if (now - lastMoveTime < MOVE_INTERVAL) return;
    lastMoveTime = now;

    try {
        const ring = mod.GetRingOfFire(RING_ID);

        // Bewege X-Koordinate
        ringCenter.x += MOVE_DISTANCE * moveDirection;
        if (ringCenter.x > 500 || ringCenter.x < -500) {
            moveDirection *= -1;
        }

        const newPos = mod.CreateVector(ringCenter.x, ringCenter.y, ringCenter.z);
        const rotation = mod.GetObjectRotation(ring);
        const newTransform = mod.CreateTransform(newPos, rotation);

        // TEST: Bewegt sich der Ring?
        mod.SetObjectTransform(ring, newTransform);

        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.ringtest.moved));
    } catch (e) {
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.ringtest.moveFailed));
        testActive = false;
    }
}
