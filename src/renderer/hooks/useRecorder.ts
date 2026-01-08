/**
 * useRecorder Hook - Audio Recording with Whisper Transcription
 * 
 * Implements Requirements 5.1-5.11:
 * - Request microphone access via getUserMedia
 * - Create MediaRecorder and accumulate chunks
 * - Manage isRecording state
 * - Combine chunks into WAV blob on stop
 * - Convert to ArrayBuffer and send via IPC
 * - Handle NotAllowedError and NotFoundError
 */

import { useState, useRef, useCallback } from 'react';

export interface UseRecorderResult {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
}

export function useRecorder(): UseRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Start recording audio from the microphone
   * Requirement 5.2: Request microphone access via getUserMedia
   * Requirement 5.3: Create MediaRecorder instance
   * Requirement 5.4: Store audio chunks via ondataavailable
   * Requirement 5.5: Set isRecording to true
   */
  const startRecording = useCallback(async () => {
    setError(null);
    audioChunksRef.current = [];

    try {
      // Requirement 5.2: Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Whisper prefers 16kHz
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      streamRef.current = stream;

      // Requirement 5.3: Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Requirement 5.4: Accumulate chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Recorder] MediaRecorder error:', event);
        setError('Recording error occurred');
        setIsRecording(false);
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      
      // Requirement 5.5: Set isRecording to true
      setIsRecording(true);
      console.log('[Recorder] Recording started');

    } catch (err) {
      console.error('[Recorder] Failed to start recording:', err);
      
      // Requirement 5.10: Handle NotAllowedError
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied');
        throw new Error('Microphone access denied');
      }
      
      // Requirement 5.11: Handle NotFoundError
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No microphone found');
        throw new Error('No microphone found');
      }
      
      setError('Failed to access microphone');
      throw err;
    }
  }, []);

  /**
   * Stop recording and transcribe the audio
   * Requirement 5.6: Call mediaRecorder.stop()
   * Requirement 5.7: Combine chunks into Blob
   * Requirement 5.8: Convert to ArrayBuffer and send via IPC
   * Requirement 5.9: Return transcribed text and set isRecording to false
   */
  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const mediaRecorder = mediaRecorderRef.current;
      
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false);
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorder.onstop = async () => {
        console.log('[Recorder] Recording stopped, processing audio...');
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Requirement 5.7: Combine chunks into Blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log(`[Recorder] Audio blob size: ${audioBlob.size} bytes`);

        if (audioBlob.size === 0) {
          setIsRecording(false);
          setError('No audio recorded');
          reject(new Error('No audio recorded'));
          return;
        }

        setIsTranscribing(true);

        try {
          // Requirement 5.8: Convert to ArrayBuffer
          const arrayBuffer = await audioBlob.arrayBuffer();
          console.log(`[Recorder] Sending ${arrayBuffer.byteLength} bytes for transcription`);

          // Send to Whisper service via IPC
          const transcribedText = await window.api.transcription.transcribe(arrayBuffer);
          
          console.log(`[Recorder] Transcription result: "${transcribedText}"`);
          
          // Requirement 5.9: Set isRecording to false and return text
          setIsRecording(false);
          setIsTranscribing(false);
          resolve(transcribedText);

        } catch (err) {
          console.error('[Recorder] Transcription failed:', err);
          setIsRecording(false);
          setIsTranscribing(false);
          setError('Transcription failed');
          reject(err);
        }
      };

      // Requirement 5.6: Stop the MediaRecorder
      mediaRecorder.stop();
    });
  }, []);

  return {
    isRecording,
    isTranscribing,
    error,
    startRecording,
    stopRecording,
  };
}
