import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTaskStore } from '../store/taskStore';

export const useVoiceTask = (onTranscribed?: (text: string) => void) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const addTask = useTaskStore((state) => state.addTask);

  const cleanup = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync().catch(() => {});
        setRecording(null);
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
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
    if (recording || isStarting || isProcessing || isStopping) {
      console.warn('Recording already active or in process');
      return;
    }

    // Limpieza preventiva antes de iniciar
    await cleanup();

    setIsStarting(true);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Audio recording permission not granted');
        setIsStarting(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
    } catch (err) {
      console.error('Error al iniciar grabación', err);
      await cleanup();
    } finally {
      setIsStarting(false);
    }
  };

  const stopRecordingAndCreateTask = async () => {
    // Proteger contra múltiples llamadas simultáneas
    if (!recording || isProcessing || isStopping || isStarting) {
      console.warn('No active recording or already processing');
      return;
    }

    setIsStopping(true);
    setIsProcessing(true);
    const recordingToStop = recording;
    setRecording(null);

    try {
      // Detener y descargar la grabación
      await recordingToStop.stopAndUnloadAsync();
      
      // Reset audio mode para liberar recursos
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });
      
      // Obtener URI del archivo
      const uri = recordingToStop.getURI();

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
      }

    } catch (error) {
      console.error('Error procesando audio:', error);
      alert('Error al crear tarea por voz. Por favor intenta de nuevo.');
    } finally {
      setIsStopping(false);
      setIsProcessing(false);
    }
  };

  return {
    recording: !!recording,
    isProcessing,
    startRecording,
    stopRecording: stopRecordingAndCreateTask,
    cleanup,
  };
};