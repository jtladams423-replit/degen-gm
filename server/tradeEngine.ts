export interface CapSettingOverrides {
  salaryCap?: number;
  taxLine?: number;
  firstApron?: number;
  secondApron?: number;
}

export interface TradeTeamState {
  teamCode: string;
  currentSalary: number;
  capSpace: number;
  rosterSize: number;
  playersOut: { id: number; name: string; salary: number }[];
  playersIn: { id: number; name: string; salary: number }[];
  picksOut: { id: number; description: string }[];
  picksIn: { id: number; description: string }[];
}

export interface TradeValidationResult {
  isValid: boolean;
  teamResults: {
    teamCode: string;
    salaryOut: number;
    salaryIn: number;
    netChange: number;
    rosterSizeAfter: number;
    taxStatus: string;
    maxAllowedIncoming: number;
    passed: boolean;
    reasons: string[];
  }[];
  overallReasons: string[];
}

const MIN_ROSTER_SIZE = 12;
const MAX_ROSTER_SIZE = 15;

const DEFAULT_CAP_SETTINGS: Record<number, { salaryCap: number; taxLine: number; firstApron: number; secondApron: number }> = {
  2025: { salaryCap: 140.6, taxLine: 170.8, firstApron: 178.1, secondApron: 188.9 },
  2026: { salaryCap: 148.1, taxLine: 179.0, firstApron: 186.5, secondApron: 197.5 },
  2027: { salaryCap: 155.0, taxLine: 187.0, firstApron: 195.0, secondApron: 206.0 },
};

function projectCapSettings(baseYear: number, targetYear: number): { salaryCap: number; taxLine: number; firstApron: number; secondApron: number } {
  const base = DEFAULT_CAP_SETTINGS[2027];
  const yearsForward = targetYear - 2027;
  const growthFactor = Math.pow(1.05, yearsForward);
  return {
    salaryCap: Math.round(base.salaryCap * growthFactor * 10) / 10,
    taxLine: Math.round(base.taxLine * growthFactor * 10) / 10,
    firstApron: Math.round(base.firstApron * growthFactor * 10) / 10,
    secondApron: Math.round(base.secondApron * growthFactor * 10) / 10,
  };
}

export function getDefaultCapSettings(year: number): { salaryCap: number; taxLine: number; firstApron: number; secondApron: number } {
  const normalizedYear = year > 2100 ? year : (year >= 2025 ? year : year + 2000);
  const lookupYear = normalizedYear <= 2025 ? 2025 : normalizedYear;

  if (DEFAULT_CAP_SETTINGS[lookupYear]) {
    return { ...DEFAULT_CAP_SETTINGS[lookupYear] };
  }

  return projectCapSettings(2027, lookupYear);
}

function resolveCapSettings(year: number, overrides?: CapSettingOverrides): { salaryCap: number; taxLine: number; firstApron: number; secondApron: number } {
  const defaults = getDefaultCapSettings(year);
  return {
    salaryCap: overrides?.salaryCap ?? defaults.salaryCap,
    taxLine: overrides?.taxLine ?? defaults.taxLine,
    firstApron: overrides?.firstApron ?? defaults.firstApron,
    secondApron: overrides?.secondApron ?? defaults.secondApron,
  };
}

export function getTeamTaxStatus(totalSalary: number, year: number): string {
  const caps = getDefaultCapSettings(year);

  if (totalSalary <= caps.salaryCap) return "under_cap";
  if (totalSalary <= caps.taxLine) return "taxpayer";
  if (totalSalary <= caps.firstApron) return "first_apron";
  return "second_apron";
}

