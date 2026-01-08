Executive Summary

Goated App  is a privacy-first, offline-capable clinical orchestration platform designed to eliminate cloud latency and vendor lock-in for healthcare providers. By leveraging Edge AI (local Whisper STT + FunctionGemma 270M) and the Model Context Protocol (MCP), the application functions as a "Universal Adapter," allowing clinicians to execute complex workflows across disconnected hospital systems (EHR, Pyxis, Communication) via natural voice commands without patient data ever leaving the device. This "Bring Your Own Tool" architecture positions SpinSci as the operating system for the hospital edge, solving the critical trilemma of HIPAA compliance, speed, and interoperability.

Problem Statement

Clinicians currently lose ~30% of their shifts navigating rigid, disconnected legacy systems. Existing AI solutions fail in this environment due to three fatal flaws:

Privacy Risks: Cloud-based LLMs require sending PHI (Protected Health Information) to external servers, creating massive HIPAA compliance hurdles.

Unacceptable Latency: Cloud round-trips introduce delays that frustrate fast-moving medical staff.

Integration Nightmare: Hard-coding integrations for every hospital's unique mix of software (Epic vs. Cerner, Cisco vs. Genesys) is unscalable and expensive. Hospitals need an intelligent interface that is fast, strictly local, and agnostic to the underlying IT infrastructure.









Architecture Overview

The "Brain" (FunctionGemma): Runs in a Python sidecar process (FastAPI) on port 8000. This allows us to use llama-cpp-python for efficient GGUF inference and precise control over the prompt template required for FunctionGemma.

The "Ear" (Whisper): Runs directly inside the Electron Node.js process using whisper-node (a wrapper for whisper.cpp). This keeps voice processing strictly "in-app" for maximum speed and privacy.

Step 1: The Python Backend (FunctionGemma)

First, create a python/ directory in your project root. We will serve the model using FastAPI to create an OpenAI-compatible endpoint that your existing app logic can easily consume.

File: python/requirements.txt

Plaintext

fastapi
uvicorn
llama-cpp-python
pydantic
File: python/server.py

Python

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from llama_cpp import Llama
import uvicorn
import os

app = FastAPI()

# Load the GGUF model (ensure you download the FunctionGemma GGUF first)
# Recommended: function-gemma-it-v1.gguf (Quantized)
MODEL_PATH = os.getenv("MODEL_PATH", "./models/function-gemma-it.gguf")

try:
    # n_ctx=8192 is crucial for handling tool definitions
    llm = Llama(model_path=MODEL_PATH, n_ctx=8192, n_gpu_layers=-1, verbose=False)
except Exception as e:
    print(f"Error loading model: {e}")
    llm = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    tools: list[dict] = None

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    if not llm:
        raise HTTPException(status_code=500, detail="Model not loaded")

    # Format messages for FunctionGemma
    # Note: llama-cpp-python handles the chat template if the GGUF has it metadata
    # Otherwise, we might need manual formatting. Assuming GGUF is correct:
    
    # We construct the tools schema for the system prompt if provided
    formatted_messages = [m.dict() for m in request.messages]
    
    response = llm.create_chat_completion(
        messages=formatted_messages,
        tools=request.tools,
        tool_choice="auto" if request.tools else None,
        temperature=0.0  # Deterministic for tool calling
    )
    
    return response

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
Step 2: The Node.js Whisper Service (Electron Main)

We will use whisper-node to run transcription natively in the main process.

Install Dependency:

Bash

npm install whisper-node
File: src/features/transcription/backend/whisper-service.ts

TypeScript

import whisper from 'whisper-node';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class WhisperService {
  private isInitialized = false;

  async initialize() {
    // Ideally download the model on first launch
    // This is a simplified check
    this.isInitialized = true;
  }

  async transcribe(audioFilePath: string): Promise<string> {
    if (!this.isInitialized) await this.initialize();

    console.log(`Transcribing file: ${audioFilePath}`);

    try {
      // whisper-node returns an array of segments
      const transcript = await whisper(audioFilePath, {
        modelName: "base.en", // or 'distil-large-v3' if downloaded
        modelPath: path.join(app.getPath('userData'), 'models/whisper'),
        whisperOptions: {
          language: 'auto',
          gen_file_txt: false,
          gen_file_subtitle: false,
          gen_file_vtt: false,
        }
      });

      // Combine segments into single string
      return transcript.map(t => t.speech).join(' ').trim();
    } catch (error) {
      console.error("Whisper Transcription Error:", error);
      throw error;
    }
  }
}

// Singleton
export const whisperService = new WhisperService();
Update Main Router (src/backend/src/index.ts or similar):

Register the IPC handler to bridge the Frontend to this Service.

TypeScript

import { ipcMain } from 'electron';
import { whisperService } from '@features/transcription/backend/whisper-service';

// ... inside app setup
ipcMain.handle('transcription:transcribe', async (_, filePath) => {
  return await whisperService.transcribe(filePath);
});
Step 3: Connect Frontend to Local Backend

Now update your existing message-service.ts to support the "Local" provider pointing to your Python sidecar.

File: src/features/conversations/backend/services/message-service.ts

TypeScript

// ... existing imports
import { createOpenAI } from "@ai-sdk/openai";

// Add 'local' to your provider handling
private createProviderClient(provider: ConfiguredProvider): AcceptedProviders {
  // ... existing switch/case
  
  if (provider.provider === 'local') {
    // We use the OpenAI client because our Python server mimics the OpenAI API
    return createOpenAI({
      apiKey: 'not-needed', // Local doesn't need a real key
      baseURL: 'http://127.0.0.1:8000/v1', // Point to Python Sidecar
    });
  }
  
  // ... rest of code
}
Step 4: The Frontend Recorder Hook

Create a hook to capture audio and send it to the Electron backend.

File: src/features/conversations/frontend/hooks/useRecorder.ts

TypeScript

import { useState, useRef } from 'react';

export const useRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = async (): Promise<string> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) return resolve('');

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const buffer = await blob.arrayBuffer();
        
        // Send buffer to Main process to save to temp file and transcribe
        // Note: You need to implement 'transcription:saveAndTranscribe' in main
        // that accepts an ArrayBuffer, writes it to temp.wav, and calls whisperService
        const text = await window.api.transcription.transcribe(buffer);
        
        setIsRecording(false);
        resolve(text);
      };

      mediaRecorderRef.current.stop();
    });
  };

  return { isRecording, startRecording, stopRecording };
};
How to Run It

Terminal 1 (Backend): python python/server.py (Starts FunctionGemma on port 8000).

Terminal 2 (App): npm run dev (Starts Electron App with Node.js Whisper).

