import asyncio
import copy
import json
import logging
import random
import websockets

LEVEL_FRAMES = [
    48, 43, 38, 33, 28, 23, 18, 13, 8, 6,  # Levels 0-9
    5, 5, 5,  # Levels 10-12
    4, 4, 4,  # Levels 13-15
    3, 3, 3,  # Levels 16-18
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2,  # Levels 19-28
    1  # Level 29+
]

PIECES = {
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
}

JLSTZ_KICKS = {
    '0->1': [(0, 0), (-1, 0), (-1, 1), (0, -2), (-1, -2)],
    '1->0': [(0, 0), (1, 0), (1, -1), (0, 2), (1, 2)],
    '1->2': [(0, 0), (1, 0), (1, -1), (0, 2), (1, 2)],
    '2->1': [(0, 0), (-1, 0), (-1, 1), (0, -2), (-1, -2)],
    '2->3': [(0, 0), (1, 0), (1, 1), (0, -2), (1, -2)],
    '3->2': [(0, 0), (-1, 0), (-1, -1), (0, 2), (-1, 2)],
    '3->0': [(0, 0), (-1, 0), (-1, -1), (0, 2), (-1, 2)],
    '0->3': [(0, 0), (1, 0), (1, 1), (0, -2), (1, -2)],
}

I_KICKS = {
    '0->1': [(0, 0), (-2, 0), (1, 0), (-2, -1), (1, 2)],
    '1->0': [(0, 0), (2, 0), (-1, 0), (2, 1), (-1, -2)],
    '1->2': [(0, 0), (-1, 0), (2, 0), (-1, 2), (2, -1)],
    '2->1': [(0, 0), (1, 0), (-2, 0), (1, -2), (-2, 1)],
    '2->3': [(0, 0), (2, 0), (-1, 0), (2, 1), (-1, -2)],
    '3->2': [(0, 0), (-2, 0), (1, 0), (-2, -1), (1, 2)],
    '3->0': [(0, 0), (1, 0), (-2, 0), (1, -2), (-2, 1)],
    '0->3': [(0, 0), (-1, 0), (2, 0), (-1, 2), [2, -1]],
}

