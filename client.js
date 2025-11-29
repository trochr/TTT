const boardElement = document.getElementById('board');
const statusElement = document.getElementById('status');
const connectionStatusElement = document.getElementById('connection-status');
const restartButton = document.getElementById('restart');
const hostButton = document.getElementById('hostButton');
const joinButton = document.getElementById('joinButton');
const hostInfo = document.getElementById('hostInfo');
const gameUrl = document.getElementById('gameUrl');
const joinInfo = document.getElementById('joinInfo');
const gameIdInput = document.getElementById('gameIdInput');
const joinGameButton = document.getElementById('joinGameButton');
const qrcodeElement = document.getElementById('qrcode');
const playAgainButton = document.getElementById('playAgainButton'); // Added playAgainButton
const themeToggleContainer = document.getElementById('theme-toggle-container');
const themeIcon = document.getElementById('theme-icon');
console.log('themeToggleContainer:', themeToggleContainer);
const aestheticToggleContainer = document.getElementById('aesthetic-toggle-container'); // New container for aesthetic toggle
console.log('aestheticToggleContainer:', aestheticToggleContainer);
const aestheticIcon = document.getElementById('aesthetic-icon'); // New icon for aesthetic toggle
const themeNameDisplay = document.getElementById('theme-name-display'); // For displaying theme name
const networkWarningElement = document.getElementById('network-warning'); // New element for network warning

const BASE_THEME_MODES = ['dark', 'light', 'auto'];
const AESTHETIC_THEMES = [
    'default-dark', // This is the base dark theme in aesthetic terms
    'monochrome-classic',
    'urban-grey',
    'deep-ocean',
    'sunny-meadow',
    'cotton-candy',
    'twilight-haze',
    'forest-retreat',
    'cyber-punk',
    'sunset-glow'
];

let currentBaseThemeMode = localStorage.getItem('base-theme-mode') || 'dark'; // Default to dark for base
let currentAestheticTheme = localStorage.getItem('aesthetic-theme') || 'default-dark'; // Default aesthetic theme

// Helper to get a user-friendly theme name
function getFriendlyThemeName(baseMode, aestheticTheme) {
    let baseName = '';
    if (baseMode === 'dark') baseName = 'Dark';
    else if (baseMode === 'light') baseName = 'Light';
    else baseName = 'Auto';

    let aestheticName = AESTHETIC_THEMES.find(t => t === aestheticTheme)
                            .replace(/-/g, ' ')
                            .replace(/\b\w/g, char => char.toUpperCase());

    if (aestheticName === 'Default Dark') { // Special handling for the initial default
        return baseName + ' Default';
    }
    return baseName + ' ' + aestheticName;
}


