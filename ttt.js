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
    constructor(boardElement, statusElement, restartButton, sendMessageCallback) {
        this.boardElement = boardElement;
        this.statusElement = statusElement;
        this.restartButton = restartButton;
        this.sendMessage = sendMessageCallback;

        this.board = this.createBoard();
        this.piece = null;
        this.gameId = null;
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

        // Input handling properties
        this.keyStates = {};
        this.dasDelay = 180; // ms
        this.arrRate = 25;   // ms (50% faster)
        this.softDropRate = 25; // ms
        this.dasTimer = null;
        this.arrInterval = null;
        this.softDropInterval = null;
        this.moveDirection = 0; // -1 for left, 1 for right

        this._initializeBoard();
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
        if (!this.piece) return;
        let newPiece = JSON.parse(JSON.stringify(this.piece));
        if (this.is_valid_move(this.board, newPiece, newPiece.x + dx, newPiece.y + dy)) {
            newPiece.x += dx;
            newPiece.y += dy;
            this.piece = newPiece;
            this.draw();
            this.sendMessage({ type: 'move', game_id: this.gameId, action: 'move', dx: dx, dy: dy });
        }
    }

    rotatePiece(clockwise) {
        if (!this.piece) return;

        const originalPiece = JSON.parse(JSON.stringify(this.piece));
        let rotatedPiece = this.rotate_piece(originalPiece, clockwise);
        let moveSuccessful = false;

        const kickTable = (this.piece.name === 'I') ? I_KICKS : JLSTZ_KICKS;
        const fromRotation = originalPiece.rotation;
        const toRotation = rotatedPiece.rotation;
        const kickKey = `${fromRotation}->${toRotation}`;

        const kicks = kickTable[kickKey] || [[0, 0]];

        for (const kick of kicks) {
            const [dx, dy] = kick;
            if (this.is_valid_move(this.board, rotatedPiece, originalPiece.x + dx, originalPiece.y - dy)) {
                rotatedPiece.x = originalPiece.x + dx;
                rotatedPiece.y = originalPiece.y - dy;
                this.piece = rotatedPiece;
                moveSuccessful = true;
                break;
            }
        }

        if (moveSuccessful) {
            this.draw();
            this.sendMessage({ type: 'move', game_id: this.gameId, action: clockwise ? 'rotate_right' : 'rotate_left' });
        }
    }

    hardDrop() {
        if (!this.piece) return;
        this.inputDisabled = true;
        this.stopDas();
        let newPiece = JSON.parse(JSON.stringify(this.piece));
        while (this.is_valid_move(this.board, newPiece, newPiece.x, newPiece.y + 1)) {
            newPiece.y += 1;
        }
        this.piece = newPiece;
        this.sendMessage({ type: 'move', game_id: this.gameId, action: 'hard_drop' });
        this.draw();
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
        if (!this.piece) {
            return null;
        }
        let ghost = JSON.parse(JSON.stringify(this.piece));
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
                            cellElement.classList.add('ghost', 'filled', `filled-${pieceName}`);
                        }
                    }
                });
            });
        }

        // 3. Draw the active piece
        if (this.piece) {
            const pieceName = this.piece.name;
            this.piece.shape.forEach((row, r) => {
                row.forEach((cell, c) => {
                    if (cell) {
                        const y = this.piece.y + r;
                        const x = this.piece.x + c;
                        if (y >= 0 && y < 20 && x >= 0 && x < 10) {
                            const cellElement = this.boardElement.children[y * 10 + x];
                            cellElement.classList.remove('ghost'); // Ensure active piece is not transparent
                            cellElement.classList.add('filled', `filled-${pieceName}`);
                        }
                    }
                });
            });
        }
    }

    drawNextPiece(piece) {
        this.nextPiecePreviewElement.innerHTML = ''; // Clear previous piece
        if (!piece) return;

        const previewGrid = document.createElement('div');
        previewGrid.classList.add('ttt-preview-grid');
        previewGrid.style.display = 'grid';
        // Removed hardcoded gridTemplateColumns and gridTemplateRows to use CSS
        previewGrid.style.gridGap = '1px';

        const shape = piece.shape;
        
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
        const pieceName = piece.name;
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
            case 'start':
                this.gameId = data.game_id;
                this.player = data.player;
                this.board = data.board;
                this.piece = data.piece;
                this.statusElement.textContent = '';
                this.gameOver = false;
                this.toppedOut = false;
                this.prevPlayer1Finished = false;
                this.prevPlayer2Finished = false;
                this.inputDisabled = false;
                this.scorePlayer1Element.textContent = 'Player 1: 0';
                this.scorePlayer2Element.textContent = 'Player 2: 0';
                this.linesPlayer1Element.textContent = 'Lines: 0';
                this.linesPlayer2Element.textContent = 'Lines: 0';
                this.levelPlayer1Element.textContent = 'Level: 0';
                this.levelPlayer2Element.textContent = 'Level: 0';
                this.draw();
                // Initial draw of next piece
                if (data.next_piece) {
                    this.drawNextPiece(data.next_piece);
                }
                break;
            case 'update':
                this.isDropping = false;
                this.inputDisabled = false; // Re-enable input on update

                let playerData;
                if (data.player1) {
                    playerData = data[this.player];
                } else {
                    playerData = data;
                }

                if (playerData) {
                    this.board = playerData.board;
                    this.piece = playerData.piece;

                    // These properties are only available in full updates (when data.player1 exists)
                    if (data.player1) {
                        this.toppedOut = playerData.finished;
                        if (this.toppedOut && !this.gameOver) {
                            this.statusElement.textContent = 'You have topped out! Waiting for opponent...';
                        }
                        this.drawNextPiece(playerData.next_piece);
                    }

                    // Always update scores/lines/levels if full player data is available
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
                        
                        this.linesPlayer1Element.textContent = `Lines: ${data.player1.lines}`;
                        this.linesPlayer2Element.textContent = `Lines: ${data.player2.lines}`;
                        this.levelPlayer1Element.textContent = `Level: ${data.player1.level}`;
                        this.levelPlayer2Element.textContent = `Level: ${data.player2.level}`;

                        this.prevPlayer1Finished = data.player1.finished;
                        this.prevPlayer2Finished = data.player2.finished;
                    }
                    this.draw();
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