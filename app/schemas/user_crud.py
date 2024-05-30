from sqlalchemy.orm import Session

from . import schemas
from ..models import models


async def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


async def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate):
    fake_hashed_password = user.password + "notreallyhashed"
    db_user = models.User(email=user.email, hashed_password=fake_hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


async def create_user_file(db: Session, item: schemas.FileCreate):
    db_file = models.File(
        file_name=item.file_name,
        file_type=item.file_type,
        file_path=item.file_path,
        parsed_data=item.parsed_data,
        user_id=item.user_id
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


def update_user(db: Session, user: schemas.UserUpdate):
    db_user = models.User(**user)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
