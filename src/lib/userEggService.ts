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

function migrationKey(userId: string): string {
  return `${MIGRATION_KEY}:${userId}`;
}

/**
 * Clears routine links that do not belong to `userId`.
 *
 * Defence in depth for the one-time migration below. That migration stamps the
 * CURRENT user id onto whatever sits in the local store, so a stale store from
 * a previous account would attribute that account's routines to this user.
 */
async function dropForeignRoutineLinks(
  userId: string,
  eggs: EggData[],
): Promise<EggData[]> {
  const ids = eggs.map((e) => e.routineId).filter((id): id is string => !!id);
  if (ids.length === 0) return eggs;

  const detachAll = () => eggs.map((e) => ({ ...e, routineId: null }));
  try {
    const { data } = await supabase
      .from("routines")
      .select("id")
      .eq("user_id", userId)
      .in("id", ids);
    const owned = new Set((data ?? []).map((r: { id: string }) => r.id));
    return eggs.map((e) =>
      e.routineId && !owned.has(e.routineId) ? { ...e, routineId: null } : e,
    );
  } catch {
    // Ownership could not be verified: push no links rather than wrong ones.
    return detachAll();
  }
}

/**
 * Drops the previous account's egg state.
 *
 * `useEggStore` is a global store and `signOut()` does not clear it, so without
 * this a second account signing in on the same device inherits the first
 * account's routine links. Combined with the one-time migration — which stamps
 * the CURRENT user id onto whatever is in the local store — that wrote another
 * account's routine ids under this user's rows, and because the push upserts on
 * (user_id, egg_id) it overwrote the routine→egg links the funnel had just
 * created, leaving every restored routine without its companion.
 */
export function resetEggStoreForUserChange(): void {
  armed = false;
  isApplyingRemote = false;
  pendingSyncUser = null;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  useEggStore.setState({ eggs: buildBaseEggs() });
}

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
 * Pushes the given egg state up as rows. `nickname` is intentionally
 * omitted so a local push never wipes a nickname set elsewhere.
 */
async function pushEggsToCloud(
  userId: string,
  eggs?: EggData[],
): Promise<void> {
  const source = eggs ?? useEggStore.getState().eggs;
  const rows = source.map((e) => ({
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
      // One-time local → cloud migration for existing users. Scoped per user so
      // a fresh account on a device that already migrated someone else still
      // gets its chance, and vice versa.
      const key = migrationKey(userId);
      const alreadyMigrated = (await AsyncStorage.getItem(key)) === "true";
      if (!alreadyMigrated) {
        const local = await dropForeignRoutineLinks(
          userId,
          useEggStore.getState().eggs,
        );
        if (isApplyingRemote) return;
        isApplyingRemote = true;
        try {
          useEggStore.setState({ eggs: local });
        } finally {
          isApplyingRemote = false;
        }
        await pushEggsToCloud(userId, local);
        await AsyncStorage.setItem(key, "true");
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