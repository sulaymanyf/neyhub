from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# from ..dependencies import get_token_header
from ..schemas import schemas
from ..service.user_service import create_user, read_users, read_user
from ..utils.database import SessionLocal, get_db

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)


@router.get("/users/", response_model=list[schemas.User])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = read_users(skip, limit, db)
    return users


@router.post("/users/", response_model=schemas.User)
async def add_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    user = await create_user(user, db)
    print(user)
    return user


@router.get("/users/{user_id}", response_model=schemas.User)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    user = await read_user(user_id=user_id, db=db)
    return user
