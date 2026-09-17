describe('Cancellation Policy & Refund Engine (Unit Tests)', () => {
  function evaluateRefund(
    servicePrice: number,
    bookingFee: number,
    minutesUntilAppointment: number,
    cancellationCutoffMinutes: number = 120,
    penaltyFee: number = 3,
  ) {
    let penaltyApplied = 0;
    if (minutesUntilAppointment < cancellationCutoffMinutes) {
      penaltyApplied = penaltyFee;
    }

    const eligibleRefund = Math.max(0, servicePrice - penaltyApplied);

    return {
      servicePrice,
      bookingFeeRetained: bookingFee, // $2 booking fee is non-refundable
      penaltyApplied,
      eligibleRefund,
    };
  }

  it('should grant full service refund when cancelling >= 2 hours before appointment (180 mins)', () => {
    const res = evaluateRefund(15, 2, 180, 120, 3);
    expect(res.penaltyApplied).toBe(0);
    expect(res.eligibleRefund).toBe(15);
    expect(res.bookingFeeRetained).toBe(2);
  });

  it('should deduct $3 penalty when cancelling < 2 hours before appointment (30 mins)', () => {
    const res = evaluateRefund(15, 2, 30, 120, 3);
    expect(res.penaltyApplied).toBe(3);
    expect(res.eligibleRefund).toBe(12); // $15 service - $3 penalty
    expect(res.bookingFeeRetained).toBe(2);
  });
});
