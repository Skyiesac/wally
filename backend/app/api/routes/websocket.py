from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import ws_manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket connection for real-time updates."""
    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive, wait for client messages (not used yet)
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)
