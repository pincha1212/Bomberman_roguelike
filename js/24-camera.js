// Bomberman Roguelike v3.7 — Player-follow camera
// Responsabilidad única: mantener al jugador visible y acompañarlo al recorrer el mapa.

const CAMERA = {
    // Zona de seguridad alrededor del centro. La cámara solo empieza a desplazarse
    // cuando el jugador sale de esta zona, evitando micro-movimientos constantes.
    deadzoneX: 96,
    deadzoneY: 96,
    smoothness: 0.16
};

function clampCameraPosition(value, maxValue) {
    return Math.max(0, Math.min(maxValue, value));
}

function getCameraBounds() {
    const worldWidth = gameState.gridWidth * TILE_SIZE;
    const worldHeight = gameState.gridHeight * TILE_SIZE;

    return {
        maxX: Math.max(0, worldWidth - canvas.width),
        maxY: Math.max(0, worldHeight - canvas.height)
    };
}

function getCameraTarget() {
    const bounds = getCameraBounds();
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    let targetX = gameState.camera.x;
    let targetY = gameState.camera.y;

    // Horizontal: solo desplazar cuando el jugador abandona la zona segura.
    const leftLimit = gameState.camera.x + CAMERA.deadzoneX;
    const rightLimit = gameState.camera.x + canvas.width - CAMERA.deadzoneX;
    if (playerCenterX < leftLimit) {
        targetX = playerCenterX - CAMERA.deadzoneX;
    } else if (playerCenterX > rightLimit) {
        targetX = playerCenterX - (canvas.width - CAMERA.deadzoneX);
    }

    // Vertical: misma lógica para seguir al personaje al bajar o subir por el mapa.
    const topLimit = gameState.camera.y + CAMERA.deadzoneY;
    const bottomLimit = gameState.camera.y + canvas.height - CAMERA.deadzoneY;
    if (playerCenterY < topLimit) {
        targetY = playerCenterY - CAMERA.deadzoneY;
    } else if (playerCenterY > bottomLimit) {
        targetY = playerCenterY - (canvas.height - CAMERA.deadzoneY);
    }

    return {
        x: clampCameraPosition(targetX, bounds.maxX),
        y: clampCameraPosition(targetY, bounds.maxY)
    };
}

function resetCameraToPlayer() {
    const bounds = getCameraBounds();
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    gameState.camera.x = clampCameraPosition(playerCenterX - canvas.width / 2, bounds.maxX);
    gameState.camera.y = clampCameraPosition(playerCenterY - canvas.height / 2, bounds.maxY);
    gameState.camera.targetX = gameState.camera.x;
    gameState.camera.targetY = gameState.camera.y;
}

function updateCamera(dt) {
    if (!player || !gameState.gridWidth || !gameState.gridHeight) return;

    const target = getCameraTarget();
    gameState.camera.targetX = target.x;
    gameState.camera.targetY = target.y;

    // Suavizado independiente del FPS. En frames largos no se queda detrás del jugador.
    const frameScale = Math.min(Math.max(dt, 0) / 16.6667, 3);
    const followFactor = 1 - Math.pow(1 - CAMERA.smoothness, frameScale);

    gameState.camera.x += (gameState.camera.targetX - gameState.camera.x) * followFactor;
    gameState.camera.y += (gameState.camera.targetY - gameState.camera.y) * followFactor;

    const bounds = getCameraBounds();
    gameState.camera.x = clampCameraPosition(gameState.camera.x, bounds.maxX);
    gameState.camera.y = clampCameraPosition(gameState.camera.y, bounds.maxY);
}
