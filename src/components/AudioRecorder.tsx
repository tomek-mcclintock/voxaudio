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
}

const AudioRecorder = forwardRef<AudioRecorderRef, AudioRecorderProps>(
  ({ onRecordingComplete, companyColor = '#657567', language = 'en' }, ref) => {
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

    // Messages for each progress segment
    const progressMessages = {
      initial: "The best feedback is >45s",
      segment1: "Great start, you're on a roll!",
      segment2: "Keep going, you're getting close!",
      segment3: "Perfect length achieved! Feel free to add any final thoughts."
    };

    // Function to get current message based on time
    const getCurrentMessage = (time: number) => {
      if (time < 15) return progressMessages.initial;
      if (time < 30) return progressMessages.segment1;
      if (time < 45) return progressMessages.segment2;
      return progressMessages.segment3;
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
      if (!isRecording) return;

      // Set up message transitions at milestone points
      if (recordingTime === 15 || recordingTime === 30 || recordingTime === 45) {
        // Start fade out
        setIsFading(true);
        
        // Store new message
        const newMessage = getCurrentMessage(recordingTime);
        
        // After fade out, update message and fade in
        fadeTimeoutRef.current = setTimeout(() => {
          setFadingMessage(newMessage);
          setIsFading(false);
        }, 500); // 500ms fade transition
      }
    }, [recordingTime, isRecording]);

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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setAudioBlob(audioBlob);
          onRecordingComplete(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);
        setFadingMessage(progressMessages.initial);
        drawVisualizer();
        
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= 300) { // 5 minutes limit
              handleStopRecording();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    const handleStopRecording = () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (fadeTimeoutRef.current) {
          clearTimeout(fadeTimeoutRef.current);
        }
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
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress bar segments
    const getSegmentWidth = (segmentIndex: number) => {
      const segmentDuration = 15; // Each segment is 15 seconds
      const startTime = segmentIndex * segmentDuration;
      const endTime = startTime + segmentDuration;
      
      if (recordingTime <= startTime) return 0;
      if (recordingTime >= endTime) return 100;
      
      // Calculate percentage filled within this segment
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

        {/* Segmented Progress Bar */}
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
        <div 
          className={`text-sm transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
          style={{ color: getCurrentColor(recordingTime) }}
        >
          {fadingMessage}
        </div>

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
