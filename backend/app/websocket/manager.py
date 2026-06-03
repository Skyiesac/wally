import json
from typing import Dict, Set

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        """Accept connection and register user."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        """Remove connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str) -> None:
        """Send message to specific user's all connections."""
        if user_id not in self.active_connections:
            return
        for websocket in list(self.active_connections[user_id]):
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                self.active_connections[user_id].discard(websocket)

    async def broadcast(self, message: dict) -> None:
        """Send message to all connected users."""
        for user_id, websockets in self.active_connections.items():
            for websocket in list(websockets):
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception:
                    self.active_connections[user_id].discard(websocket)


ws_manager = ConnectionManager()
