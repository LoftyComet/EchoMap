import os
import shutil
import uvicorn
import torch
from fastapi import FastAPI, UploadFile, File, Form
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.generation import GenerationConfig

app = FastAPI()

# === 1. 加载模型 ===
print("正在加载 Qwen-Audio-Chat 模型...")
MODEL_ID = "Qwen/Qwen-Audio-Chat"

try:
    # 加载 Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    
    # 加载模型 (这里根据你之前的环境，使用 bf16 或 fp16)
    # 既然在 AutoDL，通常显卡较好，建议 bf16=True；如果报错改 fp16=True
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        device_map="auto",
        trust_remote_code=True,
        bf16=True 
    ).eval()
    
    # 加载生成配置
    model.generation_config = GenerationConfig.from_pretrained(MODEL_ID, trust_remote_code=True)
    
    print("=== 模型加载完成，API 准备就绪 ===")
except Exception as e:
    print(f"!!! 模型加载失败 !!! 错误信息: {e}")
    # 这里不raise，防止服务直接起不来，可以在日志看报错

# === 2. 定义 API 接口 ===
@app.post("/analyze")
async def analyze_audio(
    prompt: str = Form(...),          # 接收文本提示词
    audio_file: UploadFile = File(...) # 接收二进制音频文件
):
    # 构造临时文件名，避免并发冲突建议加个随机ID，这里简单演示用原名
    temp_filename = f"temp_{audio_file.filename}"
    
    try:
        # 1. 保存上传的文件到服务器本地
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
            
        print(f"收到文件: {temp_filename}, 提示词: {prompt}")
        
        # 2. 构造 Qwen-Audio 需要的输入格式
        # 注意：因为文件已经保存到本地了，直接传路径字符串即可
        query = tokenizer.from_list_format([
            {'audio': temp_filename}, 
            {'text': prompt},
        ])
        
        # 3. 使用 model.chat 进行推理
        # 相比 model.generate，chat 方法会自动处理音频编码和特殊token，更稳定
        response, history = model.chat(tokenizer, query=query, history=None)
        
        print(f"推理完成: {response}")
        
        return {
            "status": "success", 
            "response": response
        }

    except Exception as e:
        print(f"推理错误: {str(e)}")
        return {"status": "error", "message": str(e)}
    
    finally:
        # 4. 清理垃圾文件 (非常重要，否则磁盘会满)
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

if __name__ == "__main__":
    # AutoDL 必须监听 0.0.0.0 和 6006 端口才能通过公网访问
    print("服务运行中... 请在 AutoDL 控制台点击'自定义服务'获取外网链接")
    uvicorn.run(app, host="0.0.0.0", port=6006)