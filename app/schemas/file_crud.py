from sqlalchemy.orm import Session

from . import schemas
from ..models import models


async def get_file(db: Session, file_id: int):
    return db.query(models.File).filter(models.File.id == file_id).first()


def get_file_by_file_name(db: Session, file_name: str):
    return db.query(models.File).filter(models.File.file_name == file_name).first()


def get_files(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.File).offset(skip).limit(limit).all()


def update_file_db(db: Session, file: schemas.FileUpdate):
    db.query(models.File).filter(models.File.id == file.id).update({
        "parsed": file.parsed,
        "parsed_data": file.parsed_data
    })
    db.commit()
    updated_file = db.query(models.File).filter(models.File.id == file.id).first()
    return updated_file



