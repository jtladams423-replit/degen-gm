import { log } from "./index";

const API_KEY = process.env.SPORTRADAR_API_KEY || "";
const BASE_URL = "https://api.sportradar.com/draft/nfl/trial/v1/en";

interface FetchOptions {
  retries?: number;
  retryDelay?: number;
}

async function fetchFromSportradar(path: string, opts: FetchOptions = {}): Promise<any> {
  const { retries = 3, retryDelay = 1000 } = opts;
  const url = `${BASE_URL}${path}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "accept": "application/json",
          "x-api-key": API_KEY,
        },
      });

      if (res.status === 429) {
        const wait = retryDelay * Math.pow(2, attempt);
        log(`Rate limited by Sportradar, waiting ${wait}ms (attempt ${attempt + 1})`, "sportradar");
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Sportradar API error ${res.status}: ${text}`);
      }

      return await res.json();
    } catch (err: any) {
      if (attempt === retries) throw err;
      const wait = retryDelay * Math.pow(2, attempt);
      log(`Sportradar request failed, retrying in ${wait}ms: ${err.message}`, "sportradar");
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

export async function getProspects(year: number): Promise<any> {
  return fetchFromSportradar(`/${year}/prospects.json`);
}

export async function getTopProspects(year: number): Promise<any> {
  return fetchFromSportradar(`/${year}/top_prospects.json`);
}

export async function getDraftSummary(year: number): Promise<any> {
  return fetchFromSportradar(`/${year}/summary.json`);
}

export async function getTrades(year: number): Promise<any> {
  return fetchFromSportradar(`/${year}/trades.json`);
}
