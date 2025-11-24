// Match server gravity: frames per drop at each level
const LEVEL_FRAMES = [
    48, 43, 38, 33, 28, 23, 18, 13, 8, 6,  // Levels 0-9
    5, 5, 5,  // Levels 10-12
    4, 4, 4,  // Levels 13-15
    3, 3, 3,  // Levels 16-18
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2,  // Levels 19-28
    1  // Level 29+
];
const PIECES = {
    'T': {
        0: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
        1: [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
        2: [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
        3: [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
    },
    'I': {
        0: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        1: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
        2: [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
        3: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    },
    'O': {
        0: [[1, 1], [1, 1]],
        1: [[1, 1], [1, 1]],
        2: [[1, 1], [1, 1]],
        3: [[1, 1], [1, 1]],
    },
    'L': {
        0: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
        1: [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
        2: [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
        3: [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
    },
    'J': {
        0: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
        1: [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
        2: [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
        3: [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
    },
    'S': {
        0: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        1: [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
        2: [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
        3: [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
    },
    'Z': {
        0: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
        1: [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
        2: [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
        3: [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
    },
};

const JLSTZ_KICKS = {
    '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};

const I_KICKS = {
    '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

class Ttt {
        ensureBoardHeight() {
            // Always keep the board at 20 rows
            while (this.board.length < 20) {
                this.board.unshift(Array(10).fill(0));
            }
            while (this.board.length > 20) {
                this.board.shift();
            }
        }
    constructor(boardElement, statusElement, restartButton, sendMessageCallback) {
        // Gravity timer for client-side piece fall
        this.gravityInterval = LEVEL_FRAMES[0] * (1000 / 60); // ms, level 0
        this.lastGravityTime = Date.now();
        this.boardElement = boardElement;
        this.statusElement = statusElement;
        this.restartButton = restartButton;
        this.sendMessage = sendMessageCallback;

        this.board = this.createBoard();
        this.serverBoard = null;
        this.currentPiece = null; // { piece: {...}, piece_number: N }
        this.nextPiece = null;    // { piece: {...}, piece_number: N }
        this.clientPiece = null; // (legacy, for rendering, will be set from currentPiece.piece)
        this.serverPiece = null; // The authoritative piece from the server
        this.gameId = null;
        this.currentPieceNumber = null; // Track the current piece_number from the server
        this.player = null;
        this.isDropping = false;
        this.gameOver = false;
        this.toppedOut = false;
        this.prevPlayer1Finished = false;
        this.prevPlayer2Finished = false;
        this.nextPiecePreviewElement = document.getElementById('nextPiecePreview');
        this.scorePlayer1Element = document.getElementById('score-player1');
        this.scorePlayer2Element = document.getElementById('score-player2');
        this.linesPlayer1Element = document.getElementById('lines-player1');
        this.linesPlayer2Element = document.getElementById('lines-player2');
        this.levelPlayer1Element = document.getElementById('level-player1');
        this.levelPlayer2Element = document.getElementById('level-player2');
        this.inputDisabled = false;
        this.nextPiece = null; // Track the next piece for client-side spawning
        this.opponentMiniMapElement = document.getElementById('opponent-mini-map');

        // Input handling properties
        this.keyStates = {};
        this.dasDelay = 180; // ms
        this.arrRate = 25;   // ms (50% faster)
        this.softDropRate = 25; // ms
        this.dasTimer = null;
        this.arrInterval = null;
        this.softDropInterval = null;
        this.moveDirection = 0; // -1 for left, 1 for right

        // Interpolation properties
        this.interpolationFactor = 0.3; // 30% interpolation per frame

        this._initializeBoard();
        this.gameLoop(); // Start the game loop
    }

    gameLoop() {
        // Gravity and stacking with lock delay (now handles both gravity and soft drop)
        if (this.currentPiece && this.currentPiece.piece) {
            const now = Date.now();
            if (!this.lockDelayStart) this.lockDelayStart = null;
            // Gravity: move piece down if enough time has passed
            if (now - this.lastGravityTime >= this.gravityInterval) {
                const newY = this.currentPiece.piece.y + 1;
                const x = this.currentPiece.piece.x;
                if (this.is_valid_move(this.board, this.currentPiece.piece, x, newY)) {
                    this.currentPiece.piece.y = newY;
                    this.clientPiece = this.currentPiece.piece;
                    this.lockDelayStart = null; // Reset lock delay if moved down
                }
                this.lastGravityTime = now;
            }
            // Check if piece is grounded (cannot move down)
            const grounded = !this.is_valid_move(this.board, this.currentPiece.piece, this.currentPiece.piece.x, this.currentPiece.piece.y + 1);
            if (grounded) {
                if (this.lockDelayStart === null) {
                    this.lockDelayStart = now;
                }
                if (now - this.lockDelayStart >= 500) { // 0.5s lock delay
                    this.lock_piece(this.board, this.currentPiece.piece);
                    const cleared = this.clear_lines(this.board);
                    this.board = cleared.board;
                    // Inform server that the piece was locked
                    this.sendMessage({ type: 'move', game_id: this.gameId, action: 'hard_drop' });
                    if (this.nextPiece && this.nextPiece.piece) {
                        const next = JSON.parse(JSON.stringify(this.nextPiece.piece));
                        this.currentPiece = { piece: next };
                        this.clientPiece = next;
                        this.nextPiece = null;
                    } else {
                        this.currentPiece = null;
                        this.clientPiece = null;
                    }
                    this.lockDelayStart = null;
                    // Now spawn nextPiece from cache; do not wait for server
                }
            } else {
                // Not grounded, reset lock delay
                if (this.lockDelayStart !== null) {
                    console.log('[DEBUG] Lock delay reset: piece not grounded');
                }
                this.lockDelayStart = null;
            }
        } else {
            this.lockDelayStart = null;
        }
        // No snapping or interpolation to serverPiece; clientPiece is sovereign

        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    createBoard() {
        return Array.from({ length: 20 }, () => Array(10).fill(0));
    }

    _initializeBoard() {
        this.boardElement.innerHTML = '';
        this.boardElement.classList.add('ttt');
        for (let r = 0; r < 20; r++) {
            for (let c = 0; c < 10; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                this.boardElement.appendChild(cell);
            }
        }

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    is_valid_move(board, piece, x, y) {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c]) {
                    if (
                        y + r >= 20 ||
                        x + c < 0 ||
                        x + c >= 10 ||
                        (board[y + r] && board[y + r][x + c]) // Check if board[y+r] exists
                    ) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    rotate_piece(piece, clockwise = true) {
        const new_rotation = clockwise ? (piece.rotation + 1) % 4 : (piece.rotation - 1 + 4) % 4;
        const new_shape = PIECES[piece.name][new_rotation];
        return { ...piece, shape: new_shape, rotation: new_rotation };
    }

    lock_piece(board, piece) {
        piece.shape.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell) {
                    board[piece.y + r][piece.x + c] = piece.name;
                }
            });
        });
    }

    clear_lines(board) {
        let lines_cleared = 0;
        let new_board = [];
        board.forEach(row => {
            if (row.includes(0)) {
                new_board.push(row);
            } else {
                lines_cleared += 1;
            }
        });

        for (let i = 0; i < lines_cleared; i++) {
            new_board.unshift(Array(10).fill(0));
        }
        // Always return exactly 20 rows
        while (new_board.length < 20) {
            new_board.unshift(Array(10).fill(0));
        }
        while (new_board.length > 20) {
            new_board.shift();
        }
        return { board: new_board, lines_cleared: lines_cleared };
    }

    add_garbage_lines(board, num_lines, hole_position = -1) {
        if (num_lines > 0) { // Only generate hole if there are lines to add
            let actual_hole_position = hole_position;
            if (actual_hole_position === -1) { // If no hole position is provided, generate a random one
                actual_hole_position = Math.floor(Math.random() * 10);
            }
            for (let i = 0; i < num_lines; i++) {
                let garbage_line = Array(10).fill('G');
                // Use the same hole_position for all lines
                garbage_line[actual_hole_position] = 0;
                board.shift(); // Remove top row
                board.push(garbage_line); // Add to bottom
            }
            // Ensure board is always 20 rows
            while (board.length < 20) {
                board.unshift(Array(10).fill(0));
            }
            while (board.length > 20) {
                board.shift();
            }
        }
    }

    handleKeyDown(event) {
        if (this.gameOver || this.toppedOut || !this.gameId || this.inputDisabled) {
            if (event.key === 'Enter') {
                this.sendMessage({ type: 'restart', game_id: this.gameId });
                this.statusElement.textContent = '';
                this.gameOver = false;
                this.toppedOut = false;
            }
            return;
        }

        if (this.keyStates[event.key]) return; // Prevent auto-repeat from re-triggering initial actions
        this.keyStates[event.key] = true;

        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowRight':
                const direction = (event.key === 'ArrowLeft') ? -1 : 1;
                this.movePiece(direction, 0);
                this.startDas(direction);
                break;
            case 'ArrowDown':
                if (!this.softDropInterval) { // Check to prevent multiple intervals
                    this.movePiece(0, 1); // Move once immediately
                    this.softDropInterval = setInterval(() => {
                        this.movePiece(0, 1);
                    }, this.softDropRate);
                }
                break;
            case 'w':
                this.rotatePiece(false); // Rotate left
                break;
            case 'x':
                this.rotatePiece(true); // Rotate right
                break;
            case 'ArrowUp':
                this.hardDrop();
                break;
        }
    }

    handleKeyUp(event) {
        this.keyStates[event.key] = false;
        if ((event.key === 'ArrowLeft' && this.moveDirection === -1) || (event.key === 'ArrowRight' && this.moveDirection === 1)) {
            this.stopDas();
        }
        if (event.key === 'ArrowDown') {
            clearInterval(this.softDropInterval);
            this.softDropInterval = null;
        }
    }

    movePiece(dx, dy) {
        if (!this.clientPiece || !this.currentPiece) return;
        let newPiece = JSON.parse(JSON.stringify(this.clientPiece));
        const willMove = this.is_valid_move(this.board, newPiece, newPiece.x + dx, newPiece.y + dy);
        if (willMove) {
            newPiece.x += dx;
            newPiece.y += dy;
            this.clientPiece = newPiece;
            this.currentPiece.piece = newPiece; // keep canonical state in sync
            this.sendMessage({ type: 'move', game_id: this.gameId, action: 'move', dx: dx, dy: dy });
            // Reset lock delay if piece is moved off the ground
            if (this.lockDelayStart !== null) {
                if (this.is_valid_move(this.board, this.clientPiece, this.clientPiece.x, this.clientPiece.y + 1)) {
                    console.log('[DEBUG] Lock delay reset: piece moved off ground');
                    this.lockDelayStart = null;
                }
            }
        }
        // No lock delay or locking here; handled in gameLoop
    }

    rotatePiece(clockwise) {
        if (!this.clientPiece) return;

        const originalPiece = JSON.parse(JSON.stringify(this.clientPiece));
        let rotatedPiece = this.rotate_piece(originalPiece, clockwise);
        let moveSuccessful = false;

        const kickTable = (this.clientPiece.name === 'I') ? I_KICKS : JLSTZ_KICKS;
        const fromRotation = originalPiece.rotation;
        const toRotation = rotatedPiece.rotation;
        const kickKey = `${fromRotation}->${toRotation}`;

        const kicks = kickTable[kickKey] || [[0, 0]];

        for (const kick of kicks) {
            const [dx, dy] = kick;
            if (this.is_valid_move(this.board, rotatedPiece, originalPiece.x + dx, originalPiece.y - dy)) {
                rotatedPiece.x = originalPiece.x + dx;
                rotatedPiece.y = originalPiece.y - dy;
                this.clientPiece = rotatedPiece;
                moveSuccessful = true;
                break;
            }
        }

        if (moveSuccessful) {
            this.currentPiece.piece = this.clientPiece;
            this.sendMessage({ type: 'move', game_id: this.gameId, action: clockwise ? 'rotate_right' : 'rotate_left' });
            // Reset lock delay if piece is moved off the ground by rotation
            if (this.lockDelayStart !== null) {
                if (this.is_valid_move(this.board, this.clientPiece, this.clientPiece.x, this.clientPiece.y + 1)) {
                    this.lockDelayStart = null;
                }
            }
        }
    }

    hardDrop() {
        if (!this.clientPiece) return;
        this.inputDisabled = true;
        this.stopDas();
        let newPiece = JSON.parse(JSON.stringify(this.clientPiece));
        while (this.is_valid_move(this.board, newPiece, newPiece.x, newPiece.y + 1)) {
            newPiece.y += 1;
        }
        this.clientPiece = newPiece;
        // Lock the piece and spawn the next one, just like gravity lock
        this.lock_piece(this.board, this.clientPiece);
        const cleared = this.clear_lines(this.board);
        this.board = cleared.board;
        if (this.nextPiece && this.nextPiece.piece) {
            const next = JSON.parse(JSON.stringify(this.nextPiece.piece));
            this.currentPiece = { piece: next };
            this.clientPiece = next;
            this.nextPiece = null;
        } else {
            this.currentPiece = null;
            this.clientPiece = null;
        }
        this.sendMessage({ type: 'move', game_id: this.gameId, action: 'hard_drop' });
    }

    startDas(direction) {
        this.stopDas();
        this.moveDirection = direction;
        this.dasTimer = setTimeout(() => {
            this.arrInterval = setInterval(() => {
                this.movePiece(this.moveDirection, 0);
            }, this.arrRate);
        }, this.dasDelay);
    }

    stopDas() {
        clearTimeout(this.dasTimer);
        clearInterval(this.arrInterval);
        this.dasTimer = null;
        this.arrInterval = null;
        this.moveDirection = 0;
    }

    calculateGhostPiece() {
        if (!this.clientPiece) {
            return null;
        }
        let ghost = JSON.parse(JSON.stringify(this.clientPiece));
        // Use integer coordinates for ghost piece calculation to avoid floating point issues
        ghost.x = Math.round(ghost.x);
        ghost.y = Math.round(ghost.y);
        while (this.is_valid_move(this.board, ghost, ghost.x, ghost.y + 1)) {
            ghost.y++;
        }
        return ghost;
    }

    draw() {
        // 1. Reset board and draw locked pieces
        this.board.forEach((row, r) => {
            row.forEach((cell, c) => {
                const cellElement = this.boardElement.children[r * 10 + c];
                cellElement.className = 'cell';
                if (cell) {
                    cellElement.classList.add('filled', `filled-${cell}`);
                }
            });
        });

        // 1b. Overlay server board as silhouette (if available and #DEBUG_SILOUHETTE in URL)
        if (this.serverBoard && window.location.hash === '#DEBUG_SILOUHETTE') {
            this.serverBoard.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell) {
                        const cellElement = this.boardElement.children[r * 10 + c];
                        if (cellElement) {
                            cellElement.classList.add('server-silhouette');
                        }
                    }
                });
            });
        }

        // 2. Calculate and draw ghost piece
        const ghostPiece = this.calculateGhostPiece();
        if (ghostPiece) {
            const pieceName = ghostPiece.name;
            ghostPiece.shape.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell) {
                        const y = ghostPiece.y + r;
                        const x = ghostPiece.x + c;
                        if (y >= 0 && y < 20 && x >= 0 && x < 10) {
                            const cellElement = this.boardElement.children[y * 10 + x];
                            if (cellElement) { // Add safety check
                                cellElement.classList.add('ghost', 'filled', `filled-${pieceName}`);
                            }
                        }
                    }
                });
            });
        }

        // 3. Draw the active piece
        if (this.clientPiece) {
            const pieceName = this.clientPiece.name;
            this.clientPiece.shape.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell) {
                        // Round the coordinates before rendering to get a valid grid cell
                        const y = Math.round(this.clientPiece.y) + r;
                        const x = Math.round(this.clientPiece.x) + c;
                        if (y >= 0 && y < 20 && x >= 0 && x < 10) {
                            const cellElement = this.boardElement.children[y * 10 + x];
                            if (cellElement) { // Add safety check
                                cellElement.classList.remove('ghost'); // Ensure active piece is not transparent
                                cellElement.classList.add('filled', `filled-${pieceName}`);
                            }
                        }
                    }
                });
            });
        }

        // 4. Overlay server falling piece as silhouette (only if #DEBUG_SILOUHETTE in URL)
        if (this.serverPiece && this.serverPiece.shape && window.location.hash === '#DEBUG_SILOUHETTE') {
            const pieceName = this.serverPiece.name;
            this.serverPiece.shape.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell) {
                        const y = Math.round(this.serverPiece.y) + r;
                        const x = Math.round(this.serverPiece.x) + c;
                        if (y >= 0 && y < 20 && x >= 0 && x < 10) {
                            const cellElement = this.boardElement.children[y * 10 + x];
                            if (cellElement) {
                                cellElement.classList.add('server-silhouette');
                            }
                        }
                    }
                });
            });
        }
    }

    drawNextPiece(piece) {
        this.nextPiecePreviewElement.innerHTML = '';
        // Use nextPiece.piece for preview
        const pieceObj = this.nextPiece && this.nextPiece.piece ? this.nextPiece.piece : piece;
        if (!pieceObj) return;

        const previewGrid = document.createElement('div');
        previewGrid.classList.add('ttt-preview-grid');
        previewGrid.style.display = 'grid';
        previewGrid.style.gridGap = '1px';

        const shape = pieceObj.shape;
        // Create a 4x4 grid of cells
        const cells = [];
        for (let r = 0; r < 4; r++) {
            cells[r] = [];
            for (let c = 0; c < 4; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                previewGrid.appendChild(cell);
                cells[r][c] = cell;
            }
        }

        // Center the piece in the grid
        const shapeHeight = shape.length;
        const shapeWidth = shape[0].length;
        const rowOffset = Math.floor((4 - shapeHeight) / 2);
        const colOffset = Math.floor((4 - shapeWidth) / 2);

        // Draw the piece
        const pieceName = pieceObj.name;
        for (let r = 0; r < shapeHeight; r++) {
            for (let c = 0; c < shapeWidth; c++) {
                if (shape[r][c]) {
                    const gridRow = r + rowOffset;
                    const gridCol = c + colOffset;
                    if (gridRow >= 0 && gridRow < 4 && gridCol >= 0 && gridCol < 4) {
                        cells[gridRow][gridCol].classList.add('filled', `filled-${pieceName}`);
                    }
                }
            }
        }

        this.nextPiecePreviewElement.appendChild(previewGrid);
    }

    handleMessage(data) {
        switch (data.type) {
                        case 'garbage':
                            // Log and apply garbage lines as instructed by the server
                            if (typeof data.lines === 'number' && data.lines > 0) {
                                const hole = (typeof data.hole === 'number') ? data.hole : -1;
                                console.log(`[GARBAGE] Received ${data.lines} line(s) from server. Hole position: ${hole}`);
                                this.add_garbage_lines(this.board, data.lines, hole);
                                this.ensureBoardHeight();
                            }
                            break;
            case 'start':
                this.gameId = data.game_id;
                this.player = data.player;
                this.board = data.board;
                this.serverBoard = data.board ? JSON.parse(JSON.stringify(data.board)) : null;
                this.serverPiece = data.piece;
                if (data.piece && data.piece.name) {
                    // Only use the piece type from the server, create a new piece locally
                    const pieceType = data.piece.name;
                    const newPiece = {
                        name: pieceType,
                        shape: PIECES[pieceType][0],
                        x: 3,
                        y: 0,
                        rotation: 0
                    };
                    this.currentPiece = {
                        piece: newPiece,
                        piece_number: (typeof data.piece_number !== 'undefined') ? data.piece_number : 0
                    };
                    this.clientPiece = this.currentPiece.piece;
                }
                if (data.next_piece && data.next_piece.name && typeof data.piece_number !== 'undefined') {
                    const nextType = data.next_piece.name;
                    const nextPiece = {
                        name: nextType,
                        shape: PIECES[nextType][0],
                        x: 3,
                        y: 0,
                        rotation: 0
                    };
                    this.nextPiece = {
                        piece: nextPiece,
                        piece_number: data.piece_number + 1
                    };
                    this.drawNextPiece(this.nextPiece.piece);
                }
                this.statusElement.textContent = '';
                this.gameOver = false;
                this.toppedOut = false;
                this.prevPlayer1Finished = false;
                this.prevPlayer2Finished = false;
                this.inputDisabled = false;
                this.scorePlayer1Element.textContent = 'Player 1: 0';
                this.scorePlayer2Element.textContent = 'Player 2: 0';
                // Initial draw of next piece
                if (data.next_piece) {
                    this.drawNextPiece(data.next_piece);
                }
                break;
            case 'update':
                // Assign playerData and opponentData first
                let playerData;
                let opponentData = null;
                if (data.player1 && data.player2) {
                    playerData = data[this.player];
                    opponentData = this.player === 'player1' ? data.player2 : data.player1;
                } else {
                    playerData = data;
                }
                // Update gravity interval based on level
                if (playerData && typeof playerData.level === 'number') {
                    const levelIdx = Math.min(playerData.level, LEVEL_FRAMES.length - 1);
                    this.gravityInterval = LEVEL_FRAMES[levelIdx] * (1000 / 60);
                }
                // Defer garbage application until after any board replacement (e.g., after line clears)
                let pendingGarbage = 0;
                let pendingGarbageHole = -1;
                if (playerData && typeof playerData.garbage === 'number' && playerData.garbage > 0) {
                    pendingGarbage = playerData.garbage;
                    pendingGarbageHole = (typeof playerData.garbage_hole === 'number') ? playerData.garbage_hole : -1;
                    playerData.garbage = 0;
                }
                // ...existing code...
                // At the end of the update block, after all possible board replacements:
                if (pendingGarbage > 0) {
                    console.log(`[GARBAGE] Received ${pendingGarbage} line(s) from server. Hole position: ${pendingGarbageHole}`);
                    this.add_garbage_lines(this.board, pendingGarbage, pendingGarbageHole);
                    this.ensureBoardHeight();
                }
                this.isDropping = false;
                this.inputDisabled = false; // Re-enable input on update


                // (declaration moved above, do not redeclare)
                // Print and render opponent mini map if available
                if (opponentData && opponentData.board) {
                    // Render as a grid of divs
                    if (this.opponentMiniMapElement) {
                        let html = '<div class="opponent-mini-board">';
                        for (let r = 0; r < opponentData.board.length; r++) {
                            html += '<div class="opponent-mini-board-row">';
                            for (let c = 0; c < opponentData.board[r].length; c++) {
                                html += `<div class="opponent-mini-board-cell${opponentData.board[r][c] ? ' filled' : ''}"></div>`;
                            }
                            html += '</div>';
                        }
                        html += '</div>';
                        this.opponentMiniMapElement.innerHTML = html;
                    }
                }
                // (Removed: never overwrite currentPiece/clientPiece from server on update)
                // Only use next_piece for preview
                if (playerData && playerData.next_piece && playerData.next_piece.name) {
                    const nextType = playerData.next_piece.name;
                    const nextPiece = {
                        name: nextType,
                        shape: PIECES[nextType][0],
                        x: 3,
                        y: 0,
                        rotation: 0
                    };
                    this.nextPiece = {
                        piece: nextPiece,
                        piece_number: playerData.piece_number + 1
                    };
                    this.drawNextPiece(this.nextPiece.piece);
                }

                if (playerData) {
                    // Only update serverBoard for debug overlay, never overwrite local board
                    this.serverBoard = playerData.board ? JSON.parse(JSON.stringify(playerData.board)) : null;
                    this.serverPiece = playerData.piece;
                    // No longer set clientPiece from serverPiece; client is sovereign
                    // These properties are only available in full updates (when data.player1 exists)
                    if (data.player1) {
                        this.toppedOut = playerData.finished;
                        if (this.toppedOut && !this.gameOver) {
                            this.statusElement.textContent = 'You have topped out! Waiting for opponent...';
                        }
                        this.drawNextPiece(playerData.next_piece);
                    }

                    // Always update scores if full player data is available
                    if (data.player1) {
                        if (data.player1.finished) {
                            this.scorePlayer1Element.textContent = `Player 1: ${data.player1.score}`;
                            this.scorePlayer1Element.style.color = 'red';
                            this.scorePlayer1Element.style.textDecoration = 'line-through';
                        } else {
                            this.scorePlayer1Element.textContent = `Player 1: ${data.player1.score}`;
                            this.scorePlayer1Element.style.color = '';
                            this.scorePlayer1Element.style.textDecoration = '';
                        }

                        if (data.player2.finished) {
                            this.scorePlayer2Element.textContent = `Player 2: ${data.player2.score}`;
                            this.scorePlayer2Element.style.color = 'red';
                            this.scorePlayer2Element.style.textDecoration = 'line-through';
                        } else {
                            this.scorePlayer2Element.textContent = `Player 2: ${data.player2.score}`;
                            this.scorePlayer2Element.style.color = '';
                            this.scorePlayer2Element.style.textDecoration = '';
                        }

                        this.prevPlayer1Finished = data.player1.finished;
                        this.prevPlayer2Finished = data.player2.finished;
                    }
                }
                break;
            case 'game_over':
                this.gameOver = true;
                if (data.winner === this.player) {
                    this.statusElement.textContent = 'You win!';
                } else {
                    this.statusElement.textContent = 'You lose!';
                }
                break;
            case 'restart':
                this.statusElement.textContent = '';
                this.gameOver = false;
                this.toppedOut = false;
                this.prevPlayer1Finished = false;
                this.prevPlayer2Finished = false;
                this.scorePlayer1Element.textContent = 'Player 1: 0';
                this.scorePlayer2Element.textContent = 'Player 2: 0';
                this.linesPlayer1Element.textContent = 'Lines: 0';
                this.linesPlayer2Element.textContent = 'Lines: 0';
                this.levelPlayer1Element.textContent = 'Level: 0';
                this.levelPlayer2Element.textContent = 'Level: 0';
                break;
        }
    }
}