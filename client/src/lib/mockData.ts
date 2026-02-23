export interface Player {
  id: string;
  name: string;
  position: string;
  college: string;
  height: string;
  weight: string;
  forty_time?: number;
  vertical?: number;
  bench_reps?: number;
  broad_jump?: string;
  shuttle?: number;
  three_cone?: number;
  grade: number; // 0-100
  projected_round: number;
}

export interface Team {
  code: string;
  name: string;
  primaryColor: string;
  needs: string[];
  capSpace?: number; // In millions
}

export interface Pick {
  round: number;
  pick: number;
  team: string;
  player?: Player;
}

export interface FreeAgent {
  id: string;
  name: string;
  position: string;
  age: number;
  prevTeam: string;
  marketValue: number; // In millions
  tier: 'Elite' | 'Starter' | 'Rotation' | 'Depth';
}

export const TEAMS: Record<string, Team> = {
  CHI: { code: 'CHI', name: 'Chicago Bears', primaryColor: '#0B162A', needs: ['OL', 'DL', 'WR'], capSpace: 45.2 },
  WAS: { code: 'WAS', name: 'Washington Commanders', primaryColor: '#5A1414', needs: ['OT', 'CB', 'LB'], capSpace: 62.1 },
  NE: { code: 'NE', name: 'New England Patriots', primaryColor: '#002244', needs: ['WR', 'OT', 'EDGE'], capSpace: 85.5 },
  ARI: { code: 'ARI', name: 'Arizona Cardinals', primaryColor: '#97233F', needs: ['DL', 'CB', 'EDGE'], capSpace: 38.4 },
  LAC: { code: 'LAC', name: 'Los Angeles Chargers', primaryColor: '#0080C6', needs: ['WR', 'CB', 'DT'], capSpace: 14.3 },
  NYG: { code: 'NYG', name: 'New York Giants', primaryColor: '#0B2265', needs: ['QB', 'WR', 'CB'], capSpace: 28.9 },
  TEN: { code: 'TEN', name: 'Tennessee Titans', primaryColor: '#0C2340', needs: ['QB', 'EDGE', 'LB'], capSpace: 52.4 },
  ATL: { code: 'ATL', name: 'Atlanta Falcons', primaryColor: '#A71930', needs: ['EDGE', 'CB', 'QB'], capSpace: 22.1 },
  NYJ: { code: 'NYJ', name: 'New York Jets', primaryColor: '#125740', needs: ['OT', 'S', 'TE'], capSpace: 12.5 },
  MIN: { code: 'MIN', name: 'Minnesota Vikings', primaryColor: '#4F2683', needs: ['DT', 'CB', 'IOL'], capSpace: 37.6 },
  DEN: { code: 'DEN', name: 'Denver Broncos', primaryColor: '#FB4F14', needs: ['CB', 'LB', 'TE'], capSpace: -6.2 },
  LV: { code: 'LV', name: 'Las Vegas Raiders', primaryColor: '#000000', needs: ['QB', 'RB', 'OT'], capSpace: 42.8 },
  NO: { code: 'NO', name: 'New Orleans Saints', primaryColor: '#D3BC8D', needs: ['OT', 'WR', 'DL'], capSpace: -42.1 },
  IND: { code: 'IND', name: 'Indianapolis Colts', primaryColor: '#002C5F', needs: ['CB', 'S', 'TE'], capSpace: 48.9 },
  SEA: { code: 'SEA', name: 'Seattle Seahawks', primaryColor: '#005C5C', needs: ['IOL', 'LB', 'QB'], capSpace: 12.3 },
  JAX: { code: 'JAX', name: 'Jacksonville Jaguars', primaryColor: '#006778', needs: ['CB', 'OT', 'DL'], capSpace: 18.4 },
  CIN: { code: 'CIN', name: 'Cincinnati Bengals', primaryColor: '#FB4F14', needs: ['DT', 'TE', 'CB'], capSpace: 44.1 },
  LAR: { code: 'LAR', name: 'Los Angeles Rams', primaryColor: '#003594', needs: ['EDGE', 'CB', 'OL'], capSpace: 21.7 },
  PIT: { code: 'PIT', name: 'Pittsburgh Steelers', primaryColor: '#FFB612', needs: ['WR', 'CB', 'OT'], capSpace: 14.2 },
  MIA: { code: 'MIA', name: 'Miami Dolphins', primaryColor: '#008E97', needs: ['IOL', 'DL', 'TE'], capSpace: -18.5 },
  PHI: { code: 'PHI', name: 'Philadelphia Eagles', primaryColor: '#004C54', needs: ['LB', 'S', 'WR'], capSpace: 25.3 },
  CLE: { code: 'CLE', name: 'Cleveland Browns', primaryColor: '#311D00', needs: ['OT', 'DT', 'WR'], capSpace: -22.9 },
  DAL: { code: 'DAL', name: 'Dallas Cowboys', primaryColor: '#003594', needs: ['RB', 'DT', 'LB'], capSpace: 5.4 },
  GB: { code: 'GB', name: 'Green Bay Packers', primaryColor: '#203731', needs: ['CB', 'S', 'OT'], capSpace: 15.2 },
  TB: { code: 'TB', name: 'Tampa Bay Buccaneers', primaryColor: '#D50A0A', needs: ['EDGE', 'IOL', 'RB'], capSpace: 24.7 },
  HOU: { code: 'HOU', name: 'Houston Texans', primaryColor: '#03202F', needs: ['DT', 'CB', 'S'], capSpace: 32.1 },
  BUF: { code: 'BUF', name: 'Buffalo Bills', primaryColor: '#00338D', needs: ['S', 'WR', 'DL'], capSpace: -11.6 },
  DET: { code: 'DET', name: 'Detroit Lions', primaryColor: '#0076B6', needs: ['EDGE', 'CB', 'OG'], capSpace: 26.5 },
  BAL: { code: 'BAL', name: 'Baltimore Ravens', primaryColor: '#241773', needs: ['OT', 'EDGE', 'WR'], capSpace: 10.8 },
  SF: { code: 'SF', name: 'San Francisco 49ers', primaryColor: '#AA0000', needs: ['OT', 'CB', 'IOL'], capSpace: -8.4 },
  KC: { code: 'KC', name: 'Kansas City Chiefs', primaryColor: '#E31837', needs: ['OT', 'DT', 'WR'], capSpace: 8.2 },
  CAR: { code: 'CAR', name: 'Carolina Panthers', primaryColor: '#0085CA', needs: ['QB', 'WR', 'EDGE'], capSpace: 55.4 },
};

