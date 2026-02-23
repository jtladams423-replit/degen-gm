# DEGEN GM - Multi-Sport Draft Analysis Dashboard

## Overview

DEGEN GM is a full-stack multi-sport Draft Analysis Dashboard supporting NFL and NBA with interactive mock drafts, trade machine, team builder, player comparison, and live stats integration. The platform provides comprehensive tools for sports enthusiasts, analysts, and team management to simulate, analyze, and track draft-related data across major sports, enhancing strategic decision-making and fostering community engagement through collaborative features.

## Features

- **Interactive Mock Drafts** - Multi-round, multi-user drafts with CPU AI picks utilizing a need-aware algorithm (55% BPA + 45% team need)
- **NBA Trade Machine** - CBA salary matching validation with tiered rules, apron restrictions, and multi-team support
- **Team Builder** - Multi-year cap sheet projections with free agent timelines and visual contract indicators
- **Player Comparison Tool** - Advanced metrics display with radar charts and side-by-side analysis
- **Live NBA/College Basketball Stats** - Nightly scraping from Basketball Reference and Sports Reference CBB
- **NBA Lottery Simulator** - Simulate lottery odds and draft scenarios
- **Historical Draft Analysis** - Year-over-year performance tracking, value-added analysis, top steals/reaches
- **Real-time Collaborative Drafts** - WebSocket-powered shared draft sessions with shareable URLs
- **Multi-Sport Support** - Seamless switching between NFL (7 rounds, 32 teams) and NBA (2 rounds, 30 teams)

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Wouter, TanStack React Query, Recharts, Framer Motion
- **Backend**: Express.js 5, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket (ws)
- **Data Sources**: Basketball Reference, Sports Reference CBB, Sportradar API, Ball Don't Lie API

## Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/degen-gm.git
cd degen-gm
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/degengm
SPORTRADAR_API_KEY=your_sportradar_key
BALLDONTLIE_API_KEY=your_key
```

### 4. Set up the database

```bash
npm run db:push
```

### 5. Start development server

```bash
npm run dev
```

The app will be available at http://localhost:5000

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (frontend + backend) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push schema to database |

## Project Structure

```
degen-gm/
├── client/
│   ├── src/
│   │   ├── components/       # Reusable UI components (buttons, cards, forms, etc.)
│   │   ├── pages/            # Page components (MockDraft, Compare, TradeMachine, TeamBuilder, etc.)
│   │   ├── lib/              # Utilities, contexts, hooks (sportContext, rookieScale, etc.)
│   │   ├── App.tsx           # Main app with routing
│   │   └── index.css         # Tailwind CSS styles
│   ├── public/               # Static assets
│   └── index.html            # HTML entry point
├── server/
│   ├── routes.ts             # API route handlers
│   ├── storage.ts            # Database operations (Drizzle ORM)
│   ├── middleware.ts         # Error handling, validation, logging
│   ├── tradeEngine.ts        # NBA CBA trade validation engine
│   ├── scheduler.ts          # Nightly data scraping cron jobs (midnight PST)
│   ├── draftSession.ts       # WebSocket draft session management
│   ├── draftLive.ts          # Live draft service
│   ├── nbaStatsScraper.ts    # Basketball Reference scraper (per-game stats)
│   ├── nbaStandingsScraper.ts # NBA standings scraper
│   ├── collegeStatsScraper.ts # College basketball stats scraper
│   ├── balldontlie.ts        # Ball Don't Lie API integration
│   ├── sportradar.ts         # Sportradar NFL Draft API integration
│   ├── index.ts              # Express server setup
│   └── vite.ts               # Vite development server integration
├── shared/
│   └── schema.ts             # Drizzle ORM schema definitions + Zod types
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
└── README.md
```

## API Endpoints

### Prospects & Draft

- `GET /api/prospects?sport=NFL|NBA&year=2026` - Get draft prospects
- `GET /api/draft-order?sport=NFL|NBA&year=2026` - Get draft order
- `POST /api/mock-drafts` - Create mock draft
- `GET /api/mock-drafts` - Get all mock drafts for a sport
- `GET /api/mock-drafts/:id` - Get mock draft with picks
- `DELETE /api/mock-drafts/:id` - Delete mock draft

### Teams & Rosters

- `GET /api/teams?sport=NFL|NBA` - Get all teams
- `GET /api/teams/:code?sport=NFL|NBA` - Get team by code
- `GET /api/roster?sport=NFL|NBA&team=TEAMCODE` - Get roster players
- `GET /api/free-agents?sport=NFL|NBA` - Get free agents

### Trade Machine

- `POST /api/trade/validate` - Validate trade proposal with CBA rules
- `POST /api/trade-proposals` - Save trade proposal
- `POST /api/trade/execute` - Execute accepted trade and update rosters

### Stats & Data

- `GET /api/nba-stats` - Get live NBA player season stats
- `GET /api/nba-standings` - Get NBA team standings and conference rankings
- `GET /api/college-stats?playerName=NAME` - Get college basketball stats
- `GET /api/historical-performance?sport=NFL|NBA` - Get historical draft performance
- `POST /api/nba-stats/scrape` - Manually trigger NBA stats scrape
- `POST /api/nba-standings/scrape` - Manually trigger standings scrape
- `POST /api/college-stats/scrape` - Manually trigger college stats scrape

### Team Builder

- `GET /api/team-builder-saves` - Get all saved team builder states
- `POST /api/team-builder-saves` - Save team builder state

### Data Seeding

- `POST /api/seed` - Auto-seed database with initial data (teams, prospects, free agents, draft orders)
- `POST /api/reseed` - Clear and reseed database

## Data Architecture

### Multi-Sport Support

All relevant database tables include a `sport` column (default 'NFL') enabling sport-specific data filtering:

- **NFL**: 7 rounds, 32 teams per round, positions (QB/RB/WR/TE/OT/OL/EDGE/DL/DT/LB/CB/S)
  - Combine metrics: 40-yard dash, vertical, bench press, broad jump, shuttle, 3-cone
- **NBA**: 2 rounds, 30 teams per round, positions (PG/SG/SF/PF/C)
  - Combine metrics: wingspan, standing reach, vertical, lane agility, sprint, shuttle

### Key Tables

- **prospects** - Draft prospects with college, physical attributes, and combine metrics
- **teams** - Team information, primary color, salary cap space, team needs
- **draft_order** - Pick order by year, round, and team with trade tracking
- **free_agents** - Available free agents with market value and contract projections
- **roster_players** - Current team rosters with salary, contract details, and status
- **mock_drafts** - Saved mock draft scenarios with results
- **trade_proposals** - Trade proposals with validation results
- **team_builder_saves** - Saved team salary cap sheets and roster configurations
- **player_season_stats** - NBA player per-game stats (synced nightly)
- **team_standings** - NBA team standings and conference rankings (synced nightly)
- **college_stats** - College basketball player stats from draft prospects
- **cap_settings** - NBA salary cap rules by year (salary cap, tax line, aprons)

## Data Sources & Integration

### Live Data Scrapers

The scheduler (`server/scheduler.ts`) runs nightly at **midnight PST** (America/Los_Angeles) to:

1. **NBA Player Stats** (`server/nbaStatsScraper.ts`)
   - Scrapes per-game statistics from Basketball Reference
   - Tracks PPG, RPG, APG, FG%, 3P%, FT%, and more

2. **NBA Standings** (`server/nbaStandingsScraper.ts`)
   - Captures W-L records, conference rankings, and division standings
   - Updates win percentage and games behind

3. **College Stats** (`server/collegeStatsScraper.ts`)
   - Visits individual school pages on Sports Reference CBB
   - Supports 60+ college-to-URL-slug mappings
   - Uses suffix-aware name matching (Jr., II, III)
   - Implements 3-second request delays and fallback to previous season

### External APIs

- **Sportradar NFL Draft API** (`server/sportradar.ts`)
  - Historical draft data (2022-2025)
  - Live draft polling with retry logic
  - Requires API key stored as Replit secret

- **Ball Don't Lie API** (`server/balldontlie.ts`)
  - NBA roster synchronization
  - Optional automated sync for team rosters

## Core Features

### Mock Drafts

- Support multi-round scenarios (1-7 rounds NFL, 1-2 rounds NBA)
- Multi-user and CPU-controlled teams
- CPU AI picks use need-aware algorithm: 55% Best Player Available + 45% Team Need
- Compensatory pick toggles
- Pre-draft pick trading
- WebSocket-powered real-time collaborative sessions with shareable URLs
- Results can be exported to Team Builder for salary cap projection

### Trade Machine

- Server-side CBA salary matching validation
- Tiered salary matching rules (base, apron, hard cap)
- 2-4 team trade support
- Roster size validation (12-15 players)
- Apron restriction enforcement
- Trade execution updates team rosters permanently
- Changes reflected in Team Builder cap projections

### Team Builder

- Multi-year salary projections (5-year window)
- Automatic cap space calculation
- Free agent timeline visualization
- Visual indicators: NTC badges, expiring contracts, cap status
- Save/export/import builder state
- Persists to database for history tracking
- Integrates mock draft results for rookie salary projections

### Rookie Salary Scale

(`client/src/lib/rookieScale.ts`)
- NBA 30-slot salary projections with multi-year breakdowns
- NFL pick-to-value mappings
- Integrated with Mock Draft and Team Builder for accurate cap projections

## Development Guidelines

### Adding a Feature

1. Define data model in `shared/schema.ts`
   - Create Drizzle table
   - Generate insert/select schemas with `drizzle-zod`
   - Export TypeScript types
2. Implement storage interface in `server/storage.ts`
   - Add CRUD methods to `IStorage` interface
   - Use Drizzle queries against PostgreSQL
3. Add API routes in `server/routes.ts`
   - Validate requests with Zod schemas
   - Use storage interface for data access
   - Keep routes thin and focused
4. Build frontend components in `client/src/pages` or `client/src/components`
   - Use Wouter for routing
   - Integrate TanStack Query for data fetching
   - Add `data-testid` attributes for testing
5. Update `client/src/App.tsx` if adding new pages

### Code Style

- Follow existing patterns for consistency
- Use TypeScript for type safety
- Implement Tailwind CSS for styling
- Use Framer Motion for animations
- Leverage Recharts for data visualization

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SPORTRADAR_API_KEY` | No | Sportradar API key for NFL draft data |
| `BALLDONTLIE_API_KEY` | No | Ball Don't Lie API key for NBA roster sync |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support & Issues

For questions, feature requests, or bug reports, please open an issue on the GitHub repository.
