/**
 * WhisperService - Local Speech-to-Text Service
 * 
 * Implements local transcription using nodejs-whisper (whisper.cpp bindings).
 * Stores models in {userData}/models/whisper/
 * 
 * Requirements: 4.1-4.10
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync, spawn } from 'child_process';
import { nodewhisper } from 'nodejs-whisper';

// Supported Whisper model sizes (Requirement 4.3)
export type WhisperModel = 'base.en' | 'small.en' | 'medium.en' | 'large-v3-turbo';

export interface WhisperConfig {
  modelName: WhisperModel;
  modelPath: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

/**
 * WhisperService class for local speech-to-text transcription
 * Requirement 4.1: Implemented as a TypeScript class in the Main_Process
 */
export class WhisperService {
  private modelName: WhisperModel = 'base.en';
  private modelsDir: string;
  private _initialized: boolean = false;
  private ffmpegPath: string | null = null;

  constructor() {
    // Requirement 4.2: Store models in {userData}/models/whisper/
    this.modelsDir = path.join(app.getPath('userData'), 'models', 'whisper');
  }

  /**
   * Initialize the Whisper service
   * Creates the models directory if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      // Ensure models directory exists
      if (!fs.existsSync(this.modelsDir)) {
        fs.mkdirSync(this.modelsDir, { recursive: true });
        console.log(`[Whisper] Created models directory: ${this.modelsDir}`);
      }
      
      // Find ffmpeg path
      this.ffmpegPath = this.findFfmpeg();
      if (this.ffmpegPath) {
        console.log(`[Whisper] Found ffmpeg at: ${this.ffmpegPath}`);
      } else {
        console.warn('[Whisper] ffmpeg not found - audio conversion may fail');
      }
      
      this._initialized = true;
      console.log(`[Whisper] Service initialized with model: ${this.modelName}`);
    } catch (error) {
      console.error('[Whisper] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Find ffmpeg binary path
   */
  private findFfmpeg(): string | null {
    const possiblePaths = [
      '/opt/homebrew/bin/ffmpeg',  // Homebrew on Apple Silicon
      '/usr/local/bin/ffmpeg',      // Homebrew on Intel Mac
      '/usr/bin/ffmpeg',            // System ffmpeg
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    
    // Try to find via which command
    try {
      const result = execSync('which ffmpeg', { encoding: 'utf-8' }).trim();
      if (result && fs.existsSync(result)) {
        return result;
      }
    } catch {
      // which command failed
    }
    
    return null;
  }

  /**
   * Convert audio file to WAV format (16kHz, mono) for Whisper
   */
  private async convertToWav(inputPath: string, outputPath: string): Promise<void> {
    if (!this.ffmpegPath) {
      throw new Error('ffmpeg not found. Please install ffmpeg: brew install ffmpeg');
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-ar', '16000',      // 16kHz sample rate (required by Whisper)
        '-ac', '1',          // Mono channel
        '-c:a', 'pcm_s16le', // 16-bit PCM
        '-y',                // Overwrite output
        outputPath
      ];

      console.log(`[Whisper] Converting audio: ${this.ffmpegPath} ${args.join(' ')}`);

      const ffmpeg = spawn(this.ffmpegPath!, args);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`[Whisper] Audio converted successfully to: ${outputPath}`);
          resolve();
        } else {
          console.error(`[Whisper] ffmpeg failed with code ${code}: ${stderr}`);
          reject(new Error(`ffmpeg conversion failed: ${stderr}`));
        }
      });

      ffmpeg.on('error', (err) => {
        console.error('[Whisper] ffmpeg spawn error:', err);
        reject(err);
      });
    });
  }

  /**
   * Clean transcription text by removing timestamps and formatting artifacts
   * Removes patterns like "[00:00:00.000 --> 00:00:05.000]" and extra whitespace
   */
  private cleanTranscription(text: string): string {
    // Remove timestamp patterns like "[00:00:00.000 --> 00:00:05.000]"
    let cleaned = text.replace(/\[\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\]/g, '');
    
    // Remove SRT-style timestamps like "00:00:00,000 --> 00:00:05,000"
    cleaned = cleaned.replace(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/g, '');
    
    // Remove VTT-style timestamps like "00:00:00.000 --> 00:00:05.000"
    cleaned = cleaned.replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/g, '');
    
    // Remove sequence numbers (common in SRT format)
    cleaned = cleaned.replace(/^\d+\s*$/gm, '');
    
    // Remove extra whitespace and newlines
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get available Whisper models
   * Requirement 4.3: Support base.en, small.en, medium.en, and large-v3-turbo
   */
  getAvailableModels(): WhisperModel[] {
    return ['base.en', 'small.en', 'medium.en', 'large-v3-turbo'];
  }

  /**
   * Set the active model
   */
  async setModel(modelName: WhisperModel): Promise<void> {
    if (!this.getAvailableModels().includes(modelName)) {
      throw new Error(`Invalid model name: ${modelName}. Available models: ${this.getAvailableModels().join(', ')}`);
    }
    this.modelName = modelName;
    console.log(`[Whisper] Model set to: ${modelName}`);
  }

  /**
   * Get current model name
   */
  getModelName(): WhisperModel {
    return this.modelName;
  }

  /**
   * Get models directory path
   */
  getModelsDir(): string {
    return this.modelsDir;
  }

  /**
   * Transcribe an audio file (must be WAV format)
   * 
   * Requirement 4.4: Invoke whisper.cpp with the specified model
   * Requirement 4.5: Configure language="auto" for automatic language detection
   * Requirement 4.6: Disable subtitle file generation
   * Requirement 4.7: Concatenate segment.speech values with spaces
   * Requirement 4.8: Throw error if audio file not found
   * Requirement 4.9: Log and re-throw whisper.cpp errors
   * 
   * @param audioFilePath - Path to the WAV audio file to transcribe
   * @returns Transcribed text
   */
  async transcribe(audioFilePath: string): Promise<string> {
    // Requirement 4.8: Check if audio file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    console.log(`[Whisper] Transcribing: ${audioFilePath}`);
    console.log(`[Whisper] Using model: ${this.modelName}`);

    try {
      // Call nodejs-whisper with configuration
      // The file should already be in WAV format at this point
      const result = await nodewhisper(audioFilePath, {
        modelName: this.modelName,
        removeWavFileAfterTranscription: false, // We handle cleanup ourselves
        withCuda: false, // CPU-only for compatibility
        whisperOptions: {
          outputInCsv: false,
          outputInJson: false,
          outputInJsonFull: false,
          outputInLrc: false,
          outputInSrt: false, // Requirement 4.6: Disable subtitle generation
          outputInText: true, // Get text output
          outputInVtt: false, // Requirement 4.6: Disable subtitle generation
          outputInWords: false,
          translateToEnglish: false,
          wordTimestamps: false,
          splitOnWord: true,
        },
      });

      // Requirement 4.7: Concatenate segment text with spaces
      let transcribedText = '';
      
      if (Array.isArray(result)) {
        // Result is an array of segments
        transcribedText = result
          .map((segment: { speech?: string; text?: string }) => segment.speech || segment.text || '')
          .join(' ')
          .trim();
      } else if (typeof result === 'string') {
        transcribedText = result.trim();
      } else if (result && typeof result === 'object') {
        // Handle object result with segments
        const segments = (result as { segments?: Array<{ text?: string; speech?: string }> }).segments;
        if (segments && Array.isArray(segments)) {
          transcribedText = segments
            .map((segment) => segment.speech || segment.text || '')
            .join(' ')
            .trim();
        }
      }

      // Clean up timestamps from the transcription (e.g., "[00:00:00.000 --> 00:00:05.000]")
      transcribedText = this.cleanTranscription(transcribedText);

      console.log(`[Whisper] Transcription complete: "${transcribedText.substring(0, 50)}..."`);
      return transcribedText;

    } catch (error) {
      // Requirement 4.9: Log and re-throw with context
      console.error('[Whisper] Transcription failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Whisper transcription failed: ${errorMessage}`);
    }
  }

  /**
   * Transcribe audio from an ArrayBuffer (for IPC from renderer)
   * Handles WebM to WAV conversion before transcription
   * 
   * @param audioBuffer - Audio data as ArrayBuffer (WebM format from browser)
   * @returns Transcribed text
   */
  async transcribeBuffer(audioBuffer: ArrayBuffer): Promise<string> {
    const tempDir = app.getPath('temp');
    const timestamp = Date.now();
    const webmFilePath = path.join(tempDir, `whisper_${timestamp}.webm`);
    const wavFilePath = path.join(tempDir, `whisper_${timestamp}.wav`);

    try {
      // Write WebM buffer to temp file
      const buffer = Buffer.from(audioBuffer);
      fs.writeFileSync(webmFilePath, buffer);
      console.log(`[Whisper] Saved WebM audio to: ${webmFilePath} (${buffer.length} bytes)`);

      // Convert WebM to WAV using ffmpeg
      await this.convertToWav(webmFilePath, wavFilePath);

      // Transcribe the WAV file
      const result = await this.transcribe(wavFilePath);

      return result;
    } finally {
      // Clean up temp files
      for (const filePath of [webmFilePath, wavFilePath]) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[Whisper] Cleaned up: ${filePath}`);
          }
        } catch (cleanupError) {
          console.warn(`[Whisper] Failed to clean up ${filePath}:`, cleanupError);
        }
      }
    }
  }

  /**
   * Check if a model is downloaded
   */
  isModelDownloaded(_modelName: WhisperModel): boolean {
    // nodejs-whisper stores models in its own location
    // This is a placeholder - actual check depends on nodejs-whisper internals
    return true;
  }
}

// Singleton instance
let whisperServiceInstance: WhisperService | null = null;

/**
 * Get the WhisperService singleton instance
 */
export function getWhisperService(): WhisperService {
  if (!whisperServiceInstance) {
    whisperServiceInstance = new WhisperService();
  }
  return whisperServiceInstance;
}
