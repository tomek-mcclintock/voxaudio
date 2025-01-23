'use client';

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Mic, Square, Pause, Play } from 'lucide-react';

export interface AudioRecorderRef {
  stopRecording: () => void;
}

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob | null) => void;
}

const AudioRecorder = forwardRef<AudioRecorderRef, AudioRecorderProps>(
  ({ onRecordingComplete }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout>();
    const streamRef = useRef<MediaStream | null>(null);

    useImperativeHandle(ref, () => ({
      stopRecording: () => {
        if (mediaRecorderRef.current && isRecording) {
          handleStopRecording();
        }
      }
    }));

    const handleStopRecording = () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsPaused(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }
    };

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
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
          onRecordingComplete(audioBlob);
          setRecordingTime(0);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setIsPaused(false);
        
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

    const togglePause = () => {
      if (mediaRecorderRef.current) {
        if (isPaused) {
          mediaRecorderRef.current.resume();
          setIsPaused(false);
          timerRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
          }, 1000);
        } else {
          mediaRecorderRef.current.pause();
          setIsPaused(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        }
      }
    };

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="p-4 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors"
              aria-label="Start recording"
            >
              <Mic className="w-8 h-8 text-white" />
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className="p-4 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
                aria-label={isPaused ? "Resume recording" : "Pause recording"}
              >
                {isPaused ? (
                  <Play className="w-8 h-8 text-white" />
                ) : (
                  <Pause className="w-8 h-8 text-white" />
                )}
              </button>
              <button
                onClick={handleStopRecording}
                className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                aria-label="Stop recording"
              >
                <Square className="w-8 h-8 text-white" />
              </button>
            </>
          )}
        </div>
        {(isRecording || recordingTime > 0) && (
          <div className="text-sm text-gray-600">
            {isRecording ? (
              isPaused ? "Paused: " : "Recording: "
            ) : (
              "Recorded: "
            )}
            {formatTime(recordingTime)}
          </div>
        )}
      </div>
    );
  }
);

AudioRecorder.displayName = 'AudioRecorder';

export default AudioRecorder;