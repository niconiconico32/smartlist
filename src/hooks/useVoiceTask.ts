import { useAudioRecorder, setAudioModeAsync, requestRecordingPermissionsAsync, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTaskStore } from '../store/taskStore';

export const useVoiceTask = (onTranscribed?: (text: string) => void) => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const addTask = useTaskStore((state) => state.addTask);

  const cleanup = async () => {
    try {
      if (isRecording) {
        await recorder.stop().catch(() => {});
        setIsRecording(false);
      }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      }).catch(() => {});
      setIsStarting(false);
      setIsStopping(false);
      setIsProcessing(false);
    } catch (err) {
      console.error('Error en cleanup:', err);
    }
  };

  const startRecording = async () => {
    // Evitar iniciar múltiples grabaciones simultáneamente
    if (isRecording || isStarting || isProcessing || isStopping) {
      console.warn('Recording already active or in process');
      return;
    }

    // Limpieza preventiva antes de iniciar
    await cleanup();

    setIsStarting(true);
    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Audio recording permission not granted');
        setIsStarting(false);
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      recorder.record();
      setIsRecording(true);
    } catch (err) {
      console.error('Error al iniciar grabación', err);
      await cleanup();
    } finally {
      setIsStarting(false);
    }
  };

  const stopRecordingAndCreateTask = async () => {
    // Proteger contra múltiples llamadas simultáneas
    if (!isRecording || isProcessing || isStopping || isStarting) {
      console.warn('No active recording or already processing');
      return;
    }

    setIsStopping(true);
    setIsProcessing(true);
    setIsRecording(false);

    try {
      // Detener la grabación
      await recorder.stop();
      
      // Reset audio mode para liberar recursos
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      });
      
      // Obtener URI del archivo
      const uri = recorder.uri;

      if (!uri) {
        console.error('No audio URI found');
        return;
      }

      // 1. Leer el archivo de audio y convertir a base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // 2. Invocar Edge Function con audio en base64
      const { data, error } = await supabase.functions.invoke('transcribe-task', {
        body: {
          audio: base64,
          filename: 'recording.m4a',
        },
      });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // 3. Si hay callback, llamarlo con la transcripción completa
      if (data?.task) {
        if (onTranscribed) {
          onTranscribed(data.originalText || data.task.title);
        } else {
          addTask({
            title: data.task.title,
            duration: data.task.duration,
            completed: false,
          });
        }
      } else {
        console.warn('No task data returned from transcription');
        if (onTranscribed) onTranscribed('');
      }

    } catch (error) {
      console.error('Error procesando audio:', error);
      if (onTranscribed) {
        onTranscribed('');
      } else {
        alert('Error al crear tarea por voz. Por favor intenta de nuevo.');
      }
    } finally {
      setIsStopping(false);
      setIsProcessing(false);
    }
  };

  return {
    recording: isRecording,
    isProcessing,
    startRecording,
    stopRecording: stopRecordingAndCreateTask,
    cleanup,
  };
};