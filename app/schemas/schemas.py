from pydantic import BaseModel


class FileBase(BaseModel):
    file_name: str
    file_type: str
    file_path: str
    parsed: bool


class FileParse(FileBase):
    parsed_data: str
    parsed: bool


class FileUpdate(FileBase):
    file_path: str
    parsed_data: str


class FileCreate(FileBase):
    user_id: int
    file_name: str
    file_type: str
    file_path: str
    parsed_data: str
    parsed: bool


class FileDto(FileBase):
    file_name: str
    file_type: str
    file_path: str


class File(FileBase):
    id: int
    user_id: int

    class Config:
        from_orm = True


class UserBase(BaseModel):
    email: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    files: list[File] = []

    class Config:
        from_orm = True


class UserUpdate(UserBase):
    pass

