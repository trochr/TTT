const boardElement = document.getElementById('board');
const statusElement = document.getElementById('status');
const restartButton = document.getElementById('restart');
const hostButton = document.getElementById('hostButton');
const joinButton = document.getElementById('joinButton');
const hostInfo = document.getElementById('hostInfo');
const gameUrl = document.getElementById('gameUrl');
const joinInfo = document.getElementById('joinInfo');
const gameIdInput = document.getElementById('gameIdInput');
const joinGameButton = document.getElementById('joinGameButton');
const qrcodeElement = document.getElementById('qrcode');
const gameTypeSelect = document.getElementById('gameType');

const WS_URL = `wss://d2s0bpt4nca4om.cloudfront.net`;
let reconnectInterval = 1000; // Initial reconnect interval in milliseconds
let ws;
let game = null;

// Check if playerId exists in local storage
let playerId = localStorage.getItem('playerId');

function initializeWebSocket(socket) {
    socket.onopen = () => {
        console.log('WebSocket connection opened');
        console.log('WebSocket readyState:', socket.readyState);
        reconnectInterval = 1000; // Reset reconnect interval on successful connection

        // Send the stored playerId to the server, or an empty object if not available
        try {
            socket.send(JSON.stringify({ player_id: playerId || null }));
        } catch (error) {
            console.error('Error sending player ID:', error);
        }

        // Handle join links by fetching the playerId from local storage
        const gameIdFromUrl = getQueryParam('gameId');
        if (gameIdFromUrl) {
            console.log(`Attempting to join game with ID: ${gameIdFromUrl}`);
            if (!playerId) {
                console.log('No playerId found in local storage. Waiting for server to assign one.');
            } else {
                sendMessage({ type: 'join', game_id: gameIdFromUrl, player_id: playerId });
            }
        }
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'playerId') {
            // Store the new playerId in local storage
            playerId = data.player_id;
            localStorage.setItem('playerId', playerId);
            console.log(`Player ID assigned: ${playerId}`);

            // Retry joining the game if a gameId is present in the URL
            const gameIdFromUrl = getQueryParam('gameId');
            if (gameIdFromUrl) {
                console.log(`Retrying to join game with ID: ${gameIdFromUrl}`);
                sendMessage({ type: 'join', game_id: gameIdFromUrl, player_id: playerId });
            }
        } else if (data.type === 'host') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Host url received from server:`, data.url);
            hostInfo.style.display = 'block';
            gameUrl.value = data.url;
            adjustTextAreaWidth(data.url);
            // Clear previous QR code and generate a new one
            qrcodeElement.innerHTML = '';
            new QRCode(qrcodeElement, {
                text: data.url,
                width: 128,
                height: 128,
            });
        } else if (data.type === 'error') {
            if (game) {
                game.handleMessage(data);
            } else {
                // Fallback if game is not yet initialized
                alert(data.message);
            }
        } else {
            // Delegate game-specific messages to the game module
            if (data.type === 'start') {
                document.getElementById('menu').style.display = 'none';
                document.getElementById('game').style.display = 'flex';
                const gameType = data.game_type;
                if (gameType === 'ttt') {
                    game = new Ttt(boardElement, statusElement, restartButton, sendMessage);
                }
            }
            if (game) {
                if (data.type === 'update' && !game.player) {
                    // If an update message arrives before the player is set, ignore it.
                    // This can happen if update messages are sent immediately after game start.
                    return;
                }
                game.handleMessage(data);
            }
            if (data.type === 'win' || data.type === 'lose' || data.type === 'draw' || data.type === 'opponent_disconnected') {
                boardElement.classList.remove('othello');
            }
        }
    };

    socket.onclose = (event) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] WebSocket closed:`, event);
        console.log('Code:', event.code, 'Reason:', event.reason, 'WasClean:', event.wasClean);
        statusElement.textContent = 'Connection lost. Reconnecting...';
        attemptReconnect();
        console.trace('WebSocket onclose stack trace');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.trace('WebSocket onerror stack trace');
    };
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function sendMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    } else {
        console.error('WebSocket is not open. ReadyState:', ws ? ws.readyState : 'uninitialized');
    }
}

hostButton.addEventListener('click', () => {
    console.log('Host game button clicked. WebSocket readyState:', ws.readyState, WebSocket.OPEN);
    const gameType = gameTypeSelect.value;
    try {
        ws.send(JSON.stringify({ type: 'host', game_type: gameType }));
        console.log('Host message sent successfully.');
    } catch (error) {
        console.error('Error sending host message:', error);
    }
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Host button click handler finished`);
});

joinButton.addEventListener('click', () => {
    joinInfo.style.display = 'block';
});

joinGameButton.addEventListener('click', () => {
    const gameId = gameIdInput.value.trim().toUpperCase();
    if (gameId) {
        sendMessage({ type: 'join', game_id: gameId });
    }
});

const copyButton = document.getElementById('copyButton');

copyButton.addEventListener('click', () => {
    const urlToCopy = document.getElementById('gameUrl').value;

    // The Clipboard API is available only in secure contexts (HTTPS or localhost)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(urlToCopy)
            .then(() => {
                console.log('URL copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy URL using clipboard API: ', err);
                alert('Could not copy URL. Please copy it manually.');
            });
    } else {
        // Fallback for older browsers or insecure contexts
        const gameUrlInput = document.getElementById('gameUrl');
        gameUrlInput.select();
        try {
            document.execCommand('copy');
            console.log('URL copied to clipboard using fallback!');
        } catch (err) {
            console.error('Failed to copy URL with fallback: ', err);
            alert('Could not copy URL. Please copy it manually.');
        }
    }
});

function adjustTextAreaWidth(url) {
    if (!url) {
        console.warn('adjustTextAreaWidth called with empty URL.');
        gameUrl.style.width = '100px'; // Set a default width
        return;
    }


    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.whiteSpace = 'nowrap';
    tempSpan.style.font = window.getComputedStyle(gameUrl).font;
    tempSpan.textContent = url;
    document.body.appendChild(tempSpan);
    const width = tempSpan.offsetWidth + 20; // Add some padding
    document.body.removeChild(tempSpan);
    gameUrl.style.width = `${width}px`;
}

function connect() {
    console.log('Attempting to connect to WebSocket...');
    // Only create a new WebSocket if one doesn't already exist or the previous one is closed
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        ws = new WebSocket(WS_URL);
        initializeWebSocket(ws);
    } else {
        console.log('WebSocket already exists or is connecting.');
        return; // Do not proceed if the WebSocket is already open or connecting
    }
}

function attemptReconnect() {
    setTimeout(() => { connect(); }, reconnectInterval);
    reconnectInterval = Math.min(reconnectInterval * 2, 30000); // Exponential backoff
}

connect();
