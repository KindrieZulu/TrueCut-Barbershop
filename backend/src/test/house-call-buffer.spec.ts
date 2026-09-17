describe('House Call Buffer Engine (Unit Tests)', () => {
  function calculateTotalBuffer(isHouseCall: boolean, standardBuffer: number = 15, travelBuffer: number = 15) {
    return standardBuffer + (isHouseCall ? travelBuffer : 0);
  }

  it('should return 15 minutes total buffer for in-shop standard bookings', () => {
    const totalBuffer = calculateTotalBuffer(false, 15, 15);
    expect(totalBuffer).toBe(15);
  });

  it('should return 30 minutes total buffer for house-call bookings (15m prep + 15m travel)', () => {
    const totalBuffer = calculateTotalBuffer(true, 15, 15);
    expect(totalBuffer).toBe(30);
  });
});
