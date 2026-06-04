import { useAuth } from "@/src/contexts/AuthContext";
import { createRoutine } from "@/src/lib/routineService";
import { EggId, useEggStore } from "@/src/store/eggStore";
import { useRoutinesRefreshStore } from "@/src/store/routinesRefreshStore";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import EggPickerSlide from "./EggPickerSlide";
import PetsPreviewSlide from "./PetsPreviewSlide";
import RoutinePickerSlide, { ALL_DAYS } from "./RoutinePickerSlide";

/**
 * OnboardingRoutineWithEggFlow
 *
 * Muestra primero la selección de rutina, luego la de huevo,
 * y asocia ambos como si se hubiera hecho desde la pantalla principal.
 */
interface OnboardingRoutineWithEggFlowProps {
  onDone: () => void;
  answers?: any;
  onAnswer?: any;
}

export default function OnboardingRoutineWithEggFlow({
  onDone,
  answers,
  onAnswer,
}: OnboardingRoutineWithEggFlowProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [step, setStep] = useState<"routine" | "pets" | "egg">("routine");
  const [createdRoutineId, setCreatedRoutineId] = useState<string | null>(null);
  const lastRoutineRef = useRef<{
    id: string;
    label: string;
    emoji: string;
    icon: string;
    tasks: string[];
  } | null>(null);

  // Paso 1: Selección de rutina
  const handleRoutineNext = async (preset: any) => {
    if (!user?.id || !preset) return;
    // Creamos la rutina
    const routine = await createRoutine(user.id, {
      name: `${preset.emoji} ${t(preset.label)}`,
      days: ALL_DAYS,
      tasks: preset.tasks.map((title: string, index: number) => ({
        title: t(title),
        position: index,
      })),
      icon: preset.icon,
      reminderEnabled: false,
    });
    if (routine && routine.id) {
      setCreatedRoutineId(routine.id);
      lastRoutineRef.current = preset;
      setStep("pets");
      useRoutinesRefreshStore.getState().bump();
    }
  };

  const handlePetsNext = () => {
    setStep("egg");
  };

  // Paso 2: Selección de huevo
  const handleEggNext = (eggId: EggId) => {
    if (createdRoutineId && eggId) {
      useEggStore.getState().assignEggToRoutine(eggId, createdRoutineId);
    }
    onDone();
  };

  if (step === "routine") {
    return (
      <RoutinePickerSlide
        onNext={handleRoutineNext}
        requireSelection
        skipCreateRoutine
      />
    );
  }
  if (step === "pets") {
    return <PetsPreviewSlide onNext={handlePetsNext} />;
  }
  if (step === "egg") {
    return <EggPickerSlide onNext={handleEggNext} />;
  }
  return null;
}
