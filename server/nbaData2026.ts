// NBA data updated Feb 21, 2026 - Sources: Tankathon, ESPN, The Athletic, Spotrac, Basketball Reference
// Draft order based on current 2025-26 NBA standings (verified via basketball-reference.com/leagues/NBA_2026_standings.html)
// Prospects from Tankathon 2026 NBA Draft Big Board
// Free agents: 2026 upcoming FAs (contracts expiring after 2025-26 season)

export const nbaTeams2026 = [
  { code: 'SAC', name: 'Sacramento Kings', primaryColor: '#5A2D81', needs: ['PG', 'SF', 'PF', 'C', 'SG'], capSpace: -8.0, sport: 'NBA' as const },
  { code: 'IND', name: 'Indiana Pacers', primaryColor: '#002D62', needs: ['SG', 'PF', 'SF', 'C', 'PG'], capSpace: 19.0, sport: 'NBA' as const },
  { code: 'NOP', name: 'New Orleans Pelicans', primaryColor: '#0C2340', needs: ['SG', 'PF', 'C', 'SF', 'PG'], capSpace: 9.0, sport: 'NBA' as const },
  { code: 'BKN', name: 'Brooklyn Nets', primaryColor: '#000000', needs: ['PG', 'C', 'SF', 'PF', 'SG'], capSpace: 44.0, sport: 'NBA' as const },
  { code: 'WAS', name: 'Washington Wizards', primaryColor: '#002B5C', needs: ['SG', 'C', 'PF', 'SF', 'PG'], capSpace: 81.0, sport: 'NBA' as const },
  { code: 'UTA', name: 'Utah Jazz', primaryColor: '#002B5C', needs: ['PG', 'SG', 'SF', 'C', 'PF'], capSpace: 48.0, sport: 'NBA' as const },
  { code: 'DAL', name: 'Dallas Mavericks', primaryColor: '#00538C', needs: ['C', 'SG', 'PF', 'SF', 'PG'], capSpace: -7.0, sport: 'NBA' as const },
  { code: 'MEM', name: 'Memphis Grizzlies', primaryColor: '#5D76A9', needs: ['PF', 'C', 'SF', 'SG', 'PG'], capSpace: 25.0, sport: 'NBA' as const },
  { code: 'CHI', name: 'Chicago Bulls', primaryColor: '#CE1141', needs: ['PG', 'C', 'SF', 'SG', 'PF'], capSpace: 35.0, sport: 'NBA' as const },
  { code: 'MIL', name: 'Milwaukee Bucks', primaryColor: '#00471B', needs: ['SG', 'SF', 'C', 'PF', 'PG'], capSpace: -19.0, sport: 'NBA' as const },
  { code: 'CHA', name: 'Charlotte Hornets', primaryColor: '#1D1160', needs: ['PF', 'C', 'SG', 'SF', 'PG'], capSpace: 3.0, sport: 'NBA' as const },
  { code: 'ATL', name: 'Atlanta Hawks', primaryColor: '#E03A3E', needs: ['PG', 'C', 'PF', 'SF', 'SG'], capSpace: 16.0, sport: 'NBA' as const },
  { code: 'POR', name: 'Portland Trail Blazers', primaryColor: '#E03A3E', needs: ['C', 'PF', 'SG', 'SF', 'PG'], capSpace: 18.0, sport: 'NBA' as const },
  { code: 'LAC', name: 'Los Angeles Clippers', primaryColor: '#C8102E', needs: ['PG', 'C', 'SG', 'SF', 'PF'], capSpace: 68.0, sport: 'NBA' as const },
  { code: 'GSW', name: 'Golden State Warriors', primaryColor: '#1D428A', needs: ['SF', 'SG', 'PF', 'C', 'PG'], capSpace: -26.0, sport: 'NBA' as const },
  { code: 'MIA', name: 'Miami Heat', primaryColor: '#98002E', needs: ['PG', 'SF', 'PF', 'C', 'SG'], capSpace: -12.0, sport: 'NBA' as const },
  { code: 'ORL', name: 'Orlando Magic', primaryColor: '#0077C0', needs: ['SG', 'PF', 'C', 'SF', 'PG'], capSpace: 28.0, sport: 'NBA' as const },
  { code: 'PHI', name: 'Philadelphia 76ers', primaryColor: '#006BB6', needs: ['SF', 'PF', 'C', 'SG', 'PG'], capSpace: -5.0, sport: 'NBA' as const },
  { code: 'PHX', name: 'Phoenix Suns', primaryColor: '#1D1160', needs: ['PG', 'C', 'PF', 'SF', 'SG'], capSpace: -43.0, sport: 'NBA' as const },
  { code: 'TOR', name: 'Toronto Raptors', primaryColor: '#CE1141', needs: ['PG', 'PF', 'C', 'SF', 'SG'], capSpace: 22.0, sport: 'NBA' as const },
  { code: 'MIN', name: 'Minnesota Timberwolves', primaryColor: '#0C2340', needs: ['PG', 'SF', 'PF', 'C', 'SG'], capSpace: -14.0, sport: 'NBA' as const },
  { code: 'LAL', name: 'Los Angeles Lakers', primaryColor: '#552583', needs: ['C', 'SF', 'SG', 'PF', 'PG'], capSpace: 56.0, sport: 'NBA' as const },
  { code: 'DEN', name: 'Denver Nuggets', primaryColor: '#0E2240', needs: ['SG', 'SF', 'PF', 'C', 'PG'], capSpace: -10.0, sport: 'NBA' as const },
  { code: 'NYK', name: 'New York Knicks', primaryColor: '#006BB6', needs: ['PG', 'SF', 'C', 'SG', 'PF'], capSpace: -20.0, sport: 'NBA' as const },
  { code: 'CLE', name: 'Cleveland Cavaliers', primaryColor: '#860038', needs: ['SF', 'PF', 'C', 'SG', 'PG'], capSpace: -6.0, sport: 'NBA' as const },
  { code: 'HOU', name: 'Houston Rockets', primaryColor: '#CE1141', needs: ['SF', 'PF', 'C', 'SG', 'PG'], capSpace: 43.0, sport: 'NBA' as const },
  { code: 'BOS', name: 'Boston Celtics', primaryColor: '#007A33', needs: ['PF', 'SG', 'SF', 'C', 'PG'], capSpace: -30.0, sport: 'NBA' as const },
  { code: 'SAS', name: 'San Antonio Spurs', primaryColor: '#C4CED4', needs: ['SG', 'SF', 'PF', 'C', 'PG'], capSpace: 62.0, sport: 'NBA' as const },
  { code: 'OKC', name: 'Oklahoma City Thunder', primaryColor: '#007AC1', needs: ['C', 'PF', 'SG', 'SF', 'PG'], capSpace: 35.0, sport: 'NBA' as const },
  { code: 'DET', name: 'Detroit Pistons', primaryColor: '#C8102E', needs: ['SF', 'PF', 'SG', 'C', 'PG'], capSpace: 35.0, sport: 'NBA' as const },
];