export const MOCK_PLAYERS: Player[] = [
  // 2026 Projected Top Prospects
  { id: '1', name: 'Fernando Mendoza', position: 'QB', college: 'Cal', height: '6\'5"', weight: '225', forty_time: 4.75, vertical: 30, broad_jump: '9\'2"', shuttle: 4.35, three_cone: 7.20, grade: 97, projected_round: 1 },
  { id: '2', name: 'Abdul Carter', position: 'EDGE', college: 'Penn State', height: '6\'3"', weight: '250', forty_time: 4.42, vertical: 38, broad_jump: '10\'6"', shuttle: 4.15, three_cone: 6.90, bench_reps: 28, grade: 98, projected_round: 1 },
  { id: '3', name: 'Tetairoa McMillan', position: 'WR', college: 'Arizona', height: '6\'5"', weight: '210', forty_time: 4.45, vertical: 37, broad_jump: '10\'4"', shuttle: 4.20, three_cone: 6.95, bench_reps: 12, grade: 96, projected_round: 1 },
  { id: '4', name: 'Francis Mauigoa', position: 'OT', college: 'Miami', height: '6\'6"', weight: '330', forty_time: 5.10, vertical: 28, broad_jump: '8\'10"', shuttle: 4.75, three_cone: 7.65, bench_reps: 30, grade: 95, projected_round: 1 },
  { id: '5', name: 'Jeremiyah Love', position: 'RB', college: 'Notre Dame', height: '6\'0"', weight: '205', forty_time: 4.32, vertical: 40, broad_jump: '10\'9"', shuttle: 4.05, three_cone: 6.70, bench_reps: 18, grade: 94, projected_round: 1 },
  { id: '6', name: 'Jahdae Barron', position: 'CB', college: 'Texas', height: '5\'11"', weight: '192', forty_time: 4.38, vertical: 36, broad_jump: '10\'2"', shuttle: 4.08, three_cone: 6.80, bench_reps: 14, grade: 93, projected_round: 1 },
  { id: '7', name: 'Peter Woods', position: 'DL', college: 'Clemson', height: '6\'2"', weight: '315', forty_time: 4.85, vertical: 31, broad_jump: '9\'4"', shuttle: 4.55, three_cone: 7.35, bench_reps: 35, grade: 93, projected_round: 1 },
  { id: '8', name: 'Kenyon Sadiq', position: 'TE', college: 'Oregon', height: '6\'3"', weight: '245', forty_time: 4.52, vertical: 35, broad_jump: '10\'0"', shuttle: 4.30, three_cone: 7.05, bench_reps: 22, grade: 92, projected_round: 1 },
  { id: '9', name: 'Ty Simpson', position: 'QB', college: 'Alabama', height: '6\'2"', weight: '210', forty_time: 4.65, vertical: 32, broad_jump: '9\'6"', shuttle: 4.25, three_cone: 7.10, grade: 91, projected_round: 1 },
  { id: '10', name: 'Emeka Egbuka', position: 'WR', college: 'Ohio State', height: '6\'1"', weight: '205', forty_time: 4.40, vertical: 36, broad_jump: '10\'2"', shuttle: 4.12, three_cone: 6.85, bench_reps: 15, grade: 90, projected_round: 1 },
  { id: '11', name: 'Mansoor Delane', position: 'CB', college: 'Virginia Tech', height: '6\'1"', weight: '185', forty_time: 4.35, vertical: 38, broad_jump: '10\'5"', shuttle: 4.10, three_cone: 6.82, bench_reps: 12, grade: 90, projected_round: 1 },
  { id: '12', name: 'Spencer Fano', position: 'OT', college: 'Utah', height: '6\'5"', weight: '320', forty_time: 5.15, vertical: 27, broad_jump: '8\'8"', shuttle: 4.80, three_cone: 7.70, bench_reps: 26, grade: 89, projected_round: 1 },
  { id: '13', name: 'KC Concepcion', position: 'WR', college: 'NC State', height: '5\'11"', weight: '187', forty_time: 4.36, vertical: 35, broad_jump: '10\'1"', shuttle: 4.08, three_cone: 6.78, bench_reps: 10, grade: 89, projected_round: 1 },
  { id: '14', name: 'Matayo Uiagalelei', position: 'EDGE', college: 'Oregon', height: '6\'5"', weight: '270', forty_time: 4.60, vertical: 34, broad_jump: '9\'10"', shuttle: 4.45, three_cone: 7.15, bench_reps: 24, grade: 88, projected_round: 1 },
  { id: '15', name: 'Caleb Lomu', position: 'OT', college: 'Utah', height: '6\'5"', weight: '310', forty_time: 5.08, vertical: 29, broad_jump: '9\'0"', shuttle: 4.70, three_cone: 7.60, bench_reps: 25, grade: 88, projected_round: 1 },
  { id: '16', name: 'Xavier Watts', position: 'S', college: 'Notre Dame', height: '6\'0"', weight: '200', forty_time: 4.50, vertical: 34, broad_jump: '10\'0"', shuttle: 4.20, three_cone: 6.95, bench_reps: 16, grade: 87, projected_round: 1 },
  { id: '17', name: 'Chris Bell', position: 'WR', college: 'Louisville', height: '6\'2"', weight: '220', forty_time: 4.48, vertical: 36, broad_jump: '10\'3"', shuttle: 4.25, three_cone: 7.00, bench_reps: 18, grade: 87, projected_round: 1 },
  { id: '18', name: 'Christen Miller', position: 'DT', college: 'Georgia', height: '6\'4"', weight: '305', forty_time: 4.95, vertical: 28, broad_jump: '9\'1"', shuttle: 4.65, three_cone: 7.55, bench_reps: 32, grade: 86, projected_round: 1 },
  { id: '19', name: 'Caleb Banks', position: 'DT', college: 'Florida', height: '6\'6"', weight: '320', forty_time: 5.10, vertical: 26, broad_jump: '8\'9"', shuttle: 4.85, three_cone: 7.80, bench_reps: 30, grade: 86, projected_round: 1 },
  { id: '20', name: 'Max Klare', position: 'TE', college: 'Purdue', height: '6\'4"', weight: '245', forty_time: 4.65, vertical: 33, broad_jump: '9\'8"', shuttle: 4.40, three_cone: 7.20, bench_reps: 20, grade: 85, projected_round: 1 },
  { id: '21', name: 'Monroe Freeling', position: 'OT', college: 'Georgia', height: '6\'7"', weight: '315', forty_time: 5.12, vertical: 28, broad_jump: '8\'11"', shuttle: 4.78, three_cone: 7.75, bench_reps: 24, grade: 85, projected_round: 1 },
  { id: '22', name: 'Bryce Cosby', position: 'CB', college: 'Ball State', height: '5\'10"', weight: '188', forty_time: 4.42, vertical: 35, broad_jump: '10\'1"', shuttle: 4.12, three_cone: 6.88, bench_reps: 13, grade: 84, projected_round: 1 },
  { id: '23', name: 'Chase Bisontis', position: 'OL', college: 'Texas A&M', height: '6\'6"', weight: '320', forty_time: 5.20, vertical: 26, broad_jump: '8\'7"', shuttle: 4.90, three_cone: 7.90, bench_reps: 28, grade: 84, projected_round: 1 },
  { id: '24', name: 'Joe Royer', position: 'TE', college: 'Cincinnati', height: '6\'5"', weight: '250', forty_time: 4.70, vertical: 32, broad_jump: '9\'5"', shuttle: 4.50, three_cone: 7.30, bench_reps: 19, grade: 83, projected_round: 1 },
  { id: '25', name: 'Antonio Williams', position: 'WR', college: 'Clemson', height: '5\'11"', weight: '190', forty_time: 4.42, vertical: 34, broad_jump: '9\'11"', shuttle: 4.15, three_cone: 6.90, bench_reps: 11, grade: 83, projected_round: 1 },
  { id: '26', name: 'Kayden McDonald', position: 'DT', college: 'Ohio State', height: '6\'2"', weight: '310', forty_time: 5.05, vertical: 27, broad_jump: '8\'10"', shuttle: 4.75, three_cone: 7.65, bench_reps: 34, grade: 83, projected_round: 1 },
  { id: '27', name: 'Eli Stowers', position: 'TE', college: 'Vanderbilt', height: '6\'4"', weight: '240', forty_time: 4.58, vertical: 35, broad_jump: '10\'2"', shuttle: 4.35, three_cone: 7.10, bench_reps: 21, grade: 82, projected_round: 1 },
  { id: '28', name: 'Jadarian Price', position: 'RB', college: 'Notre Dame', height: '5\'10"', weight: '200', forty_time: 4.40, vertical: 36, broad_jump: '10\'4"', shuttle: 4.18, three_cone: 6.92, bench_reps: 16, grade: 82, projected_round: 1 },
  { id: '29', name: 'Donovan Jackson', position: 'OL', college: 'Ohio State', height: '6\'4"', weight: '320', forty_time: 5.18, vertical: 28, broad_jump: '9\'0"', shuttle: 4.80, three_cone: 7.80, bench_reps: 31, grade: 81, projected_round: 1 },
  { id: '30', name: 'Sonny Styles', position: 'S', college: 'Ohio State', height: '6\'4"', weight: '230', forty_time: 4.48, vertical: 37, broad_jump: '10\'6"', shuttle: 4.25, three_cone: 7.00, bench_reps: 20, grade: 81, projected_round: 1 },
];

