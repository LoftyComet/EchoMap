import os
import shutil
import uuid
from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from backend.app import schemas, crud
from backend.app.services.ai_service import ai_service
from backend.app.core.database import SessionLocal

class AudioService:
    def __init__(self):
        self.upload_dir = "backend/static/uploads"
        os.makedirs(self.upload_dir, exist_ok=True)

    async def process_audio_background(self, record_id: str, file_path: str):
        """
        Background task to process audio using AIService and update the database.
        """
        print(f"Starting background processing for record {record_id}...")
        db = SessionLocal()
        try:
            # Read the file bytes
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            
            # Call AI Service
            filename = os.path.basename(file_path)
            ai_result = await ai_service.process_audio(file_bytes, filename)
            
            print(f"AI Service Result for {record_id}: {ai_result}") # Debug log

            # Update Database
            # Mock embedding since AI service doesn't return it yet
            mock_embedding = [0.1] * 768
            
            update_data = {
                "transcript": ai_result.get("transcript"),
                "emotion_tag": ai_result.get("emotion_tag"),
                "generated_story": ai_result.get("story"),
                "scene_tags": ai_result.get("scene_tags"),
                "embedding": mock_embedding
            }
            
            crud.audio.update_audio_record(db, record_id, update_data)
            print(f"Background processing for record {record_id} completed.")
            
        except Exception as e:
            print(f"Error in background processing for record {record_id}: {e}")
        finally:
            db.close()

    async def upload_and_process(
        self, 
        db: Session, 
        file: UploadFile, 
        latitude: float, 
        longitude: float, 
        background_tasks: BackgroundTasks,
        user_id: str = None
    ) -> schemas.AudioRecord:
        """
        Handles file upload, DB record creation, and triggers background processing.
        """
        # 1. Save the file
        file_ext = os.path.splitext(file.filename)[1]
        if not file_ext:
            file_ext = ".wav"
            
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(self.upload_dir, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Create DB Record (Initial state)
        record_create = schemas.AudioRecordCreate(
            latitude=latitude,
            longitude=longitude,
            duration=0,
            emotion_tag="Processing...",
            scene_tags=[],
            transcript="",
            generated_story=""
        )
        
        db_record = crud.audio.create_audio_record(db, record_create, file_path, user_id=user_id)
        
        # 3. Trigger Background Task
        # Note: We pass the method of this instance
        background_tasks.add_task(self.process_audio_background, str(db_record.id), file_path)
        
        return db_record

audio_service = AudioService()
