import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Sport = "NFL" | "NBA";

interface SportContextType {
  sport: Sport;
  setSport: (sport: Sport) => void;
  maxRounds: number;
  teamsPerRound: number;
  positions: string[];
  combineMetrics: { key: string; label: string; unit: string }[];
}

const NFL_POSITIONS = ["QB", "RB", "WR", "TE", "OT", "OL", "EDGE", "DL", "DT", "LB", "CB", "S"];
const NBA_POSITIONS = ["PG", "SG", "SF", "PF", "C"];

const NFL_COMBINE = [
  { key: "fortyTime", label: "40-Yard Dash", unit: "s" },
  { key: "vertical", label: "Vertical Jump", unit: "\"" },
  { key: "benchReps", label: "Bench Press", unit: " reps" },
  { key: "broadJump", label: "Broad Jump", unit: "\"" },
  { key: "shuttle", label: "20-Yard Shuttle", unit: "s" },
  { key: "threeCone", label: "3-Cone Drill", unit: "s" },
];

const NBA_COMBINE = [
  { key: "wingspan", label: "Wingspan", unit: "" },
  { key: "standingReach", label: "Standing Reach", unit: "" },
  { key: "vertical", label: "Max Vertical", unit: "\"" },
  { key: "laneAgility", label: "Lane Agility", unit: "s" },
  { key: "sprint", label: "3/4 Court Sprint", unit: "s" },
  { key: "shuttle", label: "Shuttle Run", unit: "s" },
];

const STORAGE_KEY = "draftscout_sport";

function loadSport(): Sport {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "NBA") return "NBA";
  } catch {}
  return "NFL";
}

const SportContext = createContext<SportContextType>({
  sport: "NFL",
  setSport: () => {},
  maxRounds: 7,
  teamsPerRound: 32,
  positions: NFL_POSITIONS,
  combineMetrics: NFL_COMBINE,
});

export function SportProvider({ children }: { children: ReactNode }) {
  const [sport, setSportState] = useState<Sport>(loadSport);

  const setSport = useCallback((s: Sport) => {
    setSportState(s);
    localStorage.setItem(STORAGE_KEY, s);
  }, []);

  useEffect(() => {
    if (sport === "NBA") {
      document.documentElement.classList.add("sport-nba");
    } else {
      document.documentElement.classList.remove("sport-nba");
    }
  }, [sport]);

  const value: SportContextType = {
    sport,
    setSport,
    maxRounds: sport === "NFL" ? 7 : 2,
    teamsPerRound: sport === "NFL" ? 32 : 30,
    positions: sport === "NFL" ? NFL_POSITIONS : NBA_POSITIONS,
    combineMetrics: sport === "NFL" ? NFL_COMBINE : NBA_COMBINE,
  };

  return <SportContext.Provider value={value}>{children}</SportContext.Provider>;
}

export function useSport() {
  return useContext(SportContext);
}