export const FREE_AGENTS: FreeAgent[] = [
  // 2026 Projected Free Agents
  { id: 'fa1', name: 'Kenneth Walker III', position: 'RB', age: 25, prevTeam: 'SEA', marketValue: 10.5, tier: 'Starter' },
  { id: 'fa2', name: 'Breece Hall', position: 'RB', age: 24, prevTeam: 'NYJ', marketValue: 12.0, tier: 'Elite' },
  { id: 'fa3', name: 'George Pickens', position: 'WR', age: 25, prevTeam: 'PIT', marketValue: 24.5, tier: 'Elite' },
  { id: 'fa4', name: 'Garrett Wilson', position: 'WR', age: 25, prevTeam: 'NYJ', marketValue: 26.0, tier: 'Elite' },
  { id: 'fa5', name: 'Sauce Gardner', position: 'CB', age: 25, prevTeam: 'NYJ', marketValue: 22.0, tier: 'Elite' },
  { id: 'fa6', name: 'Aidan Hutchinson', position: 'EDGE', age: 25, prevTeam: 'DET', marketValue: 30.0, tier: 'Elite' },
  { id: 'fa7', name: 'Drake London', position: 'WR', age: 24, prevTeam: 'ATL', marketValue: 23.0, tier: 'Starter' },
  { id: 'fa8', name: 'Chris Olave', position: 'WR', age: 25, prevTeam: 'NO', marketValue: 23.5, tier: 'Starter' },
  { id: 'fa9', name: 'Kayvon Thibodeaux', position: 'EDGE', age: 25, prevTeam: 'NYG', marketValue: 25.0, tier: 'Starter' },
  { id: 'fa10', name: 'Derek Stingley Jr.', position: 'CB', age: 24, prevTeam: 'HOU', marketValue: 20.0, tier: 'Starter' },
  { id: 'fa11', name: 'Travis Etienne', position: 'RB', age: 27, prevTeam: 'JAX', marketValue: 8.5, tier: 'Rotation' },
  { id: 'fa12', name: 'Javonte Williams', position: 'RB', age: 25, prevTeam: 'DEN', marketValue: 7.0, tier: 'Rotation' },
  { id: 'fa13', name: 'Kyle Hamilton', position: 'S', age: 25, prevTeam: 'BAL', marketValue: 19.0, tier: 'Elite' },
  { id: 'fa14', name: 'Tyler Linderbaum', position: 'C', age: 25, prevTeam: 'BAL', marketValue: 16.5, tier: 'Elite' },
  { id: 'fa15', name: 'Jordan Davis', position: 'DT', age: 26, prevTeam: 'PHI', marketValue: 18.0, tier: 'Starter' },
];

