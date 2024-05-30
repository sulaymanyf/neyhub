from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

# from ..dependencies import get_token_header
from ..schemas import schemas
from ..service.files_service import upload_file, read_files, read_file
from ..service.parse_service import parse_file_to_json
from ..utils.database import SessionLocal, get_db

router = APIRouter(
    prefix="/files",
    tags=["files"],
    # dependencies=[Depends(get_token_header)],
    responses={404: {"description": "Not found"}},
)

fake_items_db = {"plumbus": {"name": "Plumbus"}, "gun": {"name": "Portal Gun"}}


@router.get("/", response_model=list[schemas.File])
async def get_files(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    files = read_files(skip, limit, db)
    return files


@router.get("/{file_id}")
async def read_item(file_id: int, db: Session = Depends(get_db)):
    file = await read_file(file_id, db)
    return file


@router.put(
    "/{item_id}",
    responses={403: {"description": "Operation forbidden"}},
)
async def update_item(item_id: str):
    if item_id != "plumbus":
        raise HTTPException(
            status_code=403, detail="You can only update the item: plumbus"
        )
    return {"item_id": item_id, "name": "The great Plumbus"}


@router.post("/upload_file")
async def upload_files(file: UploadFile, user_id: int, db: Session = Depends(get_db)):

    # Check if the file type is supported
    supported_file_types = ["image/jpeg", "image/png", "image/gif", "application/pdf", "text/html"]
    if file.content_type not in supported_file_types:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    await upload_file(file, user_id, db)

    return {"message": f"File uploaded successfully: {file.filename}"}


class ParseFile(BaseModel):
    file_name: str
    id: int


@router.post(
    "/parse_file",
    responses={403: {"description": "Operation forbidden"}},
)
async def parse_file(payload: ParseFile, db: Session = Depends(get_db)):
    res = await parse_file_to_json(payload.id, db)
    if res:
        return {"code": 200, "message": "parse is successful"}
    else:
        return {"code": 403, "message": "parse is failed"}
