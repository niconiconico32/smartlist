import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

// ============================================
// SOUNDS WRAPPER
// Capa única para efectos de sonido con expo-audio.
// Respeta: soundEnabled (AsyncStorage, default true)
// y el modo silencio de iOS (playsInSilentMode: false).
// ============================================

const SOUND_ENABLED_KEY = "@smartlist/sound_enabled";

let soundEnabled = true;
let loaded: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  if (!loaded) {
    loaded = AsyncStorage.getItem(SOUND_ENABLED_KEY)
      .then((value) => {
        soundEnabled = value === null ? true : value === "true";
      })
      .catch(() => {});
  }
  return loaded;
}

/** Lee si el sonido está habilitado (cargado de AsyncStorage). */
export const getSoundEnabled = async (): Promise<boolean> => {
  await ensureLoaded();
  return soundEnabled;
};

/** Activa/desactiva todos los sonidos. Persistido en AsyncStorage. */
export const setSoundEnabled = async (enabled: boolean): Promise<void> => {
  soundEnabled = enabled;
  try {
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  } catch {}
};

// AudioPlayer por asset: se crea una vez y se reutiliza.
const players: Record<string, ReturnType<typeof createAudioPlayer>> = {};

function getPlayer(name: string, source: Parameters<typeof createAudioPlayer>[0]) {
  if (!players[name]) {
    players[name] = createAudioPlayer(source, { updateInterval: 100 });
    players[name].volume = 1;
  }
  return players[name];
}

async function play(name: string, source: Parameters<typeof createAudioPlayer>[0], volume = 1) {
  await ensureLoaded();
  if (!soundEnabled) return;
  try {
    const player = getPlayer(name, source);
    player.volume = volume;
    if (player.playing) {
      await player.seekTo(0);
    }
    player.play();
  } catch {}
}

// Asegura que el audio respete el switch de silencio (iOS) una sola vez.
let audioModeConfigured = false;
async function ensureAudioMode() {
  if (audioModeConfigured) return;
  audioModeConfigured = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: false });
  } catch {}
}

/** Tick corto: selección de opciones, feedback ligero. */
export const playTick = () => {
  ensureAudioMode();
  play("tick", require("@/assets/sounds/tick.wav"), 0.9);
};

/** Whoosh: transición entre pantallas / revelados. */
export const playWhoosh = () => {
  ensureAudioMode();
  play("whoosh", require("@/assets/sounds/whoosh.wav"), 0.8);
};

/** Chime de éxito: logros, reveal de mascota, finalización. */
export const playSuccessChime = () => {
  ensureAudioMode();
  play("success-chime", require("@/assets/sounds/success-chime.wav"), 0.9);
};
