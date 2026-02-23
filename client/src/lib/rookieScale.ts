const NBA_ROOKIE_SCALE: Record<number, { year1: number; year2: number; year3: number; year4: number; contractYears: number }> = {
  1:  { year1: 13.83, year2: 14.52, year3: 15.25, year4: 16.01, contractYears: 4 },
  2:  { year1: 12.36, year2: 12.98, year3: 13.63, year4: 14.31, contractYears: 4 },
  3:  { year1: 11.11, year2: 11.67, year3: 12.25, year4: 12.86, contractYears: 4 },
  4:  { year1: 9.93,  year2: 10.43, year3: 10.95, year4: 11.50, contractYears: 4 },
  5:  { year1: 9.07,  year2: 9.52,  year3: 10.00, year4: 10.50, contractYears: 4 },
  6:  { year1: 8.24,  year2: 8.65,  year3: 9.08,  year4: 9.54,  contractYears: 4 },
  7:  { year1: 7.44,  year2: 7.81,  year3: 8.20,  year4: 8.61,  contractYears: 4 },
  8:  { year1: 6.67,  year2: 7.00,  year3: 7.35,  year4: 7.72,  contractYears: 4 },
  9:  { year1: 6.33,  year2: 6.65,  year3: 6.98,  year4: 7.33,  contractYears: 4 },
  10: { year1: 5.72,  year2: 6.01,  year3: 6.31,  year4: 6.62,  contractYears: 4 },
  11: { year1: 5.43,  year2: 5.70,  year3: 5.99,  year4: 6.29,  contractYears: 4 },
  12: { year1: 5.16,  year2: 5.42,  year3: 5.69,  year4: 5.97,  contractYears: 4 },
  13: { year1: 4.90,  year2: 5.15,  year3: 5.40,  year4: 5.67,  contractYears: 4 },
  14: { year1: 4.66,  year2: 4.89,  year3: 5.14,  year4: 5.39,  contractYears: 4 },
  15: { year1: 4.42,  year2: 4.64,  year3: 4.87,  year4: 5.12,  contractYears: 4 },
  16: { year1: 4.19,  year2: 4.40,  year3: 4.62,  year4: 4.85,  contractYears: 4 },
  17: { year1: 3.99,  year2: 4.19,  year3: 4.40,  year4: 4.62,  contractYears: 4 },
  18: { year1: 3.81,  year2: 4.00,  year3: 4.20,  year4: 4.41,  contractYears: 4 },
  19: { year1: 3.64,  year2: 3.82,  year3: 4.01,  year4: 4.21,  contractYears: 4 },
  20: { year1: 3.51,  year2: 3.69,  year3: 3.87,  year4: 4.06,  contractYears: 4 },
  21: { year1: 3.37,  year2: 3.54,  year3: 3.72,  year4: 3.90,  contractYears: 4 },
  22: { year1: 3.24,  year2: 3.40,  year3: 3.57,  year4: 3.75,  contractYears: 4 },
  23: { year1: 3.11,  year2: 3.27,  year3: 3.43,  year4: 3.60,  contractYears: 4 },
  24: { year1: 3.00,  year2: 3.15,  year3: 3.31,  year4: 3.47,  contractYears: 4 },
  25: { year1: 2.88,  year2: 3.02,  year3: 3.18,  year4: 3.33,  contractYears: 4 },
  26: { year1: 2.80,  year2: 2.94,  year3: 3.09,  year4: 3.24,  contractYears: 4 },
  27: { year1: 2.76,  year2: 2.90,  year3: 3.04,  year4: 3.19,  contractYears: 4 },
  28: { year1: 2.74,  year2: 2.88,  year3: 3.02,  year4: 3.17,  contractYears: 4 },
  29: { year1: 2.30,  year2: 2.42,  year3: 2.54,  year4: 2.66,  contractYears: 4 },
  30: { year1: 2.27,  year2: 2.38,  year3: 2.50,  year4: 2.63,  contractYears: 4 },
};

