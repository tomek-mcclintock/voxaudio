// src/components/AudioRecorder.tsx
'use client';

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Mic, Square, Play, Pause } from 'lucide-react';

// Ruggable brand colors
const BRAND = {
  primary: '#657567',
  cta: '#934b32',
  ctaHover: '#833f2a',
} as const;

export interface AudioRecorderRef {
  stopRecording: () => void;
}

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob | null) => void;
}

const AudioRecorder = forwardRef<AudioRecorderRef, AudioRecorderProps>(
  ({ onRecordingComplete }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [analyserData, setAnalyserData] = useState<number[]>(new Array(50).fill(0));
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout>();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useImperativeHandle(ref, () => ({
      stopRecording: () => {
        if (mediaRecorderRef.current && isRecording) {
          handleStopRecording();
        }
      }
    }));

    // Setup audio context and analyser
    useEffect(() => {
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
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

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw visualization
      const barWidth = canvas.width / 50;
      const heightMultiplier = canvas.height / 255;
      
      ctx.fillStyle = BRAND.primary;
      
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

        // Set up audio context and analyser
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
      }
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

    return (
      <div className="flex flex-col items-center gap-6">
        {/* Recording Visualization */}
        <div className="w-full h-24 bg-gray-50 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={500}
            height={96}
            className="w-full h-full"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {!isRecording && !audioBlob ? (
            <button
              onClick={startRecording}
              className={`p-4 rounded-full bg-[${BRAND.cta}] hover:bg-[${BRAND.ctaHover}] 
                         transition-colors duration-200 text-white`}
              aria-label="Start recording"
            >
              <Mic className="w-8 h-8" />
            </button>
          ) : isRecording ? (
            <button
              onClick={handleStopRecording}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 
                       transition-colors duration-200 text-white"
              aria-label="Stop recording"
            >
              <Square className="w-8 h-8" />
            </button>
          ) : (
            <button
              onClick={togglePlayback}
              className={`p-4 rounded-full bg-[${BRAND.primary}] hover:opacity-90
                         transition-colors duration-200 text-white`}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8" />
              )}
            </button>
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
              Recording...
            </span>
          ) : audioBlob ? (
            "Recording complete. Click play to review."
          ) : (
            "Click the microphone to start recording"
          )}
        </div>
      </div>
    );
  }
);

AudioRecorder.displayName = 'AudioRecorder';

export default AudioRecorder;