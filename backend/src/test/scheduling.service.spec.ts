import { SchedulingService } from '../modules/scheduling/scheduling.service';

describe('SchedulingService (Unit Tests)', () => {
  let schedulingService: SchedulingService;
  let mockPrisma: any;
  let mockSettings: any;

  beforeEach(() => {
    mockPrisma = {};
    mockSettings = {
      getNumber: (key: string, defaultVal: number) => {
        if (key === 'standard_buffer_minutes') return 15;
        if (key === 'house_call_travel_buffer_minutes') return 15;
        return defaultVal;
      },
    };

    schedulingService = new SchedulingService(mockPrisma, mockSettings);
  });

  describe('calculateOccupiedDuration', () => {
    it('should calculate occupied duration for a standard 30-minute haircut', () => {
      // 30m service + 15m standard buffer = 45m
      const duration = schedulingService.calculateOccupiedDuration(30, false);
      expect(duration).toBe(45);
    });

    it('should calculate occupied duration for a 30-minute house call with travel buffer', () => {
      // 30m service + 15m standard buffer + 15m travel buffer = 60m
      const duration = schedulingService.calculateOccupiedDuration(30, true);
      expect(duration).toBe(60);
    });
  });

  describe('checkOverlap', () => {
    it('should detect overlapping time ranges correctly', () => {
      const startA = new Date('2025-03-01T10:00:00Z');
      const endA = new Date('2025-03-01T10:45:00Z');

      const startB = new Date('2025-03-01T10:30:00Z');
      const endB = new Date('2025-03-01T11:15:00Z');

      const overlap = schedulingService.checkOverlap(startA, endA, startB, endB);
      expect(overlap).toBe(true);
    });

    it('should return false for adjacent non-overlapping time ranges', () => {
      const startA = new Date('2025-03-01T10:00:00Z');
      const endA = new Date('2025-03-01T10:45:00Z');

      const startB = new Date('2025-03-01T10:45:00Z');
      const endB = new Date('2025-03-01T11:30:00Z');

      const overlap = schedulingService.checkOverlap(startA, endA, startB, endB);
      expect(overlap).toBe(false);
    });
  });
});
