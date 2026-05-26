import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getLocalDateKey } from "@/src/utils/dateHelpers";

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "@smartlist_egg_store";
export const EGG_MAX_XP = 3;
export const RARE_EGG_COST = 1500;
export const LEGENDARY_EGG_COST = 5000;

// ─── Rarity ──────────────────────────────────────────────────────────────────

export type EggRarity = "common" | "rare" | "legendary";

// ─── Egg catalog ─────────────────────────────────────────────────────────────
// Images: only egg1.png and egg2.png exist for now — new assets will replace
// the placeholders as they are added.

// ── Egg sprites ──────────────────────────────────────────────────────────────
const _img1  = require("@/assets/images/pets/eggs/egg1.png");
const _img2  = require("@/assets/images/pets/eggs/egg2.png");
const _img3  = require("@/assets/images/pets/eggs/egg3.png");
const _img4  = require("@/assets/images/pets/eggs/egg4.png");
const _img5  = require("@/assets/images/pets/eggs/egg5.png");
const _img6  = require("@/assets/images/pets/eggs/egg6.png");
const _img7  = require("@/assets/images/pets/eggs/egg7.png");
const _img8  = require("@/assets/images/pets/eggs/egg8.png");
const _img9  = require("@/assets/images/pets/eggs/egg9.png");
const _img10 = require("@/assets/images/pets/eggs/egg10.png");
const _img11 = require("@/assets/images/pets/eggs/egg11.png");
const _img12 = require("@/assets/images/pets/eggs/egg12.png");
const _img13 = require("@/assets/images/pets/eggs/egg13.png");
const _img14 = require("@/assets/images/pets/eggs/egg14.png");
const _img15 = require("@/assets/images/pets/eggs/egg15.png");
const _img16 = require("@/assets/images/pets/eggs/egg16.png");
const _img17 = require("@/assets/images/pets/eggs/egg17.png");
const _img18 = require("@/assets/images/pets/eggs/egg18.png");

// ── Pet sprites (evolved form — one per egg, same numeric id) ────────────────
const _pet1  = require("@/assets/images/pets/pets/pet1.png");
const _pet2  = require("@/assets/images/pets/pets/pet2.png");
const _pet3  = require("@/assets/images/pets/pets/pet3.png");
const _pet4  = require("@/assets/images/pets/pets/pet4.png");
const _pet5  = require("@/assets/images/pets/pets/pet5.png");
const _pet6  = require("@/assets/images/pets/pets/pet6.png");
const _pet7  = require("@/assets/images/pets/pets/pet7.png");
const _pet8  = require("@/assets/images/pets/pets/pet8.png");
const _pet9  = require("@/assets/images/pets/pets/pet9.png");
const _pet10 = require("@/assets/images/pets/pets/pet10.png");
const _pet11 = require("@/assets/images/pets/pets/pet11.png");
const _pet12 = require("@/assets/images/pets/pets/pet12.png");
// pet13.png is missing — using pet1 as placeholder until the asset arrives
const _pet13 = require("@/assets/images/pets/pets/pet1.png");
const _pet14 = require("@/assets/images/pets/pets/pet14.png");
const _pet15 = require("@/assets/images/pets/pets/pet15.png");
const _pet16 = require("@/assets/images/pets/pets/pet16.png");
const _pet17 = require("@/assets/images/pets/pets/pet17.png");
const _pet18 = require("@/assets/images/pets/pets/pet18.png");

