import os
import shutil
import uuid
import mutagen
import requests  # 需要确保安装了 requests 库
import json
from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case, desc, or_, cast, String, and_
from geoalchemy2.elements import WKTElement
from backend.app import schemas, crud
from backend.app.models.audio import AudioRecord
from backend.app.services.ai_service import ai_service
from backend.app.core.database import SessionLocal

class AudioService:
    def __init__(self):
        self.upload_dir = "backend/static/uploads"
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # --- 向量检索配置 (Vector Search Config) ---
        # 默认适配 OpenAI 格式，可替换为本地 Ollama 或其他云服务地址
        self.embedding_api_url = os.getenv("EMBEDDING_API_URL", "https://api.siliconflow.cn/v1/embeddings")
        self.embedding_api_key = os.getenv("EMBEDDING_API_KEY", "sk-irmlnxewkglpbsrdunduprnptlesoersihmxptwszornttyw") # 必填
        self.embedding_model_name = os.getenv("EMBEDDING_MODEL_NAME", "netease-youdao/bce-embedding-base_v1") 
        self.embedding_dim = int(os.getenv("EMBEDDING_DIM", "768")) # 需与数据库定义保持一致

    def _get_embedding(self, text: str):
        """
        调用外部 API 获取文本的 Embedding 向量 (同步方法)
        """
        if not text or not self.embedding_api_key:
            # 如果没有配置 Key，返回 None，后续逻辑会自动降级为普通搜索
            return None
            
        try:
            headers = {
                "Authorization": f"Bearer {self.embedding_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "input": text.replace("\n", " "), # 移除换行符
                "model": self.embedding_model_name
            }
            
            # 设置超时，防止拖慢接口
            response = requests.post(self.embedding_api_url, json=payload, headers=headers, timeout=3)
            
            if response.status_code == 200:
                data = response.json()
                embedding = data["data"][0]["embedding"]
                # 简单的维度检查/截断（防止报错，实际生产应在模型层对齐）
                if len(embedding) > self.embedding_dim:
                    return embedding[:self.embedding_dim]
                return embedding
            else:
                print(f"[Embedding Error] API responded with {response.status_code}: {response.text}")
                return None
        except Exception as e:
            print(f"[Embedding Error] Failed to get embedding: {e}")
            return None

    def _build_search_filter(self, query_str: str):
        """
        构建关键词搜索过滤器 (Keyword Filter)
        """
        if not query_str:
            return True
            
        keywords = query_str.strip().split()
        filters = []
        
        for kw in keywords:
            kw_filter = or_(
                AudioRecord.city.ilike(f"%{kw}%"),
                AudioRecord.district.ilike(f"%{kw}%"),
                cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"),
                AudioRecord.transcript.ilike(f"%{kw}%"),
                AudioRecord.generated_story.ilike(f"%{kw}%")
            )
            filters.append(kw_filter)
            
        return and_(*filters)

    async def process_audio_background(self, record_id: str, file_path: str):
        """
        后台任务：AI 分析 + 生成 Embedding + 更新数据库
        """
        print(f"Starting background processing for record {record_id}...")
        db = SessionLocal()
        try:
            with open(file_path, "rb") as f:
                file_bytes = f.read()
            
            filename = os.path.basename(file_path)
            ai_result = await ai_service.process_audio(file_bytes, filename)
            
            print(f"AI Service Result for {record_id}: {ai_result}")

            # --- 生成真实 Embedding ---
            # 优先使用生成的“故事”或“摘要”来生成向量，语义更丰富
            text_to_embed = ai_result.get("story") or ai_result.get("transcript") or ""
            embedding_vector = None
            
            if text_to_embed and self.embedding_api_key:
                print(f"Generating embedding for record {record_id}...")
                # 注意：这里在 async 函数中调用了 sync 的 requests，
                # 理想情况应放入 run_in_executor，但作为后台任务暂时可以接受
                embedding_vector = self._get_embedding(text_to_embed)
            
            if not embedding_vector:
                # 兜底 Mock，防止数据库插入报错（如果字段非空）
                # 或者保持为 None (如果数据库允许 nullable)
                embedding_vector = [0.0] * self.embedding_dim

            update_data = {
                "transcript": ai_result.get("transcript"),
                "emotion_tag": ai_result.get("emotion_tag"),
                "generated_story": ai_result.get("story"),
                "scene_tags": ai_result.get("scene_tags"),
                "embedding": embedding_vector
            }
            
            crud.audio.update_audio_record(db, record_id, update_data)
            print(f"Background processing for record {record_id} completed.")
            
        except Exception as e:
            print(f"Error in background processing for record {record_id}: {e}")
        finally:
            db.close()

    def get_city_resonance_records(self, db: Session, city: str, current_hour: int, limit: int = 20):
        """
        策略一：时空共鸣 - 混合检索版 (Hybrid Search)
        """
        # 1. 准备查询向量
        query_embedding = self._get_embedding(city)
        
        # 2. 构建关键词过滤器
        keyword_filter = self._build_search_filter(city)

        # 3. 时间过滤
        target_utc_hour = (current_hour - 8) % 24
        min_hour = target_utc_hour - 2
        max_hour = target_utc_hour + 2
        
        time_filter = None
        if min_hour < 0:
            time_filter = or_(extract('hour', AudioRecord.created_at) >= (24 + min_hour), extract('hour', AudioRecord.created_at) <= max_hour)
        elif max_hour >= 24:
            time_filter = or_(extract('hour', AudioRecord.created_at) >= min_hour, extract('hour', AudioRecord.created_at) <= (max_hour - 24))
        else:
            time_filter = extract('hour', AudioRecord.created_at).between(min_hour, max_hour)
        
        # 4. 构建查询
        query = db.query(AudioRecord)
        
        if query_embedding:
            # --- 向量检索模式 ---
            # 使用余弦距离 (Cosine Distance): <=> 操作符
            # 距离越小越相似。为了排序方便，我们取距离作为排序键（升序）
            print(f"Using Vector Search for: {city}")
            query = query.filter(time_filter).order_by(
                AudioRecord.embedding.cosine_distance(query_embedding), # 语义最接近的排前面
                AudioRecord.like_count.desc()
            )
        else:
            # --- 关键词模式 (降级) ---
            query = query.filter(keyword_filter, time_filter).order_by(AudioRecord.like_count.desc())
            
        records = query.limit(limit).all()
        
        # 5. 兜底
        if not records:
            if query_embedding:
                # 向量检索去掉时间限制
                records = db.query(AudioRecord).order_by(
                    AudioRecord.embedding.cosine_distance(query_embedding)
                ).limit(limit).all()
            else:
                # 关键词检索去掉时间限制
                records = db.query(AudioRecord).filter(keyword_filter).limit(limit).all()
                
        return records

    def get_cultural_recommendations(self, db: Session, city: str, limit: int = 20):
        """
        策略二：文化声标 - 混合检索版
        """
        query_embedding = self._get_embedding(city)
        keyword_filter = self._build_search_filter(city)
        
        cultural_keywords = ['方言', '叫卖', '钟声', '戏曲', '集市', '夜市', '地铁报站', '寺庙', '老街', '茶馆']
        score_expression = sum(
            case(
                (cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"), 1),
                (AudioRecord.transcript.ilike(f"%{kw}%"), 1),
                else_=0
            ) for kw in cultural_keywords
        )
        
        query = db.query(AudioRecord)
        
        if query_embedding:
            # 向量相似度 + 文化属性分
            # 注意：这里很难直接混合排序，通常做法是先按向量取 Top 100，再按规则重排
            # 这里简化为：优先按文化分排序，分数为0的再按向量距离排
            query = query.order_by(
                desc(score_expression),
                AudioRecord.embedding.cosine_distance(query_embedding)
            )
        else:
            query = query.filter(keyword_filter).order_by(
                desc(score_expression),
                desc(AudioRecord.like_count)
            )
            
        return query.limit(limit).all()

    def get_roaming_records(self, db: Session, city: str, user_lat: float, user_lon: float, limit: int = 20):
        """
        策略三：乡愁漫游 - 混合检索版
        """
        query_embedding = self._get_embedding(city)
        keyword_filter = self._build_search_filter(city)
        
        # 1. 计算中心点 (优先用关键词过滤出的结果来算)
        center_filter = keyword_filter # 几何计算还是用精确匹配比较准
        
        city_center_query = db.query(
            func.ST_X(func.ST_Centroid(func.ST_Collect(AudioRecord.location_geo))),
            func.ST_Y(func.ST_Centroid(func.ST_Collect(AudioRecord.location_geo)))
        ).filter(center_filter).first()
        
        is_roaming = False
        if city_center_query and city_center_query[0] is not None:
            city_lon, city_lat = city_center_query
            user_point = WKTElement(f'POINT({user_lon} {user_lat})', srid=4326)
            city_point = func.ST_SetSRID(func.ST_MakePoint(city_lon, city_lat), 4326)
            distance_meters = db.scalar(func.ST_DistanceSphere(city_point, user_point))
            if distance_meters and distance_meters > 100000:
                is_roaming = True
                
        if is_roaming:
            keywords = ["生活", "方言", "雨声", "做饭", "猫", "狗", "巷子", "童年", "老", "家乡", "煮"]
        else:
            keywords = ["景点", "地标", "广场", "活动", "打卡", "中心", "夜景", "游乐园", "博物馆"]
            
        score_expression = sum(
            case(
                (cast(AudioRecord.scene_tags, String).ilike(f"%{kw}%"), 1),
                (AudioRecord.transcript.ilike(f"%{kw}%"), 1),
                else_=0
            ) for kw in keywords
        )
        
        query = db.query(AudioRecord)
        
        if query_embedding:
            # 向量检索 + 漫游加权
            query = query.order_by(
                desc(score_expression),
                AudioRecord.embedding.cosine_distance(query_embedding)
            )
        else:
            query = query.filter(keyword_filter).order_by(
                desc(score_expression),
                desc(AudioRecord.like_count)
            )
        
        return query.limit(limit).all()

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
            
        # Extract metadata
        try:
            audio_meta = mutagen.File(file_path)
            duration = audio_meta.info.length if audio_meta and audio_meta.info else 0
            file_size = os.path.getsize(file_path)
            file_format = file_ext.lstrip('.').lower()
        except Exception as e:
            print(f"Error extracting metadata: {e}")
            duration = 0
            file_size = 0
            file_format = "unknown"
            
        # 2. Create DB Record (Initial state)
        record_create = schemas.AudioRecordCreate(
            latitude=latitude,
            longitude=longitude,
            duration=duration,
            file_size=file_size,
            format=file_format,
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