class TetrisGame:
    def __init__(self, player1_ws, player2_ws, player1_id, player2_id):
        self.player1 = player1_ws
        self.player2 = player2_ws
        self.player1_id = player1_id
        self.player2_id = player2_id
        self.bag_counter = 0
        self.bags = []
        self.games = {}
        self.winner = None
        self.start_time = None
        self.end_time = None

    def new_board(self):
        return [[0] * 10 for _ in range(20)]

    def generate_bag(self):
        self.bag_counter += 1
        logging.debug(f"Generating bag number {self.bag_counter}")
        piece_names = list(PIECES.keys())
        random.shuffle(piece_names)
        bag = []
        for name in piece_names:
            bag.append({
                'shape': PIECES[name][0],
                'name': name,
                'x': 3,
                'y': 0,
                'rotation': 0
            })
        logging.debug(f"Bag {self.bag_counter} content: {[p['name'] for p in bag]}")
        return bag

    def is_valid_move(self, board, piece, x, y):
        for r, row in enumerate(piece['shape']):
            for c, cell in enumerate(row):
                if cell:
                    if (
                        y + r >= 20 or
                        x + c < 0 or
                        x + c >= 10 or
                        board[y + r][x + c]
                    ):
                        return False
        return True

    def rotate_piece(self, piece, clockwise=True):
        new_rotation = (piece['rotation'] + 1) % 4 if clockwise else (piece['rotation'] - 1 + 4) % 4
        new_shape = PIECES[piece['name']][new_rotation]
        return {'shape': new_shape, 'name': piece['name'], 'x': piece['x'], 'y': piece['y'], 'rotation': new_rotation}

    def lock_piece(self, board, piece):
        for r, row in enumerate(piece['shape']):
            for c, cell in enumerate(row):
                if cell:
                    board[piece['y'] + r][piece['x'] + c] = piece['name']

    def clear_lines(self, board):
        lines_cleared = 0
        new_board = []
        for row in board:
            if 0 not in row:
                lines_cleared += 1
            else:
                new_board.append(row)
        
        for _ in range(lines_cleared):
            new_board.insert(0, [0] * 10)
        
        return new_board, lines_cleared

    def add_garbage_lines(self, board, num_lines):
        hole_position = -1 # Default to -1 if no lines are added
        if num_lines > 0: # Only generate hole if there are lines to add
            hole_position = random.randint(0, 9)
        for _ in range(num_lines):
            garbage_line = ['G'] * 10
            # Use the same hole_position for all lines
            garbage_line[hole_position] = 0
            board.append(garbage_line)
            board.pop(0)
        return hole_position

    async def send_to_both(self, data):
        message = json.dumps(data)
        tasks = []
        for player_ws in [self.player1, self.player2]:
            if player_ws.protocol.state != websockets.protocol.State.CLOSED:
                tasks.append(player_ws.send(message))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def send_to_player(self, player, data):
        await player.send(json.dumps(data))

    async def start_game(self, game_id):
        self.reset()
        from datetime import datetime
        self.start_time = datetime.now()
        await self.player1.send(json.dumps({'type': 'start', 'player': 'player1', 'game_id': game_id, 'game_type': 'ttt', 'board': self.games[self.player1]['board'], 'piece': self.games[self.player1]['piece'], 'next_piece': self.games[self.player1]['next_piece']}))
        await self.player2.send(json.dumps({'type': 'start', 'player': 'player2', 'game_id': game_id, 'game_type': 'ttt', 'board': self.games[self.player2]['board'], 'piece': self.games[self.player2]['piece'], 'next_piece': self.games[self.player2]['next_piece']}))

    async def handle_move(self, websocket, data):
        player_game = self.games[websocket]
        garbage_hole_position = -1 # Initialize garbage_hole_position here
        if player_game['finished']:
            return

        action = data['action']
        piece_moved = False
        
        # Get piece number for logging (stored when piece was spawned)
        player_id = "player1" if websocket == self.player1 else "player2"
        piece_number = player_game['current_piece_number']
        
        # Validate piece if client sent piece info (for synchronization check)
        client_piece_number = data.get('piece_number')
        client_piece_type = data.get('piece_type')
        if client_piece_number is not None:
            if client_piece_number != piece_number:
                logging.warning(f"Player {player_id} DESYNC: client thinks piece #{client_piece_number} ({client_piece_type}), server has piece #{piece_number} ({player_game['piece']['name']})")
                logging.warning(f"  IGNORING move {action} - piece mismatch!")
                # Send error message back to client to let them know the move was rejected
                error_msg = {
                    'type': 'error',
                    'message': f'Move rejected: piece mismatch (client piece #{client_piece_number}, server piece #{piece_number})'
                }
                logging.info(f"Sending error message to {player_id}: {error_msg}")
                await self.send_to_player(websocket, error_msg)
                return False
            elif client_piece_type is not None and client_piece_type != player_game['piece']['name']:
                logging.warning(f"Player {player_id} DESYNC: client thinks piece type '{client_piece_type}', server has '{player_game['piece']['name']}' for piece #{piece_number}")
                logging.warning(f"  IGNORING move {action} - piece type mismatch!")
                # Send error message back to client to let them know the move was rejected
                error_msg = {
                    'type': 'error',
                    'message': f'Move rejected: piece type mismatch (client type {client_piece_type}, server type {player_game["piece"]["name"]})'
                }
                logging.info(f"Sending error message to {player_id}: {error_msg}")
                await self.send_to_player(websocket, error_msg)
                return False

        if action == 'move':
            dx = data['dx']
            dy = data['dy']
            if self.is_valid_move(player_game['board'], player_game['piece'], player_game['piece']['x'] + dx, player_game['piece']['y'] + dy):
                player_game['piece']['x'] += dx
                player_game['piece']['y'] += dy
                piece_moved = True
                logging.debug(f"Player {player_id} piece #{piece_number} ({player_game['piece']['name']}): moved by dx={dx} dy={dy} to ({player_game['piece']['x']}, {player_game['piece']['y']})")
            else:
                logging.debug(f"Player {player_id} piece #{piece_number} ({player_game['piece']['name']}): move blocked dx={dx} dy={dy} from ({player_game['piece']['x']}, {player_game['piece']['y']})")

        elif action in ['rotate_right', 'rotate_left']:
            clockwise = action == 'rotate_right'
            piece = player_game['piece']
            rotated_piece = self.rotate_piece(piece, clockwise)
            
            kick_table = I_KICKS if piece['name'] == 'I' else JLSTZ_KICKS
            from_rotation = piece['rotation']
            to_rotation = rotated_piece['rotation']
            kick_key = f'{from_rotation}->{to_rotation}'

            rotation_succeeded = False
            for dx, dy in kick_table.get(kick_key, []):
                if self.is_valid_move(player_game['board'], rotated_piece, piece['x'] + dx, piece['y'] - dy):
                    rotated_piece['x'] = piece['x'] + dx
                    rotated_piece['y'] = piece['y'] - dy
                    player_game['piece'] = rotated_piece
                    piece_moved = True
                    rotation_succeeded = True
                    logging.debug(f"Player {player_id} piece #{piece_number} ({piece['name']}): rotated {action} from rot={from_rotation} to rot={to_rotation} with kick dx={dx} dy={dy}, now at ({rotated_piece['x']}, {rotated_piece['y']})")
                    break
            
            if not rotation_succeeded:
                logging.debug(f"Player {player_id} piece #{piece_number} ({piece['name']}): rotation {action} FAILED from rot={from_rotation} to rot={to_rotation} at ({piece['x']}, {piece['y']})")

        if piece_moved:
            player_game['lock_delay_start_time'] = None

        elif action == 'hard_drop':
            while self.is_valid_move(player_game['board'], player_game['piece'], player_game['piece']['x'], player_game['piece']['y'] + 1):
                player_game['piece']['y'] += 1

            # Lock piece and process consequences

            self.lock_piece(player_game['board'], player_game['piece'])
            logging.debug(f"Player {player_id} piece #{piece_number} ({player_game['piece']['name']}): HARD DROP locked at ({player_game['piece']['x']}, {player_game['piece']['y']}) rot={player_game['piece']['rotation']}")
            # Increment piece count for hard drop
            player_game['piece_count'] += 1

            player_game['board'], lines_cleared = self.clear_lines(player_game['board'])
            if lines_cleared > 0:
                level = player_game['level']
                score_multipliers = {1: 40, 2: 100, 3: 300, 4: 1200}
                player_game['score'] += score_multipliers.get(lines_cleared, 0) * (level + 1)
                
                player_game['lines'] += lines_cleared
                player_game['level'] = player_game['lines'] // 10
                
                opponent = self.player2 if websocket == self.player1 else self.player1
                garbage_hole_position = -1 # Initialize to a default value
                if not self.games[opponent]['finished']:
                    garbage_map = {1: 0, 2: 1, 3: 2, 4: 4}
                    num_garbage_lines = garbage_map.get(lines_cleared, 0)
                    if num_garbage_lines > 0:
                        garbage_hole_position = self.add_garbage_lines(self.games[opponent]['board'], num_garbage_lines)

            # Increment piece index BEFORE spawning the next piece
            player_game['piece_in_bag_index'] += 1
            if player_game['piece_in_bag_index'] == 7:
                player_game['bag_index'] += 1
                player_game['piece_in_bag_index'] = 0

            player_game['piece'] = player_game['next_piece']
            
            # Update current piece number for logging
            player_game['current_piece_number'] += 1
            
            next_bag_index = player_game['bag_index']
            next_piece_in_bag_index = player_game['piece_in_bag_index'] + 1
            if next_piece_in_bag_index == 7:
                next_bag_index += 1
                next_piece_in_bag_index = 0
            
            if next_bag_index == len(self.bags):
                self.bags.append(self.generate_bag())
            
            player_game['next_piece'] = copy.deepcopy(self.bags[next_bag_index][next_piece_in_bag_index])

            if not self.is_valid_move(player_game['board'], player_game['piece'], player_game['piece']['x'], player_game['piece']['y']):
                player_game['finished'] = True
            
            player_game['hard_drop_executed'] = True

            await self.send_to_both({
                'type': 'update',
                'garbage_hole_position': garbage_hole_position, # Include the garbage hole position
                'player1': {
                    'board': self.games[self.player1]['board'],
                    'piece': self.games[self.player1]['piece'],
                    'piece_number': self.games[self.player1]['current_piece_number'],
                    'score': self.games[self.player1]['score'],
                    'lines': self.games[self.player1]['lines'],
                    'level': self.games[self.player1]['level'],
                    'next_piece': self.games[self.player1]['next_piece'],
                    'finished': self.games[self.player1]['finished']
                },
                'player2': {
                    'board': self.games[self.player2]['board'],
                    'piece': self.games[self.player2]['piece'],
                    'piece_number': self.games[self.player2]['current_piece_number'],
                    'score': self.games[self.player2]['score'],
                    'lines': self.games[self.player2]['lines'],
                    'level': self.games[self.player2]['level'],
                    'next_piece': self.games[self.player2]['next_piece'],
                    'finished': self.games[self.player2]['finished']
                }
            })
            return

        await self.send_to_player(websocket, {'type': 'update', 'board': player_game['board'], 'piece': player_game['piece'], 'piece_number': player_game['current_piece_number']})

    def reset(self):
        self.bag_counter = 0
        self.bags = [self.generate_bag()]
        self.games = {
            self.player1: {'board': self.new_board(), 'piece': copy.deepcopy(self.bags[0][0]), 'score': 0, 'lines': 0, 'level': 0, 'gravity_counter': 0, 'next_piece': copy.deepcopy(self.bags[0][1]), 'bag_index': 0, 'piece_in_bag_index': 0, 'current_piece_number': 1, 'finished': False, 'hard_drop_executed': False, 'lock_delay_start_time': None, 'piece_count': 0, 'singles': 0, 'doubles': 0, 'triples': 0, 'tetrises': 0, 'attacks': 0},
            self.player2: {'board': self.new_board(), 'piece': copy.deepcopy(self.bags[0][0]), 'score': 0, 'lines': 0, 'level': 0, 'gravity_counter': 0, 'next_piece': copy.deepcopy(self.bags[0][1]), 'bag_index': 0, 'piece_in_bag_index': 0, 'current_piece_number': 1, 'finished': False, 'hard_drop_executed': False, 'lock_delay_start_time': None, 'piece_count': 0, 'singles': 0, 'doubles': 0, 'triples': 0, 'tetrises': 0, 'attacks': 0}
        }
        self.winner = None
        self.start_time = None
        self.end_time = None

    async def run(self):
        while not (self.games[self.player1]['finished'] and self.games[self.player2]['finished']):
            update_needed = False
            for player in [self.player1, self.player2]:
                if self.games[player]['finished']:
                    continue

                player_game = self.games[player]
                if player_game.get('hard_drop_executed'):
                    player_game['hard_drop_executed'] = False
                    continue

                level = player_game['level']
                speed_in_frames = LEVEL_FRAMES[min(level, len(LEVEL_FRAMES) - 1)]
                
                player_game['gravity_counter'] += 1
                
                if player_game['gravity_counter'] >= speed_in_frames:
                    player_game['gravity_counter'] = 0
                    update_needed = True

                    opponent = self.player2 if player == self.player1 else self.player1
                    opponent_game = self.games[opponent]
                    garbage_hole_position = -1 # Initialize to a default value

                    # Move piece down
                    if self.is_valid_move(player_game['board'], player_game['piece'], player_game['piece']['x'], player_game['piece']['y'] + 1):
                        player_game['piece']['y'] += 1
                        player_game['lock_delay_start_time'] = None
                    else:
                        if player_game['lock_delay_start_time'] is None:
                            player_game['lock_delay_start_time'] = asyncio.get_event_loop().time()
                        
                        if asyncio.get_event_loop().time() - player_game['lock_delay_start_time'] >= 0.5:
                            self.lock_piece(player_game['board'], player_game['piece'])
                            player_id = "player1" if player == self.player1 else "player2"
                            logging.debug(f"Player {player_id} locked piece: {player_game['piece']['name']} at ({player_game['piece']['x']}, {player_game['piece']['y']})")
                            
                            # Track piece count
                            player_game['piece_count'] += 1

                            # Check for cleared lines
                            player_game['board'], lines_cleared = self.clear_lines(player_game['board'])
                            # Track line clear breakdown and attacks
                            if lines_cleared > 0:
                                if lines_cleared == 1:
                                    player_game['singles'] += 1
                                elif lines_cleared == 2:
                                    player_game['doubles'] += 1
                                    player_game['attacks'] += 1
                                elif lines_cleared == 3:
                                    player_game['triples'] += 1
                                    player_game['attacks'] += 2
                                elif lines_cleared == 4:
                                    player_game['tetrises'] += 1
                                    player_game['attacks'] += 4
                                level = player_game['level']
                                score_multipliers = {1: 40, 2: 100, 3: 300, 4: 1200}
                                player_game['score'] += score_multipliers.get(lines_cleared, 0) * (level + 1)

                                player_game['lines'] += lines_cleared
                                player_game['level'] = player_game['lines'] // 10
                                
                                # Add garbage lines to opponent
                                if opponent_game['finished']:
                                    garbage_hole_position = self.add_garbage_lines(player_game['board'], 1)
                                elif not opponent_game['finished']:
                                    garbage_map = {1: 0, 2: 1, 3: 2, 4: 4}
                                    num_garbage_lines = garbage_map.get(lines_cleared, 0)
                                    if num_garbage_lines > 0:
                                        garbage_hole_position = self.add_garbage_lines(opponent_game['board'], num_garbage_lines)

                            # Advance player's indices to the next piece BEFORE spawning
                            player_game['piece_in_bag_index'] += 1
                            if player_game['piece_in_bag_index'] == 7:
                                logging.debug(f"Player {player_id} emptied bag {player_game['bag_index'] + 1}")
                                player_game['bag_index'] += 1
                                player_game['piece_in_bag_index'] = 0

                                # Check if the other player has also finished this bag
                                other_player_websocket = self.player2 if player == self.player1 else self.player1
                                other_player_game = self.games[other_player_websocket]
                                if other_player_game['bag_index'] >= player_game['bag_index']:
                                     logging.debug(f"Bag {player_game['bag_index']} is not used anymore by any user -> discarding")

                            player_game['piece'] = player_game['next_piece']
                            
                            # Update current piece number for logging
                            player_game['current_piece_number'] += 1
                            
                            # Determine the indices for the new next piece
                            next_bag_index = player_game['bag_index']
                            next_piece_in_bag_index = player_game['piece_in_bag_index'] + 1
                            if next_piece_in_bag_index == 7:
                                next_bag_index += 1
                                next_piece_in_bag_index = 0
                                
                            # Generate new bag if needed
                            if next_bag_index == len(self.bags):
                                self.bags.append(self.generate_bag())
                                
                            player_game['next_piece'] = copy.deepcopy(self.bags[next_bag_index][next_piece_in_bag_index])

                            logging.debug(f"Next piece for player {player_id}: {player_game['next_piece']['name']}")

                            # Check for game over
                            if not self.is_valid_move(player_game['board'], player_game['piece'], player_game['piece']['x'], player_game['piece']['y']):
                                player_game['finished'] = True
                                logging.info(f"Player {player_id} has topped out.")
                            
                            player_game['lock_delay_start_time'] = None

            if update_needed:
                # Send updates to both players
                await self.send_to_both({
                    'type': 'update',
                    'garbage_hole_position': garbage_hole_position, # Include the garbage hole position
                    'player1': {
                        'board': self.games[self.player1]['board'],
                        'piece': self.games[self.player1]['piece'],
                        'score': self.games[self.player1]['score'],
                        'lines': self.games[self.player1]['lines'],
                        'level': self.games[self.player1]['level'],
                        'next_piece': self.games[self.player1]['next_piece'],
                        'finished': self.games[self.player1]['finished']
                    },
                    'player2': {
                        'board': self.games[self.player2]['board'],
                        'piece': self.games[self.player2]['piece'],
                        'score': self.games[self.player2]['score'],
                        'lines': self.games[self.player2]['lines'],
                        'level': self.games[self.player2]['level'],
                        'next_piece': self.games[self.player2]['next_piece'],
                        'finished': self.games[self.player2]['finished']
                    }
                })

            await asyncio.sleep(1/60)  # Game speed (60 FPS)

        # Determine winner
        from datetime import datetime
        self.end_time = datetime.now()
        score1 = self.games[self.player1]['score']
        score2 = self.games[self.player2]['score']
        if score1 >= score2:
            self.winner = self.player1
        else:
            self.winner = self.player2
        # Compute stats
        duration = (self.end_time - self.start_time).total_seconds() if self.start_time and self.end_time else 0.0
        p1 = self.games[self.player1]
        p2 = self.games[self.player2]
        apm_p1 = (p1['attacks'] * 60.0 / duration) if duration > 0 else 0.0
        apm_p2 = (p2['attacks'] * 60.0 / duration) if duration > 0 else 0.0
        pps_p1 = (p1['piece_count'] / duration) if duration > 0 else 0.0
        pps_p2 = (p2['piece_count'] / duration) if duration > 0 else 0.0
        # Log result
        logging.info(f"game result: p1={self.player1_id} p2={self.player2_id} "
                     f"APM_p1={apm_p1:.2f} PPS_p1={pps_p1:.2f} Score_p1={p1['score']} "
                     f"APM_p2={apm_p2:.2f} PPS_p2={pps_p2:.2f} Score_p2={p2['score']} "
                     f"Winner={'p1' if self.winner == self.player1 else 'p2'} Time={self.end_time}")
        await self.send_to_both({'type': 'game_over', 'winner': 'player1' if self.winner == self.player1 else 'player2'})