// This function applies the single combined class
function applyCombinedTheme(isInitialLoad = false) {
    // Determine effective base mode for 'auto'
    let effectiveBaseMode = currentBaseThemeMode;
    if (currentBaseThemeMode === 'auto') {
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        effectiveBaseMode = prefersLight ? 'light' : 'dark';
        themeIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-monitor-smartphone group-hover:text-primary text-primary"><path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"></path><path d="M10 19v-3.96 3.15"></path><path d="M7 19h5"></path><rect width="6" height="10" x="16" y="12" rx="2"></rect></svg>';
    } else if (currentBaseThemeMode === 'light') {
        themeIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon-star group-hover:text-primary text-secondary"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9"></path><path d="M20 3v4"></path><path d="M22 5h-4"></path></svg>';
    } else { // dark
        themeIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun group-hover:text-primary text-secondary"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>';
    }
    aestheticIcon.innerHTML = '<svg version="1.1" class="aesthetic-svg" width="20" height="20" viewBox="0 0 100 100" id="svg2"><path d="M 84.71,80.953 C 84.541,76.951 78.525,65.051 78.667,60.433 c 0.162,-5.236 3.329,-11.685 9.923,0.922 3.951,7.555 10.016,2.854 10.752,-0.822 2.223,-11.12 -1.078,-24.458 -11.591,-37.527 C 69.567,0.405 37.605,-5.802 16.38,9.144 -4.844,24.092 -5.271,57.752 14.097,77.26 c 17.555,17.676 41.765,25.445 62.007,16.926 2.094,-0.885 8.416,-2.868 8.606,-13.233 z m -56.858,-65.534 c 3.83,-2.697 9.12,-1.78 11.819,2.052 2.699,3.831 1.779,9.122 -2.051,11.819 -3.833,2.699 -9.122,1.78 -11.821,-2.051 -2.698,-3.831 -1.779,-9.121 2.053,-11.82 z m -16.538,34.473 c -2.697,-3.831 -1.777,-9.122 2.053,-11.819 3.828,-2.697 9.122,-1.782 11.819,2.049 2.699,3.832 1.777,9.124 -2.051,11.821 -3.83,2.697 -9.124,1.781 -11.821,-2.051 z m 28.695,-1.996 c -2.701,-3.831 -1.781,-9.124 2.051,-11.821 3.831,-2.697 9.12,-1.779 11.821,2.053 2.697,3.83 1.778,9.12 -2.053,11.819 -3.832,2.698 -9.121,1.782 -11.82,-2.051 z M 23.794,71.543 c -2.697,-3.834 -1.78,-9.127 2.05,-11.824 3.831,-2.697 9.124,-1.779 11.821,2.051 2.697,3.832 1.78,9.125 -2.051,11.822 -3.831,2.697 -9.123,1.778 -11.82,-2.049 z" id="Palette_1_" /></svg>'; // Aesthetic icon remains static for now

    // Construct the aesthetic and base theme class names
    const aestheticClass = `theme-${currentAestheticTheme}`;
    const baseThemeClass = `theme-base-${effectiveBaseMode}`;

    // Remove all possible previous aesthetic and base theme classes
    AESTHETIC_THEMES.forEach(aesthetic => {
        document.documentElement.classList.remove(`theme-${aesthetic}`);
    });
    BASE_THEME_MODES.forEach(base => {
        let effectiveBase = base;
            if (base === 'auto') {
                effectiveBase = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            }
        document.documentElement.classList.remove(`theme-base-${effectiveBase}`);
    });

    // Add the new aesthetic and base theme classes
    document.documentElement.classList.add(aestheticClass, baseThemeClass);
    console.log('Applied aesthetic class:', aestheticClass, 'and base theme class:', baseThemeClass);

    localStorage.setItem('base-theme-mode', currentBaseThemeMode);
    localStorage.setItem('aesthetic-theme', currentAestheticTheme);

    if (!isInitialLoad) {
        showThemeName(getFriendlyThemeName(currentBaseThemeMode, currentAestheticTheme));
    }
}

function showThemeName(name) {
    if (!themeNameDisplay) return; // Exit if element doesn't exist

    themeNameDisplay.textContent = name;
    // The display will be handled by CSS based on parent hover
    // No explicit opacity setting here, relying on CSS.
}


function toggleBaseTheme() {
    console.log('toggleBaseTheme called');
    let currentIndex = BASE_THEME_MODES.indexOf(currentBaseThemeMode);
    let nextIndex = (currentIndex + 1) % BASE_THEME_MODES.length;
    currentBaseThemeMode = BASE_THEME_MODES[nextIndex];
    applyCombinedTheme();
}

function toggleAestheticTheme() {
    console.log('toggleAestheticTheme called');
    let currentIndex = AESTHETIC_THEMES.indexOf(currentAestheticTheme);
    let nextIndex = (currentIndex + 1) % AESTHETIC_THEMES.length;
    currentAestheticTheme = AESTHETIC_THEMES[nextIndex];
    applyCombinedTheme();
}

// Event listeners
themeToggleContainer.addEventListener('click', toggleBaseTheme);
aestheticToggleContainer.addEventListener('click', toggleAestheticTheme); // New event listener

// Listen for changes in system color scheme
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (currentBaseThemeMode === 'auto') {
        applyCombinedTheme(); // Re-apply auto theme to reflect system change
    }
});

