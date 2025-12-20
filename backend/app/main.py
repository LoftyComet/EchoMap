from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from backend.app import models, schemas, crud
from backend.app.core.database import SessionLocal, engine

# 在应用启动时创建表 (仅用于开发环境，生产环境推荐使用 Alembic)
models.user.Base.metadata.create_all(bind=engine)
# models.audio.Base.metadata.create_all(bind=engine) # Base is shared, so one call is enough if all models are imported.
# However, we need to ensure models are imported so Base knows about them.
# Importing `backend.app.models` does `from .user import User` and `from .audio import AudioRecord`, so they are registered.

app = FastAPI(title="Sound Memory API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Sound Memory Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: str, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
