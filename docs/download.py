# /root/autodl-tmp/download_model.py
from modelscope import snapshot_download

model_dir = snapshot_download(
    'Qwen/Qwen-Audio-Chat',  # 或 'Qwen/Qwen-Audio-8B-Chat'
    cache_dir='/root/autodl-tmp',
    revision='master'
)
print(f"模型下载完成: {model_dir}")
