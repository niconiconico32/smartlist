# 🕐 Timezone Management Guide for SmartList

## 🚨 The Problem We Solved

### The "Streak Killer" Bug

**Scenario:**
- User in New York completes a task at **11:30 PM on Jan 24**
- System saves timestamp as `2026-01-25T02:30:00Z` (UTC)
- Streak logic compares:
  - Last completion: `2026-01-25` (from UTC)
  - Today: `2026-01-24` (local)
  - **RESULT: Thinks user skipped Jan 24 → STREAK BROKEN** ❌

### Root Cause
```typescript
// ❌ WRONG: Uses UTC timezone
const today = new Date().toISOString().split('T')[0]
// At 11:30 PM Jan 24 (NYC) → "2026-01-25" (UTC tomorrow!)
```

---

## ✅ The Solution

We created `src/utils/dateHelpers.ts` - a **single source of truth** for all date operations.

### Core Principle
> **"Today" ALWAYS means "User's Local Today", never UTC.**

---

## 📚 API Reference

### 1. Get Today's Date
```typescript
import { getLocalTodayDateKey } from '@/src/utils/dateHelpers';

// ✅ ALWAYS USE THIS for "today"
const today = getLocalTodayDateKey(); // "2026-01-24"

// ❌ NEVER USE THIS
const today = new Date().toISOString().split('T')[0]; // Could be tomorrow in UTC!
```

### 2. Get Date from Date Object
```typescript
import { getLocalDateKey } from '@/src/utils/dateHelpers';

const selectedDate = new Date('2026-01-20T15:30:00');
const dateKey = getLocalDateKey(selectedDate); // "2026-01-20"
```

### 3. Normalize Dates from Database
```typescript
import { normalizeDate } from '@/src/utils/dateHelpers';

// Handles ISO strings from Supabase
const dbDate = "2026-01-25T02:30:00Z";
const localDate = normalizeDate(dbDate); // Converts to local "2026-01-24"

// Already normalized? Returns as-is
normalizeDate("2026-01-24"); // "2026-01-24"
```

### 4. Streak-Safe Comparisons
```typescript
import { 
  hasCountedToday, 
  isLocalToday, 
  isLocalYesterday 
} from '@/src/utils/dateHelpers';

// Check if already counted today
if (hasCountedToday(lastCompletionDate)) {
  console.log("Already counted!");
}

// Check if completed today
if (isLocalToday(completionDate)) {
  // Award streak
}

// Check if streak continues
if (isLocalYesterday(lastCompletionDate)) {
  // Continue streak
}
```

---

## 🎯 Best Practices

### ✅ DO

1. **Use helpers for all date keys**
   ```typescript
   const today = getLocalTodayDateKey();
   const dateKey = getLocalDateKey(selectedDate);
   ```

2. **Store dates as YYYY-MM-DD strings**
   ```typescript
   // In AsyncStorage or Supabase
   completedDates: ["2026-01-24", "2026-01-23"]
   ```

3. **Normalize before comparison**
   ```typescript
   if (normalizeDate(dbDate) === getLocalTodayDateKey()) {
     // Safe comparison
   }
   ```

### ❌ DON'T

1. **Never use `.toISOString().split('T')[0]` directly**
   ```typescript
   // ❌ This can give wrong day due to UTC conversion
   new Date().toISOString().split('T')[0]
   ```

2. **Never store full ISO timestamps for "day" comparisons**
   ```typescript
   // ❌ Bad: Time zones mess this up
   lastCompletedDate: "2026-01-24T23:30:00Z"
   
   // ✅ Good: Just the date
   lastCompletedDate: "2026-01-24"
   ```

3. **Never compare Date objects for "same day"**
   ```typescript
   // ❌ Compares milliseconds (fails across midnight)
   date1.getTime() === date2.getTime()
   
   // ✅ Compare date keys
   getLocalDateKey(date1) === getLocalDateKey(date2)
   ```

---

## 📂 Where We Applied This

### Files Refactored:
1. ✅ `app/(tabs)/swipeable-layout.tsx` - Streak system
2. ✅ `app/(tabs)/index.tsx` - Task completion tracking
3. ✅ `src/components/WeeklyCalendar.tsx` - Calendar date keys

