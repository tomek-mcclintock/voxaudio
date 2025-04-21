// src/components/AudioRecorder.tsx
'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import { translate } from '@/lib/translations';

export interface AudioRecorderRef {
  stopRecording: () => void;
}

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob | null) => void;
  companyColor?: string; // Prop for company primary color
  language?: string; // Add language prop
  enableGamification?: boolean; // New prop to toggle gamification features
}

const AudioRecorder = forwardRef<AudioRecorderRef, AudioRecorderProps>(
  ({ onRecordingComplete, companyColor = '#657567', language = 'en', enableGamification = true }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [fadingMessage, setFadingMessage] = useState('');
    const [isFading, setIsFading] = useState(false);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout>();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fadeTimeoutRef = useRef<NodeJS.Timeout>();

    // Helper function for translations
    const t = (key: string, replacements: Record<string, string> = {}) => {
      return translate(language, key, replacements);
    };

    // Messages for each progress segment - using proper translations
    const progressMessages = {
      initial: t('form.progressInitial'),
      segment1: t('form.progressSegment1'),
      segment2: t('form.progressSegment2'),
      segment3: t('form.progressSegment3')
    };

    // Function to get current message based on time
    const getCurrentMessage = (time: number) => {
      if (time < 15) return progressMessages.initial;
      if (time < 30) return progressMessages.segment1;
      if (time < 45) return progressMessages.segment2;
      return progressMessages.segment3;
    };

    // Function to get text alignment based on time
    const getMessageAlignment = (time: number) => {
      if (time < 15) return "text-left"; // Left aligned
      if (time < 30) return "text-center"; // Center aligned
      if (time < 45) return "text-right"; // Right aligned
      return "text-center"; // Center aligned for final message
    };

    // Function to get current color based on time
    const getCurrentColor = (time: number) => {
      if (time < 15) return '#ff4d4d'; // Red
      if (time < 30) return '#ff9933'; // Orange
      if (time < 45) return '#ffcc00'; // Yellow
      return '#33cc33'; // Green
    };

    useImperativeHandle(ref, () => ({
      stopRecording: () => {
        if (mediaRecorderRef.current && isRecording) {
          handleStopRecording();
        }
      }
    }));

    // Handle message transitions
    useEffect(() => {
      if (!isRecording || !enableGamification) return;

      // Set up message transitions at milestone points
      // Using threshold approach for decimal values
      if ((recordingTime >= 14.9 && recordingTime < 15.1) || 
          (recordingTime >= 29.9 && recordingTime < 30.1) || 
          (recordingTime >= 44.9 && recordingTime < 45.1)) {
        // Identify which threshold we're crossing
        const milestone = recordingTime < 20 ? 15 : recordingTime < 35 ? 30 : 45;
        
        // Start fade out
        setIsFading(true);
        
        // Store new message
        const newMessage = getCurrentMessage(milestone);
        
        // After fade out, update message and fade in
        fadeTimeoutRef.current = setTimeout(() => {
          setFadingMessage(newMessage);
          setIsFading(false);
        }, 500); // 500ms fade transition
      }
    }, [recordingTime, isRecording, enableGamification]);

    // Set initial message when recording starts
    useEffect(() => {
      if (isRecording && enableGamification) {
        setFadingMessage(progressMessages.initial);
      }
    }, [isRecording, enableGamification]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (fadeTimeoutRef.current) {
          clearTimeout(fadeTimeoutRef.current);
        }
      };
    }, []);

    const drawVisualizer = () => {
      if (!analyserRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / 50;
      const heightMultiplier = canvas.height / 255;
      
      // Use the company color
      ctx.fillStyle = companyColor;
      
      for (let i = 0; i < 50; i++) {
        const value = dataArray[i * 2];
        const height = value * heightMultiplier;
        const x = i * barWidth;
        const y = (canvas.height - height) / 2;
        
        ctx.fillRect(x, y, barWidth - 2, height);
      }

      animationFrameRef.current = requestAnimationFrame(drawVisualizer);
    };

    const startRecording = async () => {
      const recordingId = `recording-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      console.log(`[${recordingId}] Starting audio recording...`);
      
      try {
        console.log(`[${recordingId}] Requesting microphone access...`);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log(`[${recordingId}] Microphone access granted`);
        streamRef.current = stream;
    
        console.log(`[${recordingId}] Setting up audio context and analyzer...`);
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
    
        console.log(`[${recordingId}] Creating MediaRecorder...`);
        const mediaRecorder = new MediaRecorder(stream);
        console.log(`[${recordingId}] MediaRecorder created with mimeType: ${mediaRecorder.mimeType}`);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];
    
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            console.log(`[${recordingId}] Audio chunk received: ${e.data.size} bytes`);
            chunksRef.current.push(e.data);
          } else {
            console.log(`[${recordingId}] Empty audio chunk received`);
          }
        };
    
        mediaRecorder.onstop = () => {
          console.log(`[${recordingId}] MediaRecorder stopped, combining chunks...`);
          console.log(`[${recordingId}] Number of chunks: ${chunksRef.current.length}`);
          let totalSize = 0;
          chunksRef.current.forEach((chunk, i) => {
            totalSize += chunk.size;
            console.log(`[${recordingId}] Chunk ${i+1}: ${chunk.size} bytes, type: ${chunk.type}`);
          });
          
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          console.log(`[${recordingId}] Final audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
          setAudioBlob(audioBlob);
          onRecordingComplete(audioBlob);
        };
    
        console.log(`[${recordingId}] Starting MediaRecorder...`);
        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);
    
        if (enableGamification) {
          setFadingMessage(progressMessages.initial);
        }
        drawVisualizer();
        
        // Use a more frequent interval for smoother updates (100ms)
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= 300) { // 5 minutes limit
              handleStopRecording();
              return prev;
            }
            // Increment by 0.1 seconds for smoother progress
            return prev + 0.1;
          });
        }, 100);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    const handleStopRecording = () => {
      const stopId = `stop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      if (mediaRecorderRef.current) {
        console.log(`[${stopId}] Stopping MediaRecorder...`);
        
        try {
          // Check recording state before stopping
          console.log(`[${stopId}] MediaRecorder state before stopping: ${mediaRecorderRef.current.state}`);
          
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            console.log(`[${stopId}] MediaRecorder stopped successfully`);
          } else {
            console.log(`[${stopId}] MediaRecorder not in recording state, can't stop`);
          }
          
          setIsRecording(false);
          
          if (timerRef.current) {
            clearInterval(timerRef.current);
            console.log(`[${stopId}] Recording timer cleared`);
          }
          
          if (streamRef.current) {
            console.log(`[${stopId}] Stopping all tracks in stream...`);
            streamRef.current.getTracks().forEach(track => {
              console.log(`[${stopId}] Stopping track: ${track.kind}, ID: ${track.id}`);
              track.stop();
            });
            console.log(`[${stopId}] All tracks stopped`);
          }
          
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            console.log(`[${stopId}] Animation frame canceled`);
          }
          
          if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
            console.log(`[${stopId}] Fade timeout cleared`);
          }
        } catch (error) {
          console.error(`[${stopId}] Error during recording stop:`, error);
          if (error instanceof Error) {
            console.error(`[${stopId}] Error name: ${error.name}, message: ${error.message}`);
            console.error(`[${stopId}] Error stack:`, error.stack);
          }
        }
      } else {
        console.log(`[${stopId}] No MediaRecorder to stop`);
      }
    };    

    const discardRecording = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setAudioBlob(null);
      setIsPlaying(false);
      setRecordingTime(0);
      onRecordingComplete(null);
    };

    const togglePlayback = () => {
      if (!audioBlob) return;

      if (!audioRef.current) {
        audioRef.current = new Audio(URL.createObjectURL(audioBlob));
        audioRef.current.onended = () => setIsPlaying(false);
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress bar segments - with smoother decimal-based progress
    const getSegmentWidth = (segmentIndex: number) => {
      const segmentDuration = 15; // Each segment is 15 seconds
      const startTime = segmentIndex * segmentDuration;
      const endTime = startTime + segmentDuration;
      
      if (recordingTime <= startTime) return 0;
      if (recordingTime >= endTime) return 100;
      
      // Calculate percentage filled within this segment - with decimal precision
      return ((recordingTime - startTime) / segmentDuration) * 100;
    };

    // Determine color for each segment
    const getSegmentColor = () => {
      if (recordingTime >= 45) return '#33cc33'; // Green after 45s
      if (recordingTime >= 30) return '#ffcc00'; // Yellow after 30s
      if (recordingTime >= 15) return '#ff9933'; // Orange after 15s
      return '#ff4d4d'; // Red for first 15s
    };

    return (
      <div className="flex flex-col items-center gap-4">
        {/* Recording Visualization - reduced height */}
        <div className="w-full h-16 bg-gray-50 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={500}
            height={64}
            className="w-full h-full"
          />
        </div>
        
        {/* Segmented Progress Bar - only shown if gamification is enabled */}
        {enableGamification && (
          <div className="w-full space-y-1">
            {/* Progress bars */}
            <div className="w-full flex space-x-1">
              {[0, 1, 2].map((segment) => (
                <div 
                  key={segment} 
                  className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden"
                >
                  <div 
                    className="h-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${getSegmentWidth(segment)}%`,
                      backgroundColor: getSegmentColor()
                    }}
                  />
                </div>
              ))}
            </div>
            
            {/* Progress Message */}
            {isRecording && (
              <div 
                className={`text-sm font-bold w-full transition-opacity duration-500 ease-in-out ${getMessageAlignment(recordingTime)} ${isFading ? 'opacity-0' : 'opacity-100'}`}
                style={{ color: getCurrentColor(recordingTime) }}
              >
                {fadingMessage}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          {!isRecording && !audioBlob ? (
            <button
              onClick={startRecording}
              className="p-4 rounded-full transition-colors duration-200"
              style={{ backgroundColor: companyColor }}
              aria-label="Start recording"
            >
              <Mic className="w-8 h-8 text-white" />
            </button>
          ) : isRecording ? (
            <button
              onClick={handleStopRecording}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors duration-200"
              aria-label="Stop recording"
            >
              <Square className="w-8 h-8 text-white" />
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={togglePlayback}
                className="p-4 rounded-full transition-colors duration-200"
                style={{ backgroundColor: companyColor }}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" />
                ) : (
                  <Play className="w-8 h-8 text-white" />
                )}
              </button>
              <button
                onClick={discardRecording}
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors duration-200"
                aria-label="Discard recording"
              >
                <Trash2 className="w-8 h-8 text-white" />
              </button>
            </div>
          )}

          {/* Timer */}
          <div className="font-manrope text-lg">
            {formatTime(recordingTime)}
          </div>
        </div>

        {/* Status Text */}
        <div className="text-sm text-gray-600 font-manrope">
          {isRecording ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {t('form.recording')}
            </span>
          ) : audioBlob ? (
            t('form.recordingComplete')
          ) : (
            t('form.clickMicrophoneStart')
          )}
        </div>
      </div>
    );
  }
);

AudioRecorder.displayName = 'AudioRecorder';

export default AudioRecorder;