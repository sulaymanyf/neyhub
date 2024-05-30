from fastapi import Depends, HTTPException

from ..schemas import user_crud, schemas
from ..schemas.user_crud import get_user_by_email, get_users, get_user, create_user_file
from ..utils.database import get_db
from sqlalchemy.orm import Session


async def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = await get_user_by_email(db, email=user.email)
    if db_user is None:
        return user_crud.create_user(db=db, user=user)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")


def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = get_users(db, skip=skip, limit=limit)
    return users


async def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = await get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


async def create_file_for_user(file: schemas.FileCreate, db: Session = Depends(get_db)):

    return await create_user_file(db=db, item=file)