### Patterns Replaced:
```typescript
// ❌ Before (9 instances)
new Date().toISOString().split("T")[0]
selectedDate.toISOString().split("T")[0]

// ✅ After
getLocalTodayDateKey()
getLocalDateKey(selectedDate)
```

---

## 🗄️ Database Strategy

### Recommended Approach: **Store Local Date Strings**

```typescript
// ✅ Best for Habit Trackers
interface Task {
  id: string;
  completedDates: string[]; // ["2026-01-24", "2026-01-23"]
  scheduledDate: string;     // "2026-01-24"
}
```

**Why?**
- ✅ No timezone confusion
- ✅ Simple comparisons: `"2026-01-24" === "2026-01-24"`
- ✅ Works across timezones
- ✅ Perfect for "did I do this today?" logic

### Alternative: Store UTC, Convert on Read

```typescript
// If you MUST store full timestamps
interface Task {
  completedAt: string; // "2026-01-24T23:30:00Z"
}

// ✅ Always normalize when reading
const localDate = normalizeDate(task.completedAt); // "2026-01-24"
if (localDate === getLocalTodayDateKey()) {
  // Counts as today
}
```

---

## 🧪 Testing Edge Cases

### Test at Midnight
```typescript
// Test user completing task at 11:59 PM
const task = {
  completedDate: getLocalTodayDateKey() // Should be "today" not "tomorrow"
};
```

### Test Different Timezones
```typescript
// User travels NYC → Tokyo
// Their streak should continue if they completed task within 24h local time
```

### Test Date Boundaries
```typescript
// User at midnight should get current day, not previous/next
const midnight = new Date('2026-01-24T23:59:59');
getLocalDateKey(midnight); // Should be "2026-01-24"

const oneSecondLater = new Date('2026-01-25T00:00:00');
getLocalDateKey(oneSecondLater); // Should be "2026-01-25"
```

---

## 🔥 Streak Logic Summary

```typescript
async function updateStreak() {
  const today = getLocalTodayDateKey(); // ✅ Local today
  const lastDate = await getLastCompletionDate();
  
  // Already counted today? Skip
  if (hasCountedToday(lastDate)) {
    return;
  }
  
  // Completed yesterday? Continue streak
  if (isLocalYesterday(lastDate)) {
    streak++;
  } else {
    // Missed a day - reset
    streak = 1;
  }
  
  // Save with local date
  await saveStreak({
    count: streak,
    lastCompletedDate: today // ✅ Store as YYYY-MM-DD
  });
}
```

---

## 📊 Performance

**Impact:** Zero performance penalty
- Simple string comparisons
- No heavy date parsing in hot paths
- Helpers are pure functions (can be memoized)

---

## 🚀 Migration Checklist

If you have existing data with ISO timestamps:

```typescript
// Run once to migrate existing data
async function migrateStreakDates() {
  const streak = await AsyncStorage.getItem('@smartlist_streak');
  if (streak) {
    const { lastCompletedDate, ...rest } = JSON.parse(streak);
    
    // Normalize old ISO timestamp to local date
    const normalizedDate = normalizeDate(lastCompletedDate);
    
    await AsyncStorage.setItem('@smartlist_streak', JSON.stringify({
      ...rest,
      lastCompletedDate: normalizedDate
    }));
  }
}
```

---

## 🎓 Key Takeaways

1. **One helper for everything:** Use `getLocalTodayDateKey()` everywhere
2. **Store simple strings:** `"2026-01-24"` not `"2026-01-24T23:30:00Z"`
3. **Normalize on read:** Always use `normalizeDate()` when reading from DB
4. **Test at midnight:** The most common timezone bug

---

## 📞 Need Help?

If you see a date comparison and you're not sure if it's safe:

```typescript
// Is this safe? ✅ or ❌
if (someDate === anotherDate) {
  // Check:
  // 1. Are both using getLocalDateKey() or getLocalTodayDateKey()? ✅
  // 2. Is one from DB without normalizeDate()? ❌
  // 3. Are you comparing Date objects directly? ❌
}
```

**Rule of Thumb:** If you see `new Date()` without a helper function nearby, it's probably wrong!

---

**Status:** 🟢 Fully Implemented
**Files Changed:** 4
**Bugs Fixed:** Streak timezone killer
**Tests Needed:** Midnight edge cases, timezone travel
