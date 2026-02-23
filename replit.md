# Draft Analysis Dashboard

## Overview
A full-stack multi-sport Draft Analysis Dashboard supporting NFL and NBA. Key features include interactive mock drafts (multi-user, configurable rounds), year-over-year performance analysis, team cap space tracking, free agent information, and sport-specific Combine statistics. The application allows seamless switching between NFL and NBA modes via a sport selector.

The project aims to provide comprehensive tools for sports enthusiasts, analysts, and team management to simulate, analyze, and track draft-related data across major sports, enhancing strategic decision-making and fostering community engagement through collaborative features.

## User Preferences
I prefer clear, concise communication and detailed explanations when new features are introduced or significant changes are made. I value an iterative development approach, where changes are proposed and discussed before implementation. Please ask for confirmation before making any major architectural changes or introducing new external dependencies. When writing code, I appreciate well-structured, readable code with a focus on maintainability. Do not make changes to folder `node_modules`.

## System Architecture

### UI/UX Decisions
The dashboard features a dark theme with neon blue accents, utilizing Teko and Inter fonts for a modern and clean aesthetic. The layout includes a sidebar with a sport selector that globally switches the application's data and UI between NFL and NBA modes, persisting the selection in local storage.

### Technical Implementations
- **Frontend**: Built with React, TypeScript, Tailwind CSS v4, wouter for routing, TanStack React Query for data fetching, Recharts for data visualization, and framer-motion for animations.
- **Backend**: Implemented using Express.js with TypeScript.
- **Database**: PostgreSQL is used as the primary data store, managed with Drizzle ORM.
- **Multi-Sport Support**: All relevant database tables include a `sport` column (default 'NFL') to enable sport-specific data filtering. The `SportContext` provider manages sport-specific configurations.
    - **NFL**: Supports 7 rounds, 32 teams/round, and specific positions (QB/RB/WR/TE/OT/OL/EDGE/DL/DT/LB/CB/S). Combine data includes 40-yard dash, vertical, bench press, broad jump, shuttle, 3-cone.
    - **NBA**: Supports 2 rounds, 30 teams/round, and specific positions (PG/SG/SF/PF/C). Combine data includes wingspan, standing reach, vertical, lane agility, sprint, shuttle.
- **NBA Trade Machine**: Features a server-side CBA salary matching validation engine (`server/tradeEngine.ts`) that supports tiered salary matching rules, apron restrictions, roster size validation (12-15 players), and 2-4 team trades. Cap settings are configurable annually. Accepted trades can be executed to permanently update team rosters, with changes reflected in Team Builder.
- **Team Builder Cap Sheet**: Provides multi-year salary projections (5-year window), calculates cap space, and displays free agent timelines. Visual indicators highlight NTC badges, expiring contracts, and cap status. Supports save/export/import of builder state, with saves persisted in `team_builder_saves` DB table and viewable in History page's Team Builder tab.
- **Mock Drafts**: Supports multi-round (1-7 rounds NFL, 1-2 rounds NBA) and multi-user scenarios. CPU picks utilize a need-aware algorithm (55% BPA + 45% team need). Features include compensatory pick toggles, pre-draft pick trading, and graceful handling of prospect availability. Collaborative drafts are enabled via WebSockets for real-time state synchronization and shareable URLs. Mock draft results can be applied to Team Builder via localStorage to project rookie-scale salaries onto team cap sheets.
- **Rookie Salary Scale**: `client/src/lib/rookieScale.ts` provides NBA 30-slot and NFL pick-to-value rookie salary projections with multi-year contract breakdowns. Used by Mock Draft → Team Builder integration.
- **Data Seeding**: Auto-seeds on startup for both NFL and NBA data, including prospects, teams, free agents, and draft orders.
- **Scheduled Scraping**: `server/scheduler.ts` uses `node-cron` to run NBA player stats, team standings, and college basketball stats scrapers nightly at midnight PST (America/Los_Angeles). Scrapers: `server/nbaStatsScraper.ts` (per-game stats from Basketball Reference), `server/nbaStandingsScraper.ts` (team W-L records, conference rankings), and `server/collegeStatsScraper.ts` (per-game college stats from Sports Reference CBB school pages). Manual trigger endpoints: `POST /api/nba-stats/scrape`, `POST /api/nba-standings/scrape`, and `POST /api/college-stats/scrape`.
- **College Stats Scraping**: `server/collegeStatsScraper.ts` visits individual school pages on Sports Reference CBB (e.g., `/cbb/schools/duke/men/2026.html`) for each NBA prospect's college. Supports 60+ college-to-URL-slug mappings. Uses suffix-aware name matching (handles Jr., II, III suffixes) with 3-second delays between requests to avoid rate limiting. Fallback to previous season if current returns 404. College stats displayed on Compare page alongside NBA season stats.

### Feature Specifications
- **Live Draft**: Real-time draft board with a year selector and top prospects panel.
- **Historical Analysis**: Tracks past draft pick performance, value-added analysis, top steals/reaches, and position performance breakdowns.
- **Team Management**: Allows managing team rosters, depth charts, contracts, and cap space.
- **Trade Proposals**: Supports creating, validating, and applying trade proposals.

### System Design Choices
- **API Routes**: Standard RESTful API endpoints for data retrieval and manipulation, prefixed with `/api`.
- **WebSocket**: Utilized for real-time synchronization of collaborative draft sessions (`/ws/draft`).
- **Data Filtering**: All API routes accept a `?sport=NFL|NBA` query parameter to filter sport-specific data.

## External Dependencies
- **Sportradar NFL Draft API**: Integrated via `server/sportradar.ts` for historical draft data (2022-2025) and live draft polling. Includes retry logic, rate limit handling, and API key authentication (stored as Replit secret).
- **Prospect Data Sources**: PFF Big Board (primary), cross-referenced with Drafttek Top 500, Tankathon Big Board, NFL Draft Buzz, NFL Mock Draft Database Consensus.
- **Cap Space Data**: OverTheCap 2026 salary cap tracker.
- **Draft Order Data**: Tankathon 2026 full draft order.
- **Team Needs Data**: NFL.com and PFF combined analysis.
- **Free Agent Data**: Spotrac 2026 NFL Free Agents.