import itertools
import os
import torch
import torch.nn as nn
import torch.optim as optim
import librosa
import numpy as np
import matplotlib.pyplot as plt
from torch.utils.data import DataLoader, random_split, Dataset
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

train_dataset_path = 'ney_audio_dataset'

sample_rate = 22050
# phonemes = ["do", "la", "sol", "re", "si", "sol_gerdaniye", "fa", "mi", "fa_diyez"]
phonemes = ["do", "la", "sol", "re", "si"]

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# model_path = 'model/phoneme_classifier_tran2and3fhunggen_25_epoch_time20240430.pth'
model_path = 'model/phoneme_classifier_tran2and3fhunggen_25_epoch_time.pth'


class AudioPhonemeDataset(Dataset):
    def __init__(self, directory, sample_rate, uniform_length_seconds=2):
        self.directory = directory
        self.sample_rate = sample_rate
        self.uniform_length_frames = uniform_length_seconds * sample_rate
        self.files = []
        self.label_indices = []

        # Collect file paths and corresponding labels
        for label in phonemes:
            label_dir = os.path.join(directory, label)
            if os.path.isdir(label_dir):
                for f in os.listdir(label_dir):
                    self.files.append(os.path.join(label_dir, f))
                    self.label_indices.append(phonemes.index(label))

    def __len__(self):
        return len(self.files)

    def __getitem__(self, idx):
        file_path = self.files[idx]
        label = self.label_indices[idx]
        # Load and process audio
        mfcc = self.load_and_process_audio(file_path)
        return torch.tensor(mfcc, dtype=torch.float32), label

    def load_and_process_audio(self, audio_file):
        audio, _ = librosa.load(audio_file, sr=self.sample_rate)
        mfcc = librosa.feature.mfcc(y=audio, sr=self.sample_rate, n_mfcc=40)
        # Pad or truncate
        if mfcc.shape[1] < self.uniform_length_frames:
            padding = self.uniform_length_frames - mfcc.shape[1]
            mfcc = np.pad(mfcc, ((0, 0), (0, padding)), mode='constant')
        elif mfcc.shape[1] > self.uniform_length_frames:
            mfcc = mfcc[:, :self.uniform_length_frames]
        return mfcc


class PhonemeClassifier(nn.Module):
    def __init__(self, num_features, num_classes, max_length):
        super(PhonemeClassifier, self).__init__()
        self.conv1 = nn.Conv1d(num_features, 64, kernel_size=3, padding=1)
        self.conv2 = nn.Conv1d(64, 128, kernel_size=3, padding=1)
        self.maxpool = nn.MaxPool1d(kernel_size=2)
        self.reduced_length = max_length // 2  # Calculate and save as an instance variable
        self.fc1 = nn.Linear(128 * self.reduced_length, 128)  # Use the instance variable
        self.fc2 = nn.Linear(128, num_classes)

    def forward(self, x):
        x = torch.relu(self.conv1(x))
        x = torch.relu(self.conv2(x))
        x = self.maxpool(x)
        x = x.view(-1, 128 * self.reduced_length)  # Correctly reference the instance variable
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x


total_dataset = AudioPhonemeDataset(train_dataset_path, sample_rate)


def load_model():
    model = PhonemeClassifier(
        num_features=40,
        num_classes=len(phonemes),
        max_length=total_dataset.uniform_length_frames
    ).to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    torch.no_grad()
    print("model loaded")
    return model

