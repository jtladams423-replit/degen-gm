type EventData = Record<string, string | number | boolean>;

class Analytics {
  private queue: { event: string; data: EventData; timestamp: number }[] = [];
  private isEnabled = true;

  track(event: string, data: EventData = {}) {
    if (!this.isEnabled) return;
    this.queue.push({
      event,
      data,
      timestamp: Date.now(),
    });
    if (this.queue.length > 100) {
      this.queue = this.queue.slice(-100);
    }
  }

  pageView(path: string) {
    this.track('page_view', { path });
  }

  sportSwitch(sport: string) {
    this.track('sport_switch', { sport });
  }

  mockDraftCreated(sport: string, rounds: number) {
    this.track('mock_draft_created', { sport, rounds });
  }

  tradeValidated(sport: string, teamCount: number, isValid: boolean) {
    this.track('trade_validated', { sport, teamCount, valid: isValid });
  }

  compareProspects(sport: string, count: number) {
    this.track('compare_prospects', { sport, count });
  }

  getEvents() {
    return [...this.queue];
  }

  disable() { this.isEnabled = false; }
  enable() { this.isEnabled = true; }
}

export const analytics = new Analytics();