export const DRAFT_ORDER = [
  'CAR', 'TEN', 'NE', 'NYG', 'LV', 'ARI', 'DEN', 'NO', 'WAS', 'IND',
  'CHI', 'MIN', 'ATL', 'TB', 'SEA', 'PIT', 'JAX', 'CLE', 'MIA', 'LAR',
  'LAC', 'DAL', 'PHI', 'GB', 'NYJ', 'HOU', 'BUF', 'DET', 'BAL', 'CIN', 'SF', 'KC'
];

export const HISTORICAL_PERFORMANCE = [
  { id: 1, year: 2023, pick: 1, team: 'CAR', player: 'Bryce Young', position: 'QB', av: 6, expected_av: 12, value_diff: -6 },
  { id: 2, year: 2023, pick: 2, team: 'HOU', player: 'C.J. Stroud', position: 'QB', av: 16, expected_av: 10, value_diff: 6 },
  { id: 3, year: 2023, pick: 3, team: 'HOU', player: 'Will Anderson Jr.', position: 'EDGE', av: 10, expected_av: 9, value_diff: 1 },
  { id: 4, year: 2023, pick: 4, team: 'IND', player: 'Anthony Richardson', position: 'QB', av: 4, expected_av: 8, value_diff: -4 },
  { id: 5, year: 2023, pick: 5, team: 'SEA', player: 'Devon Witherspoon', position: 'CB', av: 11, expected_av: 8, value_diff: 3 },
  { id: 6, year: 2023, pick: 20, team: 'SEA', player: 'Jaxon Smith-Njigba', position: 'WR', av: 8, expected_av: 5, value_diff: 3 },
  { id: 7, year: 2023, pick: 175, team: 'LAR', player: 'Puka Nacua', position: 'WR', av: 14, expected_av: 2, value_diff: 12 },
  { id: 8, year: 2022, pick: 1, team: 'JAX', player: 'Travon Walker', position: 'EDGE', av: 7, expected_av: 10, value_diff: -3 },
  { id: 9, year: 2022, pick: 2, team: 'DET', player: 'Aidan Hutchinson', position: 'EDGE', av: 15, expected_av: 9, value_diff: 6 },
  { id: 10, year: 2022, pick: 262, team: 'SF', player: 'Brock Purdy', position: 'QB', av: 18, expected_av: 1, value_diff: 17 },
];