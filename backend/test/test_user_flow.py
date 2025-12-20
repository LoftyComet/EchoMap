import requests
import uuid
import time

BASE_URL = "http://127.0.0.1:8000"

def create_user():
    unique_id = uuid.uuid4()
    email = f"test_{unique_id}@example.com"
    username = f"test_user_{unique_id}"
    user_data = {
        "username": username,
        "email": email
    }
    print(f"Creating user: {username}")
    response = requests.post(f"{BASE_URL}/users/", json=user_data)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to create user: {response.text}")
        return None

def upload_audio(user_id):
    url = f"{BASE_URL}/api/v1/records/upload"
    
    # Check if test.mp3 exists and has content, otherwise create dummy
    import os
    file_name = "test.mp3"
    if not os.path.exists(file_name) or os.path.getsize(file_name) < 100:
        print(f"Warning: {file_name} not found or too small. Creating dummy file (will likely fail AI analysis).")
        # with open(file_name, "wb") as f:
        #     f.write(b"dummy audio content" * 100) # Make it a bit larger
    else:
        print(f"Using existing {file_name} for upload.")
        
    with open(file_name, "rb") as f:
        files = {"file": f}
        data = {
            "latitude": 31.2304,
            "longitude": 121.4737,
            "user_id": user_id
        }
        print("Uploading audio...")
        response = requests.post(url, files=files, data=data)
    
    return response

def get_user_records(user_id):
    url = f"{BASE_URL}/users/{user_id}/records"
    print(f"Fetching records for user {user_id}...")
    response = requests.get(url)
    return response

if __name__ == "__main__":
    # 1. Create User
    user = create_user()
    if user:
        user_id = user['id']
        print(f"User created: {user_id}")
        
        # 2. Upload Audio
        response = upload_audio(user_id)
        if response.status_code == 200:
            record = response.json()
            print(f"Upload successful. Record ID: {record['id']}")
            
            # 3. Wait for background processing (optional, but good to see if fields update)
            # Since we are using a dummy file, AI service might fail or return mock data if we didn't mock it properly.
            # But here we just want to test the "Get User Records" functionality.
            
            # 4. Get User Records
            print("Waiting 20 seconds...")
            time.sleep(20)
            
            records_response = get_user_records(user_id)
            if records_response.status_code == 200:
                records = records_response.json()
                print(f"\n=== User Records ({len(records)}) ===")
                for rec in records:
                    print(f"ID: {rec['id']}")
                    print(f"Emotion: {rec.get('emotion_tag')}")
                    print(f"Story: {rec.get('generated_story')}")
                    print(f"Transcript: {rec.get('transcript')}")
                    print("-" * 20)
            else:
                print(f"Failed to get records: {records_response.text}")
        else:
            print(f"Upload failed: {response.text}")
    else:
        print("Test aborted.")