// Draft order based on Tankathon current standings (Feb 20, 2026)
// Includes traded picks noted as owning team
export const nbaDraftOrder2026 = (() => {
  // Round 1 order based on current standings with traded picks
  const round1 = [
    { pick: 1, team: 'SAC', originalTeam: 'SAC' },  // Sacramento Kings (12-45, worst record)
    { pick: 2, team: 'IND', originalTeam: 'IND' },  // Indiana Pacers (15-41)
    { pick: 3, team: 'ATL', originalTeam: 'NOP' },  // New Orleans pick -> Atlanta Hawks (via trade) (15-41)
    { pick: 4, team: 'BKN', originalTeam: 'BKN' },  // Brooklyn Nets (15-39)
    { pick: 5, team: 'WAS', originalTeam: 'WAS' },  // Washington Wizards (15-39)
    { pick: 6, team: 'UTA', originalTeam: 'UTA' },  // Utah Jazz (18-38)
    { pick: 7, team: 'DAL', originalTeam: 'DAL' },  // Dallas Mavericks (19-35)
    { pick: 8, team: 'MEM', originalTeam: 'MEM' },  // Memphis Grizzlies (20-33)
    { pick: 9, team: 'CHI', originalTeam: 'CHI' },  // Chicago Bulls (24-32)
    { pick: 10, team: 'MIL', originalTeam: 'MIL' }, // Milwaukee Bucks (23-30)
    { pick: 11, team: 'CHA', originalTeam: 'CHA' }, // Charlotte Hornets (26-30)
    { pick: 12, team: 'SAS', originalTeam: 'ATL' }, // Atlanta pick -> San Antonio Spurs (via trade) (27-30)
    { pick: 13, team: 'POR', originalTeam: 'POR' }, // Portland Trail Blazers (27-29)
    { pick: 14, team: 'OKC', originalTeam: 'LAC' }, // LA Clippers pick -> Oklahoma City Thunder (via trade) (27-28)
    { pick: 15, team: 'GSW', originalTeam: 'GSW' }, // Golden State Warriors (29-27)
    { pick: 16, team: 'MIA', originalTeam: 'MIA' }, // Miami Heat (29-27)
    { pick: 17, team: 'MEM', originalTeam: 'ORL' }, // Orlando pick -> Memphis (via trade) (29-25)
    { pick: 18, team: 'OKC', originalTeam: 'PHI' }, // Philadelphia pick -> OKC (via trade) (30-25)
    { pick: 19, team: 'CHA', originalTeam: 'PHX' }, // Phoenix pick -> Charlotte (via trade) (32-24)
    { pick: 20, team: 'TOR', originalTeam: 'TOR' }, // Toronto Raptors (33-23)
    { pick: 21, team: 'DET', originalTeam: 'MIN' }, // Minnesota pick -> Detroit (via trade) (34-22)
    { pick: 22, team: 'LAL', originalTeam: 'LAL' }, // Los Angeles Lakers (33-21)
    { pick: 23, team: 'DEN', originalTeam: 'DEN' }, // Denver Nuggets (35-21)
    { pick: 24, team: 'NYK', originalTeam: 'NYK' }, // New York Knicks (35-21)
    { pick: 25, team: 'ATL', originalTeam: 'CLE' }, // Cleveland pick -> Atlanta (via trade) (35-21)
    { pick: 26, team: 'PHI', originalTeam: 'HOU' }, // Houston pick -> Philadelphia (via trade) (34-20)
    { pick: 27, team: 'BOS', originalTeam: 'BOS' }, // Boston Celtics (36-19)
    { pick: 28, team: 'CLE', originalTeam: 'SAS' }, // San Antonio pick -> Cleveland (via trade) (39-16)
    { pick: 29, team: 'DAL', originalTeam: 'OKC' }, // Oklahoma City pick -> Dallas (via trade) (42-14)
    { pick: 30, team: 'MIN', originalTeam: 'DET' }, // Detroit pick -> Minnesota (via trade) (41-13)
  ];

  // Round 2 follows inverse standings (no lottery) with traded picks
  const round2 = [
    { pick: 31, team: 'SAC' },
    { pick: 32, team: 'IND' },
    { pick: 33, team: 'NOP' },
    { pick: 34, team: 'BKN' },
    { pick: 35, team: 'WAS' },
    { pick: 36, team: 'UTA' },
    { pick: 37, team: 'DAL' },
    { pick: 38, team: 'MEM' },
    { pick: 39, team: 'CHI' },
    { pick: 40, team: 'MIL' },
    { pick: 41, team: 'CHA' },
    { pick: 42, team: 'ATL' },
    { pick: 43, team: 'POR' },
    { pick: 44, team: 'LAC' },
    { pick: 45, team: 'GSW' },
    { pick: 46, team: 'MIA' },
    { pick: 47, team: 'ORL' },
    { pick: 48, team: 'PHI' },
    { pick: 49, team: 'PHX' },
    { pick: 50, team: 'TOR' },
    { pick: 51, team: 'MIN' },
    { pick: 52, team: 'LAL' },
    { pick: 53, team: 'DEN' },
    { pick: 54, team: 'NYK' },
    { pick: 55, team: 'CLE' },
    { pick: 56, team: 'HOU' },
    { pick: 57, team: 'BOS' },
    { pick: 58, team: 'SAS' },
    { pick: 59, team: 'OKC' },
    { pick: 60, team: 'DET' },
  ];

  return [...round1, ...round2].map(p => ({
    year: 2026,
    pickNumber: p.pick,
    round: p.pick <= 30 ? 1 : 2,
    teamCode: p.team,
    originalTeamCode: ('originalTeam' in p ? p.originalTeam : p.team) as string,
    sport: 'NBA' as const,
  }));
})();

