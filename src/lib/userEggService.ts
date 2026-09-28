import AsyncStorage from "@react-native-async-storage/async-storage";
import { EGG_METADATA, EggData, useEggStore } from "@/src/store/eggStore";
import { supabase } from "@/src/lib/supabase";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIGRATION_KEY = "@smartlist_egg_store_cloud_migrated_v1";
const SYNC_DEBOUNCE_MS = 2500;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserEggRow {
  egg_id: number;
  routine_id: string | null;
  unlocked: boolean;
  xp: number;
  evolved: boolean;
  pet_xp: number;
  pet_level: number;
  last_xp_date: string | null;
}

// ─── Module state ─────────────────────────────────────────────────────────────

let armed = false;
let isApplyingRemote = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSyncUser: string | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBaseEggs(): EggData[] {
  return EGG_METADATA.map(({ id, rarity }) => ({
    id,
    xp: 0,
    routineId: null,
    lastXpDate: null,
    unlocked: rarity === "common",
    evolved: false,
    petXp: 0,
    petLevel: 0,
  }));
}

/**
 * Push the whole local egg store up as rows. `nickname` is intentionally
 * omitted so a local push never wipes a nickname set elsewhere.
 */
async function pushEggsToCloud(userId: string): Promise<void> {
  const rows = useEggStore.getState().eggs.map((e) => ({
    user_id: userId,
    egg_id: e.id,
    routine_id: e.routineId,
    unlocked: e.unlocked,
    xp: e.xp,
    evolved: e.evolved,
    pet_xp: e.petXp,
    pet_level: e.petLevel,
    last_xp_date: e.lastXpDate,
  }));

  const { error } = await supabase
    .from("user_eggs")
    .upsert(rows, { onConflict: "user_id,egg_id" });

  if (error) {
    console.error("user_eggs push error:", error.message);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Cloud → local sync (remote-first), plus a one-time local → cloud migration
 * when the cloud is still empty.
 *
 *   - remote has rows  -> replace the local store with the remote state
 *   - remote is empty  -> push the local store up once (migration), keep local
 *
 * After this completes the store is "armed": any subsequent egg mutation is
 * debounce-pushed to the cloud.
 */
export async function syncEggsWithCloud(userId: string): Promise<void> {
  if (isApplyingRemote) return;

  try {
    const { data, error } = await supabase
      .from("user_eggs")
      .select(
        "egg_id, routine_id, unlocked, xp, evolved, pet_xp, pet_level, last_xp_date",
      )
      .eq("user_id", userId);

    if (error) {
      console.error("user_eggs fetch error:", error.message);
      return;
    }

    const rows = (data ?? []) as UserEggRow[];

    if (rows.length === 0) {
      // One-time local → cloud migration for existing users.
      const alreadyMigrated = (await AsyncStorage.getItem(MIGRATION_KEY)) === "true";
      if (!alreadyMigrated) {
        await pushEggsToCloud(userId);
        await AsyncStorage.setItem(MIGRATION_KEY, "true");
      }
      armed = true;
      return;
    }

    // Remote-first hydration (do not echo the applied state back while applying).
    isApplyingRemote = true;
    try {
      const base = buildBaseEggs();
      for (const row of rows) {
        const egg = base.find((b) => b.id === row.egg_id);
        if (!egg) continue;
        egg.unlocked = row.unlocked;
        egg.xp = row.xp;
        egg.routineId = row.routine_id;
        egg.evolved = row.evolved;
        egg.petXp = row.pet_xp;
        egg.petLevel = row.pet_level;
        egg.lastXpDate = row.last_xp_date;
      }
      useEggStore.setState({ eggs: base });
    } finally {
      isApplyingRemote = false;
    }

    armed = true;
  } catch (e) {
    console.error("syncEggsWithCloud error:", e);
  }
}

/**
 * Debounced push of local egg mutations (evolve, XP, unlock, assign, free…).
 */
export function scheduleEggSync(userId: string): void {
  if (!armed) return;
  pendingSyncUser = userId;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    const uid = pendingSyncUser;
    pendingSyncUser = null;
    if (uid) pushEggsToCloud(uid).catch(() => {});
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Wires every eggStore mutation to a debounced cloud push.
 * Returns the unsubscribe function. Call after syncEggsWithCloud().
 */
export function armEggStoreCloudSync(userId: string): () => void {
  return useEggStore.subscribe((state, prev) => {
    if (isApplyingRemote) return;
    if (state.eggs === prev.eggs) return;
    scheduleEggSync(userId);
  });
}