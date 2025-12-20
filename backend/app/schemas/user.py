from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
