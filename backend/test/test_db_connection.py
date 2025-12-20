import sys
import os

# Add the project root directory to sys.path to allow importing backend modules
# backend/test/test_db_connection.py -> backend/test -> backend -> Neo3-1 (root)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.app.core.database import SessionLocal, engine
from backend.app import models, crud, schemas
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape

def test_database():
    print("Testing database connection...")
    db = SessionLocal()
    
    try:
        # 1. Create a test user
        print("\n1. Creating test user...")
        user_data = schemas.UserCreate(username="test_user_1", email="test1@example.com")
        
        # Check if user exists first to avoid unique constraint error on re-run
        existing_user = crud.get_user_by_email(db, user_data.email)
        if existing_user:
            print(f"User {user_data.email} already exists, using existing user.")
            user = existing_user
        else:
            user = crud.create_user(db, user_data)
            print(f"User created: ID={user.id}, Username={user.username}")

        # 2. Create a test audio record
        print("\n2. Creating test audio record...")
        record_data = schemas.AudioRecordCreate(
            latitude=30.6570, # Chengdu
            longitude=104.0665,
            duration=15.5,
            emotion_tag="Peaceful",
            scene_tags=["Park", "Birds"],
            transcript="This is a test recording.",
            generated_story="A peaceful afternoon in the park."
        )
        
        # Manually creating record to include embedding which is not in the Create schema yet
        # In a real app, embedding might be added by a background worker
        point_wkt = f'POINT({record_data.longitude} {record_data.latitude})'
        
        # Mock embedding vector (dimension 768 as defined in models.py)
        mock_embedding = [0.1] * 768
        
        db_record = models.AudioRecord(
            user_id=user.id,
            file_path="/tmp/test_audio.wav",
            latitude=record_data.latitude,
            longitude=record_data.longitude,
            location_geo=point_wkt,
            duration=record_data.duration,
            emotion_tag=record_data.emotion_tag,
            scene_tags=record_data.scene_tags,
            transcript=record_data.transcript,
            generated_story=record_data.generated_story,
            embedding=mock_embedding
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        print(f"Record created: ID={db_record.id}")

        # 3. Query and Verify
        print("\n3. Verifying data...")
        retrieved_record = db.query(models.AudioRecord).filter(models.AudioRecord.id == db_record.id).first()
        
        if retrieved_record:
            print(f"Record found!")
            print(f"Location: {retrieved_record.latitude}, {retrieved_record.longitude}")
            
            # Verify Geometry
            # Note: to_shape requires the WKBElement from the DB
            try:
                shape = to_shape(retrieved_record.location_geo)
                print(f"PostGIS Geometry verified: {shape}")
            except Exception as e:
                print(f"Geometry verification warning: {e}")

            # Verify Vector
            # pgvector returns a numpy array or list depending on configuration
            if retrieved_record.embedding is not None:
                print(f"Vector retrieved successfully. Dimension: {len(retrieved_record.embedding)}")
            else:
                print("Vector is None!")
        else:
            print("Error: Record not found!")

    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
    finally:
        db.close()
        print("\nTest finished.")

if __name__ == "__main__":
    test_database()