function calculateMaxIncoming(
  salaryOut: number,
  postTradeSalary: number,
  caps: { salaryCap: number; taxLine: number; firstApron: number; secondApron: number }
): { maxAllowed: number; taxStatus: string } {
  if (postTradeSalary - salaryOut <= caps.salaryCap) {
    const availableRoom = caps.salaryCap - (postTradeSalary - salaryOut);
    return {
      maxAllowed: availableRoom,
      taxStatus: "under_cap",
    };
  }

  if (postTradeSalary > caps.secondApron) {
    return {
      maxAllowed: salaryOut,
      taxStatus: "second_apron",
    };
  }

  if (postTradeSalary > caps.firstApron) {
    return {
      maxAllowed: salaryOut * 1.10 + 0.1,
      taxStatus: "first_apron",
    };
  }

  let maxAllowed: number;
  if (salaryOut <= 7.5) {
    maxAllowed = salaryOut * 2.0 + 0.25;
  } else if (salaryOut <= 29.0) {
    maxAllowed = salaryOut * 1.75 + 0.25;
  } else {
    maxAllowed = salaryOut * 1.25 + 0.25;
  }

  const taxStatus = postTradeSalary > caps.taxLine ? "first_apron" : "taxpayer";

  return { maxAllowed, taxStatus };
}

export function validateTrade(
  teams: TradeTeamState[],
  year: number,
  capSettings?: CapSettingOverrides
): TradeValidationResult {
  const caps = resolveCapSettings(year, capSettings);
  const overallReasons: string[] = [];
  const teamResults: TradeValidationResult["teamResults"] = [];

  if (teams.length < 2) {
    overallReasons.push("A trade must involve at least 2 teams.");
  }

  let totalPlayersMoving = 0;
  for (const team of teams) {
    totalPlayersMoving += team.playersOut.length + team.picksOut.length;
  }
  if (totalPlayersMoving === 0) {
    overallReasons.push("No players or picks are being traded.");
  }

  for (const team of teams) {
    const reasons: string[] = [];

    const salaryOut = team.playersOut.reduce((sum, p) => sum + p.salary, 0);
    const salaryIn = team.playersIn.reduce((sum, p) => sum + p.salary, 0);
    const netChange = salaryIn - salaryOut;

    const rosterSizeAfter = team.rosterSize - team.playersOut.length + team.playersIn.length;

    if (rosterSizeAfter < MIN_ROSTER_SIZE) {
      reasons.push(`Roster would drop to ${rosterSizeAfter} players (minimum ${MIN_ROSTER_SIZE}).`);
    }
    if (rosterSizeAfter > MAX_ROSTER_SIZE) {
      reasons.push(`Roster would increase to ${rosterSizeAfter} players (maximum ${MAX_ROSTER_SIZE}).`);
    }

    const postTradeSalary = team.currentSalary + netChange;
    const { maxAllowed, taxStatus } = calculateMaxIncoming(salaryOut, postTradeSalary, caps);

    if (salaryIn > maxAllowed + 0.001) {
      const formatM = (v: number) => `$${v.toFixed(1)}M`;
      if (taxStatus === "under_cap") {
        reasons.push(
          `Team is under the cap but incoming salary (${formatM(salaryIn)}) exceeds available cap room (${formatM(maxAllowed)}).`
        );
      } else if (taxStatus === "second_apron") {
        reasons.push(
          `Team is above the second apron — incoming salary (${formatM(salaryIn)}) must not exceed outgoing (${formatM(salaryOut)}).`
        );
      } else if (taxStatus === "first_apron") {
        reasons.push(
          `Team is at/above the first apron — incoming salary (${formatM(salaryIn)}) exceeds 110% + $100K of outgoing (${formatM(maxAllowed)}).`
        );
      } else {
        reasons.push(
          `Salary matching failed — incoming (${formatM(salaryIn)}) exceeds max allowed (${formatM(maxAllowed)}) for outgoing (${formatM(salaryOut)}).`
        );
      }
    }

    const passed = reasons.length === 0;

    teamResults.push({
      teamCode: team.teamCode,
      salaryOut: Math.round(salaryOut * 100) / 100,
      salaryIn: Math.round(salaryIn * 100) / 100,
      netChange: Math.round(netChange * 100) / 100,
      rosterSizeAfter,
      taxStatus,
      maxAllowedIncoming: Math.round(maxAllowed * 100) / 100,
      passed,
      reasons,
    });
  }

  const allPassed = teamResults.every((t) => t.passed);
  const isValid = allPassed && overallReasons.length === 0;

  return { isValid, teamResults, overallReasons };
}
