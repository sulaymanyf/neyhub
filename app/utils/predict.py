
import librosa
import librosa.display
import torch
from sklearn.cluster import KMeans
import numpy as np

from ..utils.load_model import phonemes

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

THRESHOLD = 50


def is_audio_silent(buffer, threshold=0.0001):
    return np.mean(np.square(buffer)) < threshold


async def is_chroma_change(y,sr, threshold=0.01):
    frame_length = 2048  # 帧大小
    hop_length = 1024  # 帧移

    chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=hop_length)

    # 计算相邻色度特征之间的差异
    chroma_diff = np.sum(np.abs(np.diff(chroma, axis=1)), axis=0)
    # 判断是否存在显著变化
    return np.any(chroma_diff > threshold)


async def segment_audio_chroma(y, sr):
    # 提取色度特征
    hop_length = 512
    chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=hop_length)

    # 应用K-means聚类
    kmeans = KMeans(n_clusters=4, random_state=0).fit(chroma.T)
    labels = kmeans.labels_

    # 找出标签改变的点
    change_points = [0] + [i for i in range(1, len(labels)) if labels[i] != labels[i - 1]] + [len(labels)]
    segments = []
    # 根据变化点确定时间边界并分割音频
    for i in range(len(change_points) - 1):
        start_frame = change_points[i] * hop_length
        end_frame = change_points[i + 1] * hop_length
        if end_frame > len(y):  # 防止索引超出数组长度
            end_frame = len(y)
        segment = y[start_frame:end_frame]
        output_file = f'orinnal/output_directory/segment_{i + 1}.wav'
        segment_size = len(segment) * 2  # assume 16-bit audio
        if segment_size > 30 * 1024:  # 150KB
            segments.append(segment)

    return segments


def is_silence(snd_data):
    try:
       # 将音频数据转换为数组
       snd_data = np.frombuffer(snd_data, dtype=np.int16)
       # 计算音量
       rms = np.sqrt(np.mean(np.square(snd_data)))
       # 判断是否是静音
       if rms < THRESHOLD:
           return True
       else:
           return False
    except Exception as e:
        print(f"Failed to is_silence: {e} ")


async def process_and_send(audio_data, model, websocket):
    if not is_silence(audio_data):
        return
    # print(len(audio_data))
    # audio, _ = librosa.load('E:\\development\\python\\datacollection\\neyhub\\app\\utils\\sol_test.wav', sr=22050)
    # print(f"my {len(audio_data)}")
    sample_rate = 22050
    uniform_length_seconds = 2
    # 对 MFCC 特征进行填充
    max_length = uniform_length_seconds * sample_rate
    # audio_array = audio_data / 32768.0
    audio_data = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
    # Add debug logging statements
    # print(f"Audio array shape: {audio_data.shape}")
    # print(f"Audio array size: {audio_data.size}")
    # print(f"Audio array dtype: {audio_data.dtype}")
    # print(f"Audio array shape: {audio.shape}")
    # print(f"Audio array size: {audio.size}")
    # print(f"Audio array dtype: {audio.dtype}")
    # audio_data = librosa.core.resample(y=audio_data, orig_sr=48000, target_sr=22050)

    try:

        mfcc = librosa.feature.mfcc(y=audio_data, sr=sample_rate, n_mfcc=40)

        # Ensure MFCCs have consistent length
        if mfcc.shape[1] < max_length:
            padding = max_length - mfcc.shape[1]
            mfcc = np.pad(mfcc, ((0, 0), (0, padding)), mode='constant')
        elif mfcc.shape[1] > max_length:
            mfcc = mfcc[:, :max_length]

        # Convert MFCC to tensor, reshaping for Conv1d input
        mfcc_tensor = torch.tensor(mfcc, dtype=torch.float32).transpose(0,
                                                                        1)  # Transpose to make it [length, features]
        mfcc_tensor = mfcc_tensor.unsqueeze(0)  # Add batch dimension, now [1, length, features]

        # Change from [1, length, features] to [1, features, length] as expected by Conv1d
        mfcc_tensor = mfcc_tensor.transpose(1, 2)  # Now [1, features, length]

        # Move tensor to the appropriate device
        mfcc_tensor = mfcc_tensor.to(device)
        output = model(mfcc_tensor)

        _, predicted = torch.max(output, 1)
        predicted_phoneme = [phonemes[i.item()] for i in predicted]
        message = str(predicted_phoneme[0])
        print(message)
        # 将预测结果发送到 WebSocket 连接
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"Failed to send prediction message to WebSocket client: {e} {message}")
    except Exception as e:
        print(f"Failed to mfcc : {e}")





# # 将二进制音频数据转换为 numpy 数组
# audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
#
# # 计算 MFCC 特征
# mfccs = librosa.feature.mfcc(y=audio_array, sr=22050, n_mfcc=40)
#
# mfccs_padded = np.pad(mfccs, pad_width=((0, 0), (0, total_dataset_uniform_length_frames - mfccs.shape[1])),
#                       mode='constant')
#
# # 将 MFCC 特征转换为 PyTorch 张量
# tensor = torch.tensor(mfccs_padded, dtype=torch.float32, device=device).unsqueeze(0)
#
# # 使用模型进行预测
# outputs = model(tensor)
# _, predicted = torch.max(outputs, 1)
# predicted_phoneme = phonemes[predicted.item()]  # 获取预测的音素

def audio_capture(stream, audio_queue):
    print("Audio capture started")
    # buffer = bytearray()
    while True:
        audio_data = np.frombuffer(stream.read(22050), np.int16)
        # Convert to floating point and normalize
        audio_data_buffer = audio_data.astype(np.float32, order='C') / 32768.0

        # Add to buffer
        if is_audio_silent(audio_data_buffer):
            continue  # Skip this iteration if buffer is silent
        audio_queue.put_nowait(audio_data)



