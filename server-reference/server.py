from flask import Flask, jsonify
from datetime import datetime
import os
import socket
from tetris import TetrisGame
import logging
import sqlite3
import asyncio
import threading
import websockets
import json
import random
import string
import ssl
from pathlib import Path
import signal

# Note: This server requires the 'websockets' library. Install it with: pip install websockets

# Configure logging to include date and time
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

from config import GAME_PORT, PLAYERS_DB, CERT_FILE, KEY_FILE, WEBSOCKET_PORT, GAME_SHARE_BASE_URL, USE_TLS

GAME_PORT = GAME_PORT

# Function to get local IP address
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

games = {}  # Dictionary to store games by unique ID
waiting_player = None

# Function to generate a 5-character random string
def generate_game_id():
    return ''.join(random.choices(string.ascii_uppercase, k=5))

# Function to generate a unique player ID
def generate_player_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

# Initialize SQLite database
conn = sqlite3.connect(PLAYERS_DB, check_same_thread=False)
cursor = conn.cursor()

# Modify the players table to include a proper creation_date column
cursor.execute('''CREATE TABLE IF NOT EXISTS players (
    player_id TEXT PRIMARY KEY,
    creation_date TEXT
)''')
conn.commit()

# Extend SQLite database for games
cursor.execute('''CREATE TABLE IF NOT EXISTS games (
    game_id TEXT PRIMARY KEY,
    host_id TEXT,
    guest_id TEXT,
    creation_date TEXT,
    join_date TEXT
)''')
conn.commit()

# Function to migrate the players table to include the creation_date column
def migrate_players_table():
    cursor.execute('PRAGMA table_info(players)')
    columns = [column[1] for column in cursor.fetchall()]

    if 'creation_date' not in columns:
        # Rename the old table
        cursor.execute('ALTER TABLE players RENAME TO old_players')

        # Create the new table with the creation_date column
        cursor.execute('''CREATE TABLE players (
            player_id TEXT PRIMARY KEY,
            creation_date TEXT
        )''')

        # Migrate data from the old table, setting creation_date to the current time
        cursor.execute('SELECT player_id FROM old_players')
        rows = cursor.fetchall()
        for row in rows:
            player_id = row[0]
            creation_date = datetime.now().isoformat()
            cursor.execute('INSERT INTO players (player_id, creation_date) VALUES (?, ?)', (player_id, creation_date))

        # Drop the old table
        cursor.execute('DROP TABLE old_players')
        conn.commit()

# Call the migration function
migrate_players_table()

# Initialize Flask app
app = Flask(__name__, static_folder=os.getcwd(), static_url_path='')

# Route to serve index.html
@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

# Function to check if a player ID exists in the database
def player_exists(player_id):
    cursor.execute('SELECT 1 FROM players WHERE player_id = ?', (player_id,))
    return cursor.fetchone() is not None

# Function to add a new player ID with the current date and time
def add_player(player_id):
    creation_date = datetime.now().isoformat()
    cursor.execute('INSERT INTO players (player_id, creation_date) VALUES (?, ?)', (player_id, creation_date))
    conn.commit()

# API endpoint to get server status
@app.route('/api/status', methods=['GET'])
def get_status():
    # Fetch known players
    cursor.execute('SELECT player_id, creation_date FROM players')
    players = [{'player_id': row[0], 'creation_date': row[1]} for row in cursor.fetchall()]

    # Fetch games
    cursor.execute('SELECT game_id, host_id, guest_id, creation_date, join_date FROM games')
    games = [
        {
            'game_id': row[0],
            'host_id': row[1],
            'guest_id': row[2],
            'creation_date': row[3],
            'join_date': row[4]
        }
        for row in cursor.fetchall()
    ]

    return jsonify({'players': players, 'games': games})

# Remove the redundant inline HTML route for '/status'
# The static file route already serves the status.html page
@app.route('/status', methods=['GET'])
def status_page():
    pass
    return app.send_static_file('status.html')
# API endpoint to clear all players
@app.route('/api/clear_players', methods=['POST'])
def clear_players():
    cursor.execute('DELETE FROM players')
    conn.commit()
    logging.info("All players have been cleared from the database.")
    return jsonify({'status': 'success', 'message': 'All players cleared.'})

