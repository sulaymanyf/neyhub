import os
from pathlib import Path
from aiofiles import open as async_open

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from .user_service import create_file_for_user
from ..schemas import schemas
from ..schemas.file_crud import get_files, get_file, update_file_db
from ..utils.database import get_db


async def upload_file(file, user_id: int, db: Session = Depends(get_db)):
    # Create a new directory for the file type if it doesn't exist
    file_type_dir = Path(f"resouces/{file.content_type}")
    if not os.path.exists(file_type_dir):
        os.makedirs(file_type_dir)

    file_path = file_type_dir / file.filename

    async with async_open(file_path, "wb") as f:
        await f.write(file.file.read())

    file_info = schemas.FileCreate(
        user_id=user_id,
        parsed=False,
        file_name=file.filename,
        file_type=file.content_type.split('/')[1],
        file_path=str(file_path),
        parsed_data=""  # 设置为一个空字符串
    )

    file = await create_file_for_user(file=file_info, db=db)
    if file is None:
        raise HTTPException(status_code=400, detail="File upload failed")

    return {"message": "success"}


def read_files(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    files = get_files(db, skip=skip, limit=limit)
    return files


async def read_file(file_id: int, db: Session = Depends(get_db)):
    db_file = await get_file(db, file_id=file_id)
    if db_file is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_file


async def update_file( db_file: schemas.FileUpdate, db: Session = Depends(get_db)):
    print(type(db_file))
    db_file_new = update_file_db(db=db, file=db_file)
    return db_file_new
