import os
import pathlib

from fastapi import APIRouter
from starlette.responses import HTMLResponse

# 实例化APIRouter实例
router = APIRouter(tags=["默认路由"])


@router.get("/")
async def index():
    """
    默认访问链接
    """
    html_file_path = 'app/static/index.html'

    return HTMLResponse(content=open(html_file_path, "r").read(), media_type="text/html")


@router.get("/note.html")
async def index():
    """
    默认访问链接
    """
    html_file_path = 'app/static/note.html'

    return HTMLResponse(content=open(html_file_path, "r",  encoding='utf-8').read(), media_type="text/html")