# API endpoint to clear all games
@app.route('/api/clear_games', methods=['POST'])
def clear_games():
    cursor.execute('DELETE FROM games')
    conn.commit()
    logging.info("All games have been cleared from the database.")
    return jsonify({'status': 'success', 'message': 'All games cleared.'})

async def ping_pong(websocket, player_id):
    while True:
        try:
            pong_waiter = await websocket.ping()
            await pong_waiter  # Wait for the pong response
            logging.info(f"WebSocket for playerId {player_id} is alive.")
        except websockets.exceptions.ConnectionClosed:
            logging.info(f"WebSocket for playerId {player_id} is closed.")
            break
        await asyncio.sleep(10)  # Ping every 10 seconds

# Modify the handler to start the ping-pong task
async def handler(websocket):
    logging.info(f"New connection established from {websocket.remote_address}.")
    player_id = None  # Initialize to ensure it's available in the finally block

    try:
        # Wait for the client to send its player ID (if available)
        message = await websocket.recv()
        data = json.loads(message)

        if 'player_id' in data and data.get('player_id') and player_exists(data['player_id']):
            # Use the existing player ID
            player_id = data['player_id']
            logging.info(f"Recognized returning player with ID: {player_id} from {websocket.remote_address}")
        else:
            # Generate a new player ID
            player_id = generate_player_id()
            add_player(player_id)
            await websocket.send(json.dumps({'type': 'playerId', 'player_id': player_id}))
            logging.info(f"Assigned new player ID: {player_id} to {websocket.remote_address}")

        # Start the ping-pong task after player_id is assigned
        asyncio.create_task(ping_pong(websocket, player_id))

        # Loop to handle subsequent messages from the client
        async for message in websocket:
            data = json.loads(message)
            logging.info(f"Received message from player {player_id} ({websocket.remote_address}): {data}")

            if data['type'] == 'host':
                game_id = generate_game_id()
                game_type = data.get('game_type', 'tictactoe')  # Default to tictactoe
                games[game_id] = {
                    'host_ws': websocket,
                    'host_id': player_id,
                    'guest_ws': None,
                    'guest_id': None,
                    'game': None,
                    'game_type': game_type
                }

                # Store game in the database
                creation_date = datetime.now().isoformat()
                cursor.execute('INSERT INTO games (game_id, host_id, creation_date) VALUES (?, ?, ?)',
                               (game_id, player_id, creation_date))
                conn.commit()

                # Send the game ID and user-friendly URL to the host
                # local_ip = get_local_ip()
                url = f"{GAME_SHARE_BASE_URL}{game_id}"
                await websocket.send(json.dumps({'type': 'host', 'game_id': game_id, 'url': url}))
                logging.info(f"Player {player_id} is hosting a {game_type} game with ID: {game_id} and URL: {url}")

            elif data['type'] == 'join':
                game_id = data['game_id']
                if game_id in games and games[game_id].get('guest_ws') is None:
                    logging.info(f"Guest playerId {player_id} has accepted to join gameId {game_id}.")
                    # Pair the guest with the host
                    game_data = games[game_id]
                    host_ws = game_data['host_ws']
                    game_data['guest_ws'] = websocket
                    game_data['guest_id'] = player_id
                    
                    game_type = game_data.get('game_type', 'ttt')
                    if game_type == 'ttt':
                        host_id = game_data['host_id']
                        guest_id = game_data['guest_id']
                        game = TetrisGame(host_ws, websocket, host_id, guest_id)

                    game_data['game'] = game

                    # Update the database with the guest and join date
                    join_date = datetime.now().isoformat()
                    cursor.execute('UPDATE games SET guest_id = ?, join_date = ? WHERE game_id = ?',
                                   (player_id, join_date, game_id))
                    conn.commit()

                    # Let the game object handle the start notifications
                    await game.start_game(game_id)
                    if game_type == 'ttt':
                        asyncio.create_task(game.run())

                    host_player_id = game_data['host_id']
                    logging.info(f"Guest playerId {player_id} successfully joined game {game_id} hosted by playerId {host_player_id}")
                else:
                    await websocket.send(json.dumps({'type': 'error', 'message': 'Invalid or full game ID'}))
                    logging.info(f"Player {player_id} failed to join game with ID: {game_id}")
            
            elif data['type'] == 'move':
                game_id = data.get('game_id')
                if not game_id or game_id not in games:
                    await websocket.send(json.dumps({'type': 'error', 'message': 'Game not found.'}))
                    continue

                game_data = games[game_id]

                if websocket not in (game_data.get('host_ws'), game_data.get('guest_ws')):
                    await websocket.send(json.dumps({'type': 'error', 'message': 'You are not in this game.'}))
                    continue

                if game_data.get('game'):
                    game = game_data['game']
                    # Delegate move handling to the game object
                    await game.handle_move(websocket, data)

            elif data['type'] == 'restart':
                game_id = data.get('game_id')
                if not game_id or game_id not in games:
                    await websocket.send(json.dumps({'type': 'error', 'message': 'Game not found.'}))
                    continue

                game_data = games[game_id]

                if websocket not in (game_data.get('host_ws'), game_data.get('guest_ws')):
                    await websocket.send(json.dumps({'type': 'error', 'message': 'You are not in this game.'}))
                    continue

                if game_data.get('game'):
                    game = game_data['game']
                    game.reset()
                    if game_data['game_type'] == 'ttt':
                        asyncio.create_task(game.run())
                    # Notify both players that the game has restarted and whose turn it is
                    await game.send_to_both({
                        'type': 'restart',
                        'turn': getattr(game, 'current_turn', None)
                    })
    except websockets.exceptions.ConnectionClosed as e:
        # Log the reason for the connection closure
        logging.info(f"Connection closed by player {player_id}. Reason: {e.code} - {e.reason}")

    finally:
        # When a websocket closes, find any games it was part of and clean up.
        games_to_remove = []
        for game_id, game_data in games.items():
            other_player_ws = None
            if websocket == game_data.get('host_ws'):
                logging.info(f"Host {game_data.get('host_id')} of game {game_id} disconnected.")
                other_player_ws = game_data.get('guest_ws')
                games_to_remove.append(game_id)
            elif websocket == game_data.get('guest_ws'):
                logging.info(f"Guest {game_data.get('guest_id')} of game {game_id} disconnected.")
                other_player_ws = game_data.get('host_ws')
                games_to_remove.append(game_id)

            if other_player_ws:
                # Check if the other player's connection is still open before sending
                if other_player_ws.protocol.state != websockets.protocol.State.CLOSED:
                    try:
                        await other_player_ws.send(json.dumps({'type': 'opponent_disconnected', 'game_id': game_id}))
                    except websockets.exceptions.ConnectionClosed:
                        logging.info(f"Opponent's connection was already closed for game {game_id}.")

        for game_id in games_to_remove:
            if game_id in games:
                logging.info(f"Removing game {game_id} due to player disconnect.")
                del games[game_id]
        logging.info(f"Connection for player {player_id} from {websocket.remote_address} closed.")