export const EGG_METADATA = [
  // ── Common (8) — free, unlocked by default ────────────────────────────────
  { id: 1,  name: "Terra Egg",   rarity: "common"    as EggRarity, cost: 0,    image: _img1,  petImage: _pet1  },
  { id: 2,  name: "Aqua Egg",    rarity: "common"    as EggRarity, cost: 0,    image: _img2,  petImage: _pet2  },
  { id: 3,  name: "Flame Egg",   rarity: "common"    as EggRarity, cost: 0,    image: _img3,  petImage: _pet3  },
  { id: 4,  name: "Storm Egg",   rarity: "common"    as EggRarity, cost: 0,    image: _img4,  petImage: _pet4  },
  { id: 5,  name: "Leaf Egg",    rarity: "common"    as EggRarity, cost: 0,    image: _img5,  petImage: _pet5  },
  { id: 6,  name: "Stone Egg",   rarity: "common"    as EggRarity, cost: 0,    image: _img6,  petImage: _pet6  },
  { id: 7,  name: "Crystal Egg", rarity: "common"    as EggRarity, cost: 0,    image: _img7,  petImage: _pet7  },
  { id: 8,  name: "Shadow Egg",  rarity: "common"    as EggRarity, cost: 0,    image: _img8,  petImage: _pet8  },
  // ── Rare (6) — 1 500 / 5 000 crowns ─────────────────────────────────────
  { id: 9,  name: "Frost Egg",   rarity: "rare"      as EggRarity, cost: 1500, image: _img9,  petImage: _pet9  },
  { id: 10, name: "Ember Egg",   rarity: "rare"      as EggRarity, cost: 1500, image: _img10, petImage: _pet10 },
  { id: 11, name: "Tide Egg",    rarity: "rare"      as EggRarity, cost: 1500, image: _img11, petImage: _pet11 },
  { id: 12, name: "Tempest Egg", rarity: "rare"      as EggRarity, cost: 1500, image: _img12, petImage: _pet12 },
  { id: 13, name: "Bloom Egg",   rarity: "rare"      as EggRarity, cost: 1500, image: _img13, petImage: _pet13 },
  { id: 14, name: "Dragon Egg",  rarity: "rare"      as EggRarity, cost: 5000, image: _img14, petImage: _pet14 },
  // ── Legendary (4) — 5 000 crowns ──────────────────────────────────────────
  { id: 15, name: "Phoenix Egg", rarity: "legendary" as EggRarity, cost: 5000, image: _img15, petImage: _pet15 },
  { id: 16, name: "Cosmos Egg",  rarity: "legendary" as EggRarity, cost: 5000, image: _img16, petImage: _pet16 },
  { id: 17, name: "Snow Egg",    rarity: "legendary" as EggRarity, cost: 5000, image: _img17, petImage: _pet17 },
  { id: 18, name: "Void Egg",    rarity: "legendary" as EggRarity, cost: 5000, image: _img18, petImage: _pet18 },
] as const;

export type EggId = (typeof EGG_METADATA)[number]["id"];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EggData {
  id: EggId;
  /** Current XP (0–EGG_MAX_XP). */
  xp: number;
  /** Routine this egg is linked to, or null when free. */
  routineId: string | null;
  /**
   * "YYYY-MM-DD" of the last day XP was awarded.
   * Persists across freeEgg to prevent same-day double-counting on re-assignment.
   */
  lastXpDate: string | null;
  /** Common eggs start unlocked; rare/legendary require purchase. */
  unlocked: boolean;
  /** Whether the user has manually triggered egg → pet evolution. */
  evolved: boolean;
  /** Cumulative XP earned after evolution (10 per day completion). */
  petXp: number;
  /** Current pet level (0 = egg, 1+ = pet). Incremented by user via chest claim. */
  petLevel: number;
}

interface EggStore {
  eggs: EggData[];

  /** Link an egg to a routine at creation time. */
  assignEggToRoutine: (eggId: EggId, routineId: string) => void;

  /**
   * Free the egg linked to this routine (called on routine deletion).
   * XP and lastXpDate are preserved — only routineId is cleared.
   */
  freeEgg: (routineId: string) => void;

  /**
   * Award 1 XP to the egg linked to this routine.
   * No-op if already awarded today or egg is at max XP.
   */
  recordRoutineXp: (routineId: string) => void;

  /** Mark an egg as unlocked after a successful purchase. */
  unlockEgg: (eggId: EggId) => void;

  /** Returns the EggData for the given routine, or null if none assigned. */
  getEggForRoutine: (routineId: string) => EggData | null;

  /** Returns all unlocked eggs that are not currently linked to any routine. */
  getAvailableEggs: () => EggData[];

