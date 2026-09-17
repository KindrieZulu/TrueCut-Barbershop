describe('Regular Customer Loyalty Priority Engine (Unit Tests)', () => {
  function evaluateLoyalty(completedBookingsCount: number, minThreshold: number = 5) {
    return completedBookingsCount >= minThreshold;
  }

  function getPriorityLevel(bookingType: 'EMERGENCY' | 'REGULAR' | 'GENERAL', isRegularCustomer: boolean): number {
    if (bookingType === 'EMERGENCY') return 1; // Highest priority
    if (bookingType === 'REGULAR' || isRegularCustomer) return 2; // Priority 2
    return 3; // General priority 3
  }

  it('should qualify client as Regular Customer when completed bookings >= threshold (5)', () => {
    expect(evaluateLoyalty(5, 5)).toBe(true);
    expect(evaluateLoyalty(8, 5)).toBe(true);
  });

  it('should not qualify client as Regular Customer when completed bookings < threshold (5)', () => {
    expect(evaluateLoyalty(4, 5)).toBe(false);
    expect(evaluateLoyalty(0, 5)).toBe(false);
  });

  it('should enforce priority hierarchy: Emergency (1) > Regular Customer (2) > General (3)', () => {
    const emergencyPriority = getPriorityLevel('EMERGENCY', true);
    const regularPriority = getPriorityLevel('GENERAL', true);
    const generalPriority = getPriorityLevel('GENERAL', false);

    expect(emergencyPriority).toBeLessThan(regularPriority);
    expect(regularPriority).toBeLessThan(generalPriority);
  });
});