// 2026 NBA Draft Big Board - Tankathon rankings (Feb 2026)
export const nbaProspects2026 = [
  // TIER 1 - Consensus Top 3
  { name: 'Darryn Peterson', position: 'SG', college: 'Kansas', height: '6\'6"', weight: '205', grade: 98, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'10"', standingReach: '8\'7"', vertical: 42, laneAgility: 10.1, sprint: 3.0 },
  { name: 'Cameron Boozer', position: 'PF', college: 'Duke', height: '6\'9"', weight: '250', grade: 97, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'11"', vertical: 36, laneAgility: 10.5, sprint: 3.2 },
  { name: 'AJ Dybantsa', position: 'SF', college: 'BYU', height: '6\'9"', weight: '210', grade: 96, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'1"', standingReach: '9\'0"', vertical: 40, laneAgility: 10.3, sprint: 3.1 },
  // Top 10
  { name: 'Caleb Wilson', position: 'SF', college: 'North Carolina', height: '6\'10"', weight: '215', grade: 94, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'2"', standingReach: '9\'1"', vertical: 39, laneAgility: 10.4, sprint: 3.2 },
  { name: 'Kingston Flemings', position: 'PG', college: 'Houston', height: '6\'4"', weight: '190', grade: 93, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'8"', standingReach: '8\'3"', vertical: 40, laneAgility: 10.1, sprint: 3.0 },
  { name: 'Mikel Brown Jr.', position: 'PG', college: 'Louisville', height: '6\'5"', weight: '190', grade: 92, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'9"', standingReach: '8\'4"', vertical: 39, laneAgility: 10.2, sprint: 3.1 },
  { name: 'Keaton Wagler', position: 'SG', college: 'Illinois', height: '6\'6"', weight: '185', grade: 91, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'10"', standingReach: '8\'6"', vertical: 38, laneAgility: 10.3, sprint: 3.1 },
  { name: 'Nate Ament', position: 'SF', college: 'Tennessee', height: '6\'10"', weight: '207', grade: 90, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'1"', standingReach: '9\'0"', vertical: 38, laneAgility: 10.4, sprint: 3.2 },
  { name: 'Darius Acuff', position: 'PG', college: 'Arkansas', height: '6\'3"', weight: '190', grade: 89, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'6"', standingReach: '8\'1"', vertical: 39, laneAgility: 10.2, sprint: 3.1 },
  { name: 'Braylon Mullins', position: 'SG', college: 'UConn', height: '6\'6"', weight: '196', grade: 88, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'10"', standingReach: '8\'6"', vertical: 38, laneAgility: 10.3, sprint: 3.1 },
  // 11-20
  { name: 'Hannes Steinbach', position: 'PF', college: 'Washington', height: '6\'11"', weight: '220', grade: 87, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'2"', standingReach: '9\'2"', vertical: 35, laneAgility: 10.6, sprint: 3.3 },
  { name: 'Labaron Philon', position: 'PG', college: 'Alabama', height: '6\'4"', weight: '175', grade: 86, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'7"', standingReach: '8\'1"', vertical: 40, laneAgility: 10.1, sprint: 3.0 },
  { name: 'Yaxel Lendeborg', position: 'PF', college: 'Michigan', height: '6\'10"', weight: '235', grade: 85, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'1"', standingReach: '9\'0"', vertical: 36, laneAgility: 10.5, sprint: 3.2 },
  { name: 'Brayden Burries', position: 'SG', college: 'Arizona', height: '6\'4"', weight: '205', grade: 84, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'8"', standingReach: '8\'3"', vertical: 39, laneAgility: 10.2, sprint: 3.1 },
  { name: 'Koa Peat', position: 'PF', college: 'Arizona', height: '6\'8"', weight: '235', grade: 83, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'10"', vertical: 37, laneAgility: 10.4, sprint: 3.2 },
  { name: 'Tounde Yessoufou', position: 'SG', college: 'Baylor', height: '6\'5"', weight: '215', grade: 82, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'9"', standingReach: '8\'4"', vertical: 40, laneAgility: 10.1, sprint: 3.0 },
  { name: 'Thomas Haugh', position: 'PF', college: 'Florida', height: '6\'9"', weight: '215', grade: 81, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'10"', vertical: 36, laneAgility: 10.5, sprint: 3.2 },
  { name: 'Jayden Quaintance', position: 'PF', college: 'Kentucky', height: '6\'11"', weight: '255', grade: 80, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'3"', standingReach: '9\'3"', vertical: 37, laneAgility: 10.6, sprint: 3.3 },
  { name: 'Bennett Stirtz', position: 'PG', college: 'Iowa', height: '6\'4"', weight: '190', grade: 79, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'7"', standingReach: '8\'2"', vertical: 38, laneAgility: 10.3, sprint: 3.1 },
  { name: 'Patrick Ngongba II', position: 'C', college: 'Duke', height: '6\'11"', weight: '250', grade: 78, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'4"', standingReach: '9\'5"', vertical: 34, laneAgility: 10.8, sprint: 3.4 },
  // 21-30
  { name: 'Chris Cenac Jr.', position: 'PF', college: 'Houston', height: '6\'11"', weight: '240', grade: 77, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'2"', standingReach: '9\'2"', vertical: 35, laneAgility: 10.7, sprint: 3.3 },
  { name: 'Karim Lopez', position: 'SF', college: 'International', height: '6\'8"', weight: '220', grade: 75, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'10"', vertical: 37, laneAgility: 10.5, sprint: 3.2 },
  { name: 'Tyler Tanner', position: 'PG', college: 'Vanderbilt', height: '6\'0"', weight: '175', grade: 74, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'3"', standingReach: '7\'10"', vertical: 39, laneAgility: 10.1, sprint: 3.0 },
  { name: 'Christian Anderson', position: 'PG', college: 'Texas Tech', height: '6\'3"', weight: '178', grade: 73, projectedRound: 1, sport: 'NBA' as const, wingspan: '6\'6"', standingReach: '8\'0"', vertical: 38, laneAgility: 10.2, sprint: 3.1 },
  { name: 'Malachi Moreno', position: 'C', college: 'Kentucky', height: '7\'0"', weight: '250', grade: 72, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'5"', standingReach: '9\'6"', vertical: 33, laneAgility: 10.9, sprint: 3.4 },
  { name: 'Joshua Jefferson', position: 'PF', college: 'Iowa State', height: '6\'9"', weight: '240', grade: 71, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'1"', standingReach: '9\'0"', vertical: 36, laneAgility: 10.5, sprint: 3.2 },
  { name: 'Aday Mara', position: 'C', college: 'Michigan', height: '7\'3"', weight: '255', grade: 70, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'7"', standingReach: '9\'8"', vertical: 31, laneAgility: 11.2, sprint: 3.5 },
  { name: 'Flory Bidunga', position: 'C', college: 'Kansas', height: '6\'10"', weight: '235', grade: 69, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'4"', standingReach: '9\'4"', vertical: 36, laneAgility: 10.7, sprint: 3.3 },
  { name: 'Morez Johnson Jr.', position: 'PF', college: 'Michigan', height: '6\'9"', weight: '250', grade: 68, projectedRound: 1, sport: 'NBA' as const, wingspan: '7\'1"', standingReach: '9\'0"', vertical: 35, laneAgility: 10.6, sprint: 3.3 },
  // 31-45 (Round 2 prospects)
  { name: 'Dailyn Swain', position: 'SG', college: 'Texas', height: '6\'8"', weight: '225', grade: 67, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'10"', vertical: 37, laneAgility: 10.5, sprint: 3.2 },
  { name: 'Sergio de Larrea', position: 'PG', college: 'International', height: '6\'6"', weight: '198', grade: 66, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'10"', standingReach: '8\'6"', vertical: 37, laneAgility: 10.4, sprint: 3.2 },
  { name: 'Ebuka Okorie', position: 'PG', college: 'Stanford', height: '6\'2"', weight: '185', grade: 65, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'5"', standingReach: '7\'11"', vertical: 39, laneAgility: 10.2, sprint: 3.1 },
  { name: 'Amari Allen', position: 'SF', college: 'Alabama', height: '6\'8"', weight: '205', grade: 64, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'10"', vertical: 38, laneAgility: 10.4, sprint: 3.2 },
  { name: 'Meleek Thomas', position: 'SG', college: 'Arkansas', height: '6\'4"', weight: '195', grade: 63, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'8"', standingReach: '8\'3"', vertical: 40, laneAgility: 10.1, sprint: 3.0 },
  { name: 'Tahaad Pettiford', position: 'PG', college: 'Auburn', height: '6\'1"', weight: '180', grade: 62, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'4"', standingReach: '7\'10"', vertical: 40, laneAgility: 10.0, sprint: 3.0 },
  { name: 'Killyan Toure', position: 'PF', college: 'Iowa State', height: '6\'9"', weight: '220', grade: 61, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'11"', vertical: 36, laneAgility: 10.5, sprint: 3.2 },
  { name: 'Rocco Zikarsky', position: 'C', college: 'International', height: '7\'1"', weight: '240', grade: 60, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'5"', standingReach: '9\'6"', vertical: 32, laneAgility: 11.1, sprint: 3.5 },
  { name: 'Noa Lopez', position: 'SF', college: 'International', height: '6\'8"', weight: '210', grade: 59, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'10"', vertical: 37, laneAgility: 10.4, sprint: 3.2 },
  { name: 'Marcus Allen', position: 'SG', college: 'Florida', height: '6\'5"', weight: '195', grade: 58, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'9"', standingReach: '8\'4"', vertical: 38, laneAgility: 10.3, sprint: 3.1 },
  { name: 'Jalen Shelley', position: 'SF', college: 'Michigan', height: '6\'7"', weight: '200', grade: 57, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'10"', standingReach: '8\'7"', vertical: 37, laneAgility: 10.5, sprint: 3.2 },
  { name: 'Elijah Saunders', position: 'PF', college: 'Colorado', height: '6\'9"', weight: '215', grade: 56, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'10"', vertical: 35, laneAgility: 10.7, sprint: 3.3 },
  { name: 'Jason Griffith', position: 'SG', college: 'UCLA', height: '6\'5"', weight: '195', grade: 54, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'8"', standingReach: '8\'3"', vertical: 37, laneAgility: 10.5, sprint: 3.2 },
  { name: 'Tucker DeVries', position: 'SF', college: 'Indiana', height: '6\'7"', weight: '205', grade: 53, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'10"', standingReach: '8\'7"', vertical: 36, laneAgility: 10.6, sprint: 3.3 },
  { name: 'Ian Jackson', position: 'SG', college: 'St. John\'s', height: '6\'5"', weight: '195', grade: 52, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'9"', standingReach: '8\'4"', vertical: 41, laneAgility: 10.1, sprint: 3.0 },
  // 46-60 (Late Round 2)
  { name: 'Johni Stewart', position: 'SG', college: 'Gonzaga', height: '6\'4"', weight: '190', grade: 48, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'7"', standingReach: '8\'2"', vertical: 38, laneAgility: 10.4, sprint: 3.2 },
  { name: 'Daniel Jacobsen', position: 'C', college: 'International', height: '7\'1"', weight: '235', grade: 47, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'5"', standingReach: '9\'6"', vertical: 31, laneAgility: 11.3, sprint: 3.6 },
  { name: 'Alex Karaban', position: 'PF', college: 'UConn', height: '6\'8"', weight: '225', grade: 46, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'11"', standingReach: '8\'9"', vertical: 34, laneAgility: 10.8, sprint: 3.4 },
  { name: 'Rubin Jones', position: 'PG', college: 'Seton Hall', height: '6\'3"', weight: '180', grade: 44, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'6"', standingReach: '8\'0"', vertical: 38, laneAgility: 10.3, sprint: 3.1 },
  { name: 'Trentyn Flowers', position: 'SF', college: 'Purdue', height: '6\'8"', weight: '205', grade: 42, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'0"', standingReach: '8\'9"', vertical: 36, laneAgility: 10.6, sprint: 3.3 },
  { name: 'JP Estrella', position: 'C', college: 'Florida', height: '6\'11"', weight: '230', grade: 40, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'3"', standingReach: '9\'3"', vertical: 32, laneAgility: 11.2, sprint: 3.5 },
  { name: 'Quadir Copeland', position: 'PG', college: 'Mississippi State', height: '6\'4"', weight: '190', grade: 39, projectedRound: 2, sport: 'NBA' as const, wingspan: '6\'7"', standingReach: '8\'2"', vertical: 38, laneAgility: 10.3, sprint: 3.1 },
  { name: 'Lazar Djokovic', position: 'C', college: 'International', height: '7\'0"', weight: '240', grade: 38, projectedRound: 2, sport: 'NBA' as const, wingspan: '7\'4"', standingReach: '9\'4"', vertical: 32, laneAgility: 11.1, sprint: 3.5 },
];

