import asyncio

import numpy as np
import pyaudio

eatures =40
# Function to check if audio is silent
sample_rate = 22050
channels = 1
chunk_size = 22050  # 10毫秒的音频数据
audio_device_index = None
audio_format = pyaudio.paInt16


def start_pyadio():
    audio_queue = asyncio.Queue()
    p = pyaudio.PyAudio()
    stream = p.open(format=audio_format,
                    channels=channels,
                    rate=sample_rate,
                    input=True,
                    output=False,
                    frames_per_buffer=chunk_size,
                    input_device_index=audio_device_index)
    buffer_size = 1  # seconds
    buffer = np.zeros((buffer_size * 22050,))
    print("Starting PyAudio...")
    return audio_queue, stream, buffer