def start_flask_server():
    logging.info("Flask server thread starting.")
    try:
        app.run(host='0.0.0.0', port=GAME_PORT)
    except Exception as e:
        logging.error(f"Flask server thread exiting due to error: {e}")
    finally:
        logging.info("Flask server thread exiting.")

# Start both WebSocket and Flask servers
async def main():
    # Start the Flask API in a separate thread
    flask_thread = threading.Thread(target=start_flask_server, daemon=True)
    flask_thread.start()

    # Configure SSL context if TLS is enabled
    ssl_context = None
    if USE_TLS:
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        cert_file = Path(CERT_FILE)
        key_file = Path(KEY_FILE)
        ssl_context.load_cert_chain(certfile=cert_file, keyfile=key_file)

    # Set up a shutdown event
    shutdown_event = asyncio.Event()

    def signal_handler():
        logging.info("Shutdown signal received.")
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    if os.name != 'nt':
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, signal_handler)

    server_coro = websockets.serve(handler, "0.0.0.0", WEBSOCKET_PORT, ssl=ssl_context)
    
    logging.info(f"WebSocket server starting on port {WEBSOCKET_PORT}")
    
    async with server_coro as server:
        try:
            await shutdown_event.wait()
        finally:
            logging.info("Server is shutting down.")
            server.close()
            await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        # This is a fallback for Windows or if the signal handler setup fails
        logging.info("KeyboardInterrupt caught, forcing shutdown.")