const NFL_ROOKIE_SCALE: Record<number, { totalValue: number; signing: number; contractYears: number }> = {
  1:  { totalValue: 41.0, signing: 28.0, contractYears: 4 },
  2:  { totalValue: 37.7, signing: 25.0, contractYears: 4 },
  3:  { totalValue: 35.5, signing: 22.0, contractYears: 4 },
  4:  { totalValue: 33.3, signing: 20.0, contractYears: 4 },
  5:  { totalValue: 31.3, signing: 18.5, contractYears: 4 },
  6:  { totalValue: 28.0, signing: 16.0, contractYears: 4 },
  7:  { totalValue: 26.0, signing: 14.5, contractYears: 4 },
  8:  { totalValue: 24.5, signing: 13.5, contractYears: 4 },
  9:  { totalValue: 23.0, signing: 12.5, contractYears: 4 },
  10: { totalValue: 22.0, signing: 12.0, contractYears: 4 },
  11: { totalValue: 21.0, signing: 11.5, contractYears: 4 },
  12: { totalValue: 20.0, signing: 10.5, contractYears: 4 },
  13: { totalValue: 19.2, signing: 10.0, contractYears: 4 },
  14: { totalValue: 18.4, signing: 9.5,  contractYears: 4 },
  15: { totalValue: 17.6, signing: 9.0,  contractYears: 4 },
  16: { totalValue: 17.0, signing: 8.5,  contractYears: 4 },
  17: { totalValue: 16.0, signing: 8.0,  contractYears: 4 },
  18: { totalValue: 15.4, signing: 7.5,  contractYears: 4 },
  19: { totalValue: 15.0, signing: 7.3,  contractYears: 4 },
  20: { totalValue: 14.5, signing: 7.0,  contractYears: 4 },
  21: { totalValue: 14.0, signing: 6.5,  contractYears: 4 },
  22: { totalValue: 13.5, signing: 6.2,  contractYears: 4 },
  23: { totalValue: 13.0, signing: 6.0,  contractYears: 4 },
  24: { totalValue: 12.6, signing: 5.8,  contractYears: 4 },
  25: { totalValue: 12.2, signing: 5.5,  contractYears: 4 },
  26: { totalValue: 11.8, signing: 5.3,  contractYears: 4 },
  27: { totalValue: 11.4, signing: 5.0,  contractYears: 4 },
  28: { totalValue: 11.0, signing: 4.8,  contractYears: 4 },
  29: { totalValue: 10.7, signing: 4.5,  contractYears: 4 },
  30: { totalValue: 10.4, signing: 4.3,  contractYears: 4 },
  31: { totalValue: 10.2, signing: 4.2,  contractYears: 4 },
  32: { totalValue: 10.0, signing: 4.0,  contractYears: 4 },
};

export interface RookieContract {
  capHit: number;
  salaryByYear: Record<string, number>;
  contractYears: number;
}

export function projectRookieContract(sport: string, overallPick: number, round: number): RookieContract {
  const startYear = 2025;

  if (sport === "NBA") {
    const slot = NBA_ROOKIE_SCALE[overallPick] || (round === 2
      ? { year1: 1.96, year2: 2.06, year3: 2.16, year4: 2.27, contractYears: 2 }
      : NBA_ROOKIE_SCALE[30]);

    const salaryByYear: Record<string, number> = {};
    const years = slot.contractYears;
    salaryByYear[String(startYear)] = slot.year1;
    if (years >= 2) salaryByYear[String(startYear + 1)] = slot.year2;
    if (years >= 3) salaryByYear[String(startYear + 2)] = slot.year3;
    if (years >= 4) salaryByYear[String(startYear + 3)] = slot.year4;

    return {
      capHit: slot.year1,
      salaryByYear,
      contractYears: years,
    };
  }

  if (overallPick <= 32) {
    const slot = NFL_ROOKIE_SCALE[overallPick] || NFL_ROOKIE_SCALE[32];
    const annualCap = Math.round((slot.totalValue / 4) * 100) / 100;
    const salaryByYear: Record<string, number> = {};
    for (let i = 0; i < 4; i++) {
      const yearSalary = Math.round(annualCap * (1 + i * 0.05) * 100) / 100;
      salaryByYear[String(startYear + i)] = yearSalary;
    }
    return { capHit: annualCap, salaryByYear, contractYears: 4 };
  }

  let annualCap: number;
  if (round === 2) annualCap = Math.max(1.5, 5.0 - (overallPick - 33) * 0.06);
  else if (round === 3) annualCap = Math.max(1.1, 2.5 - (overallPick - 65) * 0.03);
  else if (round === 4) annualCap = Math.max(0.95, 1.5 - (overallPick - 97) * 0.01);
  else annualCap = Math.max(0.85, 1.1 - (overallPick - 129) * 0.005);
  annualCap = Math.round(annualCap * 100) / 100;

  const salaryByYear: Record<string, number> = {};
  for (let i = 0; i < 4; i++) {
    salaryByYear[String(startYear + i)] = annualCap;
  }
  return { capHit: annualCap, salaryByYear, contractYears: 4 };
}

export interface MockRookie {
  name: string;
  position: string;
  college: string;
  teamCode: string;
  overallPick: number;
  round: number;
  capHit: number;
  salaryByYear: Record<string, number>;
  contractYears: number;
  sport: string;
}

const MOCK_ROOKIES_KEY = (sport: string) => `draftscout_mock_rookies_${sport.toLowerCase()}`;

export function saveMockRookies(rookies: MockRookie[], sport: string) {
  localStorage.setItem(MOCK_ROOKIES_KEY(sport), JSON.stringify(rookies));
}

export function loadMockRookies(sport: string): MockRookie[] {
  try {
    const raw = localStorage.getItem(MOCK_ROOKIES_KEY(sport));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function clearMockRookies(sport: string) {
  localStorage.removeItem(MOCK_ROOKIES_KEY(sport));
}

export function getMockRookiesByTeam(sport: string): Record<string, MockRookie[]> {
  const rookies = loadMockRookies(sport);
  const byTeam: Record<string, MockRookie[]> = {};
  for (const r of rookies) {
    if (!byTeam[r.teamCode]) byTeam[r.teamCode] = [];
    byTeam[r.teamCode].push(r);
  }
  return byTeam;
}