  /**
   * Migration for existing users: assigns a free common egg to every routine
   * that does not yet have one. Idempotent — already-assigned routines are
   * skipped. Called once after routines are loaded from the backend.
   */
  migrateEggsForRoutines: (routineIds: string[]) => void;
  /** Permanently evolve the egg linked to this routine (egg → pet). */
  evolveEgg: (routineId: string) => void;
  /**
   * Claim a level-up reward for the pet linked to this routine.
   * Increments petLevel. Caller is responsible for awarding coins.
   * No-op if petXp has not reached the next level threshold.
   */
  claimPetLevelUp: (routineId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayStr = () => getLocalDateKey(new Date());

const buildInitialEggs = (): EggData[] =>
  EGG_METADATA.map(({ id, rarity }) => ({
    id,
    xp: 0,
    routineId: null,
    lastXpDate: null,
    unlocked: rarity === "common",
    evolved: false,
    petXp: 0,
    petLevel: 0,
  }));

// ─── Store ───────────────────────────────────────────────────────────────────

export const useEggStore = create<EggStore>()(
  persist(
    (set, get) => ({
      eggs: buildInitialEggs(),

      assignEggToRoutine: (eggId, routineId) =>
        set((state) => ({
          eggs: state.eggs.map((e) =>
            e.id === eggId ? { ...e, routineId } : e,
          ),
        })),

      freeEgg: (routineId) =>
        set((state) => ({
          eggs: state.eggs.map((e) =>
            e.routineId === routineId
              ? { ...e, routineId: null, lastXpDate: null }
              : e,
          ),
        })),

      recordRoutineXp: (routineId) => {
        const today = todayStr();
        set((state) => ({
          eggs: state.eggs.map((e) => {
            if (e.routineId !== routineId) return e;
            if (e.lastXpDate === today) return e;
            if (e.evolved) {
              // Post-evolution: award 10 petXp per day (uncapped)
              return { ...e, petXp: e.petXp + 10, lastXpDate: today };
            }
            // Pre-evolution: fill hatching nodes (max EGG_MAX_XP)
            if (e.xp >= EGG_MAX_XP) return e;
            return { ...e, xp: e.xp + 1, lastXpDate: today };
          }),
        }));
      },

      unlockEgg: (eggId) =>
        set((state) => ({
          eggs: state.eggs.map((e) =>
            e.id === eggId ? { ...e, unlocked: true } : e,
          ),
        })),

      getEggForRoutine: (routineId) =>
        get().eggs.find((e) => e.routineId === routineId) ?? null,

      getAvailableEggs: () =>
        get().eggs.filter((e) => e.unlocked && e.routineId === null),

      migrateEggsForRoutines: (routineIds) => {
        const { eggs } = get();

        // Routines that already have an egg
        const assignedRoutineIds = new Set(
          eggs.filter((e) => e.routineId !== null).map((e) => e.routineId!),
        );

        const unassigned = routineIds.filter(
          (id) => !assignedRoutineIds.has(id),
        );
        if (unassigned.length === 0) return;

        // Work on a mutable copy so we can track which eggs we've already used
        const updatedEggs = eggs.map((e) => ({ ...e }));

        for (const routineId of unassigned) {
          // Pick the first free, unlocked, common egg
          const freeEgg = updatedEggs.find((e) => {
            const meta = EGG_METADATA.find((m) => m.id === e.id);
            return (
              e.unlocked && e.routineId === null && meta?.rarity === "common"
            );
          });
          if (!freeEgg) break; // No more free common eggs available
          freeEgg.routineId = routineId;
        }

        set({ eggs: updatedEggs });
      },

      evolveEgg: (routineId) =>
        set((state) => ({
          eggs: state.eggs.map((e) =>
            e.routineId === routineId
              ? { ...e, evolved: true, petLevel: 1 }
              : e,
          ),
        })),

      claimPetLevelUp: (routineId) =>
        set((state) => ({
          eggs: state.eggs.map((e) => {
            if (e.routineId !== routineId || !e.evolved) return e;
            const threshold = e.petLevel * 30;
            if (e.petXp < threshold) return e; // not enough XP yet
            return { ...e, petLevel: e.petLevel + 1 };
          }),
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          // v0 had only 2 eggs without unlocked/rarity — rebuild the full catalog.
          return { eggs: buildInitialEggs() };
        }
        if (version < 2) {
          // v1 → v2: add evolved field.
          // Infer from xp so users who had maxed eggs keep their pet image.
          return {
            eggs: (persistedState as { eggs: EggData[] }).eggs.map((e) => ({
              ...e,
              evolved: (e as any).xp >= EGG_MAX_XP,
            })),
          };
        }
        if (version < 3) {
          // v2 → v3: add petXp and petLevel fields.
          return {
            eggs: (persistedState as { eggs: EggData[] }).eggs.map((e) => ({
              ...e,
              petXp: 0,
              petLevel: (e as any).evolved ? 1 : 0,
            })),
          };
        }
        return persistedState as { eggs: EggData[] };
      },
    },
  ),
);
