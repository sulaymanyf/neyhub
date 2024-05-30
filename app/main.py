import threading
import time
import uuid
import asyncio
import wave

import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from starlette.websockets import WebSocket, WebSocketState
from typing import List, Dict

from .models import models
from .utils.database import engine
# from .dependencies import get_query_token, get_token_header
from .routers import RegisterRouterList
from .utils.load_model import load_model
from .utils.predict import process_and_send, audio_capture
from .utils.start_pyadio import start_pyadio

models.Base.metadata.create_all(bind=engine)
# app = FastAPI(dependencies=[Depends(get_query_token)])
app = FastAPI(debug=True)
# WebSocket 连接池
websocket_connections: Dict[str, WebSocket] = {}


model = load_model()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    print("websocket_endpoint")
    # 接受 WebSocket 连接
    await websocket.accept()

    # 为新连接生成唯一的连接 ID
    connection_id = uuid.uuid4().hex
    # 将新连接添加到连接池中
    websocket_connections[connection_id] = websocket

    # 启动 WebSocket 服务器
    await websocket_handler(websocket, connection_id)  # <--- pass audio_queue to websocket_handler


async def websocket_handler(websocket: WebSocket,  connection_id: str):
    print("websocket_handler")

    try:
        # 处理 WebSocket 消息
        while True:
            data = await websocket.receive_bytes()
            try:
                await process_and_send(data, model, websocket)
            except Exception as e:
                print(f"Failed to send prediction Received to WebSocket client: {e}")
    except asyncio.CancelledError:
        print("Task was cancelled")
    finally:
        # 连接关闭时从连接池中移除连接
        del websocket_connections[connection_id]


for item in RegisterRouterList:
    app.include_router(item.router)


origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/", StaticFiles(directory="app/static"), name="static")


if __name__ == '__main__':
    try:
        uvicorn.run("app:main:app", host="0.0.0.0", port=8000)
    finally:
        # Cleanup code here
        print("Shutting down")