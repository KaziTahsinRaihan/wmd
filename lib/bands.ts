// IELTS band rounding shared by Writing and Speaking modules.
//
// Criteria-level scores are full bands only (no half bands). The overall band
// is the average of the criteria, rounded by the fractional rule:
//   fraction < .25       → down to the full band
//   .25 ≤ fraction ≤ .50 → up to the half band
//   .50 < fraction < .75 → stays at the half band
//   fraction ≥ .75       → up to the next full band

export function roundIeltsBand(avg: number): number {
  const whole = Math.floor(avg);
  const frac = avg - whole;
  if (frac < 0.25) return whole;
  if (frac <= 0.5) return whole + 0.5;
  if (frac < 0.75) return whole + 0.5;
  return whole + 1;
}