// 2026 NBA Free Agents - Contracts expiring after 2025-26 season
// Sources: Basketball Reference, Spotrac, ESPN (Feb 2026)
export const nbaFreeAgents2026 = [
  { name: 'LeBron James', position: 'SF', age: 41, prevTeam: 'LAL', marketValue: 50.0, tier: 'Elite', sport: 'NBA' as const, projectedYears: 1, projectedTotal: 50.0 },
  { name: 'Bradley Beal', position: 'SG', age: 33, prevTeam: 'PHX', marketValue: 25.0, tier: 'Elite', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 52.0 },
  { name: 'Kristaps Porzingis', position: 'C', age: 30, prevTeam: 'GSW', marketValue: 30.0, tier: 'Elite', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 95.0 },
  { name: 'Deandre Ayton', position: 'C', age: 28, prevTeam: 'POR', marketValue: 28.0, tier: 'Elite', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 88.0 },
  { name: 'Khris Middleton', position: 'SF', age: 34, prevTeam: 'DAL', marketValue: 15.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 30.0 },
  { name: 'CJ McCollum', position: 'SG', age: 34, prevTeam: 'ATL', marketValue: 14.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 28.0 },
  { name: 'Anfernee Simons', position: 'PG', age: 27, prevTeam: 'CHI', marketValue: 24.0, tier: 'Elite', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 100.0 },
  { name: 'Terry Rozier', position: 'PG', age: 32, prevTeam: 'MIA', marketValue: 20.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 62.0 },
  { name: 'Tobias Harris', position: 'PF', age: 34, prevTeam: 'DET', marketValue: 14.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 28.0 },
  { name: 'John Collins', position: 'PF', age: 29, prevTeam: 'LAC', marketValue: 18.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 56.0 },
  { name: 'Marcus Smart', position: 'SG', age: 32, prevTeam: 'LAL', marketValue: 16.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 50.0 },
  { name: 'Nikola Vucevic', position: 'C', age: 35, prevTeam: 'BOS', marketValue: 18.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 36.0 },
  { name: 'Norman Powell', position: 'SG', age: 33, prevTeam: 'MIA', marketValue: 20.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 42.0 },
  { name: 'Jusuf Nurkic', position: 'C', age: 31, prevTeam: 'UTA', marketValue: 14.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 44.0 },
  { name: 'Harrison Barnes', position: 'SF', age: 34, prevTeam: 'SAS', marketValue: 14.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 28.0 },
  { name: 'Collin Sexton', position: 'PG', age: 27, prevTeam: 'CHI', marketValue: 16.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 68.0 },
  { name: 'Rui Hachimura', position: 'PF', age: 28, prevTeam: 'LAL', marketValue: 16.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 50.0 },
  { name: 'Zach Collins', position: 'C', age: 28, prevTeam: 'CHI', marketValue: 12.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 38.0 },
  { name: 'Kevin Huerter', position: 'SG', age: 27, prevTeam: 'DET', marketValue: 14.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 60.0 },
  { name: 'Jordan Clarkson', position: 'SG', age: 34, prevTeam: 'NYK', marketValue: 12.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 24.0 },
  { name: 'Kelly Olynyk', position: 'C', age: 35, prevTeam: 'SAS', marketValue: 10.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 20.0 },
  { name: 'Robert Williams III', position: 'C', age: 28, prevTeam: 'POR', marketValue: 12.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 38.0 },
  { name: 'Mitchell Robinson', position: 'C', age: 28, prevTeam: 'NYK', marketValue: 10.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 32.0 },
  { name: 'Coby White', position: 'SG', age: 26, prevTeam: 'CHA', marketValue: 12.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 52.0 },
  { name: 'Matisse Thybulle', position: 'SF', age: 29, prevTeam: 'POR', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 25.0 },
  { name: 'Gabe Vincent', position: 'PG', age: 30, prevTeam: 'ATL', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 16.0 },
  { name: 'Luke Kennard', position: 'SG', age: 30, prevTeam: 'LAL', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 16.0 },
  { name: 'Mike Conley', position: 'PG', age: 38, prevTeam: 'MIN', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 1, projectedTotal: 8.0 },
  { name: 'Jaden Ivey', position: 'SG', age: 24, prevTeam: 'CHI', marketValue: 14.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 60.0 },
  { name: 'Lonzo Ball', position: 'PG', age: 28, prevTeam: 'UTA', marketValue: 10.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 20.0 },
  { name: 'Duncan Robinson', position: 'SG', age: 31, prevTeam: 'DET', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 16.0 },
  { name: 'Pat Connaughton', position: 'SG', age: 33, prevTeam: 'CHA', marketValue: 6.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 12.0 },
  { name: 'Bennedict Mathurin', position: 'SG', age: 23, prevTeam: 'LAC', marketValue: 14.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 60.0 },
  { name: 'Quentin Grimes', position: 'SG', age: 26, prevTeam: 'PHI', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 25.0 },
  { name: 'Kelly Oubre Jr', position: 'SG', age: 30, prevTeam: 'PHI', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 16.0 },
  { name: 'Simone Fontecchio', position: 'SF', age: 30, prevTeam: 'MIA', marketValue: 6.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 12.0 },
  { name: 'Georges Niang', position: 'PF', age: 33, prevTeam: 'MEM', marketValue: 6.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 12.0 },
  { name: 'Vasilije Micic', position: 'PG', age: 32, prevTeam: 'MIL', marketValue: 7.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 14.0 },
  { name: 'Jock Landale', position: 'C', age: 30, prevTeam: 'ATL', marketValue: 7.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 14.0 },
  { name: 'Ayo Dosunmu', position: 'PG', age: 26, prevTeam: 'MIN', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 25.0 },
  { name: 'Jeremy Sochan', position: 'PF', age: 22, prevTeam: 'SAS', marketValue: 10.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 44.0 },
  { name: 'Tyus Jones', position: 'PG', age: 30, prevTeam: 'DAL', marketValue: 7.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 14.0 },
  { name: 'Jalen Duren', position: 'C', age: 22, prevTeam: 'DET', marketValue: 16.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 68.0 },
  { name: 'Cam Thomas', position: 'SG', age: 23, prevTeam: 'MIL', marketValue: 16.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 68.0 },
  { name: 'Tari Eason', position: 'PF', age: 24, prevTeam: 'HOU', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 25.0 },
  { name: 'Dario Saric', position: 'PF', age: 32, prevTeam: 'DET', marketValue: 5.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 10.0 },
  { name: 'Walker Kessler', position: 'C', age: 24, prevTeam: 'UTA', marketValue: 12.0, tier: 'Starter', sport: 'NBA' as const, projectedYears: 4, projectedTotal: 52.0 },
  { name: 'Peyton Watson', position: 'SF', age: 23, prevTeam: 'DEN', marketValue: 6.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 19.0 },
  { name: 'Kevin Love', position: 'PF', age: 38, prevTeam: 'UTA', marketValue: 4.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 1, projectedTotal: 4.0 },
  { name: 'Andre Drummond', position: 'C', age: 33, prevTeam: 'PHI', marketValue: 5.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 1, projectedTotal: 5.0 },
  { name: 'Moritz Wagner', position: 'C', age: 29, prevTeam: 'ORL', marketValue: 5.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 10.0 },
  { name: 'Nick Richards', position: 'C', age: 28, prevTeam: 'CHI', marketValue: 5.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 2, projectedTotal: 10.0 },
  { name: 'Dean Wade', position: 'PF', age: 29, prevTeam: 'CLE', marketValue: 6.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 19.0 },
  { name: 'Ochai Agbaji', position: 'SF', age: 26, prevTeam: 'BKN', marketValue: 6.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 19.0 },
  { name: 'Mark Williams', position: 'C', age: 24, prevTeam: 'PHX', marketValue: 8.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 25.0 },
  { name: 'Dalen Terry', position: 'SG', age: 23, prevTeam: 'PHI', marketValue: 5.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 16.0 },
  { name: 'Malaki Branham', position: 'SG', age: 22, prevTeam: 'CHA', marketValue: 5.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 16.0 },
  { name: 'Ousmane Dieng', position: 'SF', age: 22, prevTeam: 'MIL', marketValue: 5.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 16.0 },
  { name: 'Kobe Bufkin', position: 'PG', age: 22, prevTeam: 'LAL', marketValue: 5.0, tier: 'Rotation', sport: 'NBA' as const, projectedYears: 3, projectedTotal: 16.0 },
];
