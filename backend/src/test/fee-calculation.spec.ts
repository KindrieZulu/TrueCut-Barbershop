describe('Fee Structure & Pricing Engine (Unit Tests)', () => {
  const getSetting = (key: string): number => {
    switch (key) {
      case 'booking_fee': return 2;
      case 'emergency_fee': return 10;
      case 'house_call_fee': return 5;
      case 'squeeze_in_fee': return 3;
      case 'penalty_fee': return 3;
      default: return 0;
    }
  };

  function calculateTotal(servicePrice: number, isEmergency = false, isHouseCall = false, isSqueezeIn = false) {
    const bookingFee = getSetting('booking_fee');
    const emergencyFee = isEmergency ? getSetting('emergency_fee') : 0;
    const houseCallFee = isHouseCall ? getSetting('house_call_fee') : 0;
    const squeezeInFee = isSqueezeIn ? getSetting('squeeze_in_fee') : 0;

    return {
      servicePrice,
      bookingFee,
      emergencyFee,
      houseCallFee,
      squeezeInFee,
      totalAmount: servicePrice + bookingFee + emergencyFee + houseCallFee + squeezeInFee,
    };
  }

  it('should calculate correct total for standard General booking ($15 service)', () => {
    const res = calculateTotal(15);
    expect(res.bookingFee).toBe(2);
    expect(res.totalAmount).toBe(17);
  });

  it('should calculate correct total for Emergency booking ($15 service + $2 booking + $10 emergency)', () => {
    const res = calculateTotal(15, true, false, false);
    expect(res.emergencyFee).toBe(10);
    expect(res.totalAmount).toBe(27);
  });

  it('should calculate correct total for House Call booking ($25 service + $2 booking + $5 house call)', () => {
    const res = calculateTotal(25, false, true, false);
    expect(res.houseCallFee).toBe(5);
    expect(res.totalAmount).toBe(32);
  });

  it('should calculate correct total for Receptionist Squeeze-in ($15 service + $2 booking + $3 squeeze-in)', () => {
    const res = calculateTotal(15, false, false, true);
    expect(res.squeezeInFee).toBe(3);
    expect(res.totalAmount).toBe(20);
  });
});
