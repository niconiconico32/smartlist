import { 
  normalizeDate, 
  isSameLocalDay, 
  daysBetween, 
  isStreakValid, 
  hasCountedToday 
} from '../dateHelpers';

describe('Utils: dateHelpers', () => {

  // ==========================================
  // 1. Normalización de Fechas
  // ==========================================
  describe('normalizeDate()', () => {
    it('debe mantener el formato YYYY-MM-DD intacto', () => {
      expect(normalizeDate('2026-03-15')).toBe('2026-03-15');
    });

    it('debe convertir un string ISO UTC a formato YYYY-MM-DD local', () => {
      // Configuramos el tiempo global
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
      
      const isoString = '2026-03-15T23:59:00Z'; 
      expect(normalizeDate(isoString)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      jest.useRealTimers();
    });
  });

  // ==========================================
  // 2. Cálculo de Días
  // ==========================================
  describe('daysBetween()', () => {
    it('debe retornar 0 para la misma fecha', () => {
      expect(daysBetween('2026-03-15', '2026-03-15')).toBe(0);
    });

    it('debe calcular la diferencia sin importar el orden', () => {
      expect(daysBetween('2026-03-15', '2026-03-10')).toBe(5);
      expect(daysBetween('2026-03-10', '2026-03-15')).toBe(5);
    });
  });

  // ==========================================
  // 3. Lógica Núcleo de Rachas (STREAKS)
  // ==========================================
  describe('isStreakValid()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Simulamos que "Hoy" es 15 de Marzo de 2026, mediodía UTC
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debe retornar FALSE si la fecha es null (no hay historial)', () => {
      expect(isStreakValid(null)).toBe(false);
    });

    it('debe retornar TRUE si la última tarea se completó HOY (15 de Marzo)', () => {
      expect(isStreakValid('2026-03-15')).toBe(true);
    });

    it('debe retornar TRUE si la última tarea se completó AYER (14 de Marzo)', () => {
      expect(isStreakValid('2026-03-14')).toBe(true);
    });

    it('debe retornar FALSE si el usuario no entró por más de 24h (13 de Marzo o antes)', () => {
      expect(isStreakValid('2026-03-13')).toBe(false); // Racha Rota
      expect(isStreakValid('2026-03-01')).toBe(false);
    });
  });

  // ==========================================
  // 4. Bloqueo de Doble Conteo (Anti-Cheat)
  // ==========================================
  describe('hasCountedToday()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-03-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debe evitar conteo si ya se completó algo hoy', () => {
      expect(hasCountedToday('2026-03-15')).toBe(true);
    });

    it('debe permitir conteo si la última vez fue ayer', () => {
      expect(hasCountedToday('2026-03-14')).toBe(false);
    });
  });
});