// Apply themes on initial load
applyCombinedTheme(true);

// const WS_URL = `wss://d2s0bpt4nca4om.cloudfront.net`;
const WS_URL = window.WEBSOCKET_URL;
let reconnectInterval = 1000; // Initial reconnect interval in milliseconds
let ws;
let game = null;

// Check if playerId exists in local storage
let playerId = localStorage.getItem('playerId');

// Function to handle network latency warnings
function handleNetworkLatency(average_rtt) {
    if (average_rtt > 100) { // Threshold for poor connection
        networkWarningElement.textContent = `Poor network connection detected! RTT: ${average_rtt}ms`;
        networkWarningElement.style.display = 'block';
    } else {
        networkWarningElement.style.display = 'none';
    }
}

function initializeWebSocket(socket) {
    socket.onopen = () => {
        console.log('WebSocket connection opened');
        console.log('WebSocket readyState:', socket.readyState);
        reconnectInterval = 1000; // Reset reconnect interval on successful connection
        connectionStatusElement.textContent = 'Connection established';
        connectionStatusElement.style.color = 'green';
        console.log('connectionStatusElement updated: Connection established');

        // Send the stored playerId to the server, or an empty object if not available
        try {
            socket.send(JSON.stringify({ player_id: playerId || null }));
            console.log('Player ID sent:', playerId || 'null');
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
        // console.log('WebSocket message received:', event.data); // Disabled for less console noise
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
            console.error('WebSocket error message from server:', data.message);
            if (game) {
                game.handleMessage(data);
            } else {
                // Fallback if game is not yet initialized
                alert(data.message);
            }
        } else if (data.type === 'network_latency') {
            handleNetworkLatency(data.average_rtt);
        }
        else {
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
        connectionStatusElement.textContent = 'Connection lost. Reconnecting...';
        connectionStatusElement.style.color = 'red';
        console.log('connectionStatusElement updated: Connection lost');
        networkWarningElement.style.display = 'none'; // Hide network warning on close
        attemptReconnect();
        console.trace('WebSocket onclose stack trace');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        connectionStatusElement.textContent = 'Connection error';
        connectionStatusElement.style.color = 'red';
        console.log('connectionStatusElement updated: Connection error');
        networkWarningElement.style.display = 'none'; // Hide network warning on error
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
    const gameType = 'ttt';
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

restartButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    returnToMenuAndFocusHost();
});
playAgainButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    returnToMenuAndFocusHost();
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

// Function to return to the menu state and focus the host button
function returnToMenuAndFocusHost() {
    document.getElementById('menu').style.display = 'block';
    document.getElementById('game').style.display = 'none';
    document.getElementById('gameStatsDisplay').style.display = 'none'; // Ensure game stats are hidden
    hostInfo.style.display = 'none'; // Also hide host/join info
    joinInfo.style.display = 'none';

    // Attempt to blur any currently focused element
    if (document.activeElement) {
        document.activeElement.blur();
    }

    // Try focusing with a slight delay to avoid immediate activation
    setTimeout(() => {
        hostButton.focus();
    }, 50); // Small delay, e.g., 50ms
}

function connect() {
    console.log('Attempting to connect to WebSocket...');
    // Only create a new WebSocket if one doesn't already exist or the previous one is closed
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        console.log('Creating new WebSocket instance.');
        ws = new WebSocket(WS_URL);
        initializeWebSocket(ws);
    } else {
        console.log('WebSocket already exists or is connecting, current readyState:', ws.readyState);
        return; // Do not proceed if the WebSocket is already open or connecting
    }
}

function attemptReconnect() {
    setTimeout(() => { connect(); }, reconnectInterval);
    reconnectInterval = Math.min(reconnectInterval * 2, 30000); // Exponential backoff
}

connect();

// Initially hide theme controls after 5 seconds
setTimeout(() => {
    const topRightControls = document.getElementById('top-right-controls');
    if (topRightControls) {
        topRightControls.classList.add('controls-hidden-by-js');
    }
}, 5000);

returnToMenuAndFocusHost();