# 🔒 Implementación de Seguridad - Supabase Anonymous Auth

## ✅ Cambios Implementados

### 1. **Variables de Entorno Seguras** 
- ✅ Archivo `.env` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `.gitignore` actualizado para excluir `.env` del repositorio

### 2. **Cliente Supabase Refactorizado**
**Archivo:** `src/lib/supabase.ts`
- ✅ Configurado con `AsyncStorage` para persistir sesiones
- ✅ Auto-refresh de tokens habilitado
- ✅ Validación de variables de entorno

### 3. **Context de Autenticación**
**Archivo:** `src/contexts/AuthContext.tsx`
- ✅ Provider que maneja autenticación anónima automática
- ✅ Hook `useAuth()` para acceder al usuario y sesión en toda la app
- ✅ Restauración de sesión al abrir la app
- ✅ Listener de cambios de autenticación

### 4. **Integración en App Root**
**Archivo:** `app/_layout.tsx`
- ✅ `AuthProvider` envolviendo toda la aplicación
- ✅ Autenticación anónima se ejecuta al iniciar

### 5. **Edge Function Seguro**
**Archivo:** `app/(tabs)/index.tsx`
- ✅ Eliminado token hardcoded `Bearer eyJ...` ⚠️
- ✅ Refactorizado a usar `supabase.functions.invoke()`
- ✅ El SDK inyecta automáticamente el token del usuario autenticado

### 6. **Backend Validado**
**Archivo:** `supabase/functions/divide-task/index.ts`
- ✅ Validación de header `Authorization`
- ✅ Respuesta 401 si no hay autenticación

### 7. **Dependencias**
- ✅ `react-native-url-polyfill` instalado

---

## 🚀 Cómo Funciona

1. **Usuario abre la app** → `AuthProvider` revisa si hay sesión
2. **No hay sesión** → Se ejecuta `signInAnonymously()` automáticamente
3. **Usuario autenticado** → Se guarda en `AsyncStorage`
4. **Usuario llama a dividir tarea** → SDK usa el token de la sesión anónima
5. **Backend valida** → Solo procesa si hay Authorization header válido

---

## 🧪 Cómo Probar

1. **Borrar sesión anterior:**
   ```bash
   # En la consola de React Native
   AsyncStorage.clear()
   ```

2. **Recargar app** - Deberías ver en consola:
   ```
   📝 No session found, signing in anonymously...
   ✅ Anonymous user created: <UUID>
   ```

3. **Dividir una tarea** - Ahora usa el SDK seguro

4. **Verificar en Supabase Dashboard:**
   - Ve a Authentication > Users
   - Deberías ver un usuario anónimo creado

---

## 🔐 Seguridad Mejorada

### ❌ Antes (INSEGURO):
```typescript
fetch('https://.../divide-task', {
  headers: {
    Authorization: 'Bearer eyJhbGci...' // ⚠️ Token hardcoded
  }
})
```

### ✅ Ahora (SEGURO):
```typescript
await supabase.functions.invoke('divide-task', {
  body: { task: '...' }
})
// ✅ SDK inyecta el token automáticamente
```

---

## 📋 Próximos Pasos (Opcional)

### Sincronización de Datos
Ahora que tienes autenticación, puedes:

1. **Crear tabla de tareas:**
```sql
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  task text not null,
  completed boolean default false,
  created_at timestamp default now()
);

alter table tasks enable row level security;

create policy "Users can manage own tasks"
  on tasks for all
  using (auth.uid() = user_id);
```

2. **Guardar tareas en Supabase:**
```typescript
const { user } = useAuth();

await supabase.from('tasks').insert({
  user_id: user.id,
  task: 'Mi tarea',
  completed: false
});
```

---

## ⚠️ IMPORTANTE

### NO hacer commit del `.env` real
Si accidentalmente hiciste commit del `.env` con las API keys:

```bash
# 1. Regenera las keys en Supabase Dashboard
# 2. Actualiza .env con las nuevas keys
# 3. Verifica que .gitignore incluya .env
git rm --cached .env
git commit -m "Remove .env from git"
git push
```

---

## 📚 Referencias

- [Supabase Auth - Anonymous Sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

---

## ✅ Checklist de Seguridad

- [x] Variables de entorno en `.env`
- [x] `.env` en `.gitignore`
- [x] Tokens hardcoded eliminados
- [x] AsyncStorage configurado
- [x] Auth anónima implementada
- [x] Edge Functions usando SDK
- [x] Backend validando auth
- [x] Dependencias instaladas

**Estado:** 🟢 Implementación completa y segura
