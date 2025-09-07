import Database from 'better-sqlite3';
import path from 'node:path';
import { getUserDataPath } from '@/paths/paths';

export class CostProtectionService {
  private db: Database.Database;
  private limits = {
    daily: 10.0,
    monthly: 100.0,
    perRequest: 1.0,
  };
  private costsPerK = new Map<string, number>([
    ['gpt-4', 0.03],
    ['gpt-3.5-turbo', 0.002],
    ['claude-3-opus', 0.015],
    ['claude-3-haiku', 0.00025],
  ]);

  constructor() {
    const dbPath = path.join(getUserDataPath(), 'sqlite.db');
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model TEXT,
        tokens INTEGER,
        cost REAL,
        timestamp INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_api_costs_day ON api_costs(timestamp);
    `);
  }

  estimateCost(model: string, tokens: number): number {
    const perK = this.costsPerK.get(model) ?? 0.002;
    return (tokens / 1000) * perK;
    
  }

  getSpentToday(): number {
    const startOfDay = Math.floor(new Date(new Date().toDateString()).getTime() / 1000);
    const row = this.db.prepare(`SELECT COALESCE(SUM(cost),0) as total FROM api_costs WHERE timestamp >= ?`).get(startOfDay) as any;
    return Number(row?.total || 0);
  }

  checkBeforeRequest(model: string, tokens: number): { allowed: boolean; cost: number; fallback?: string; reason?: string } {
    const est = this.estimateCost(model, tokens);
    const spent = this.getSpentToday();
    if (est > this.limits.perRequest) {
      return { allowed: false, cost: est, fallback: 'gpt-3.5-turbo', reason: `Per-request limit exceeded: $${est.toFixed(2)} > $${this.limits.perRequest}` };
    }
    if (spent + est > this.limits.daily) {
      return { allowed: false, cost: est, fallback: 'gpt-3.5-turbo', reason: `Daily limit reached: $${spent.toFixed(2)}/$${this.limits.daily}` };
    }
    return { allowed: true, cost: est };
  }

  logCost(model: string, tokens: number, actualCost?: number): void {
    const cost = actualCost ?? this.estimateCost(model, tokens);
    this.db.prepare(`INSERT INTO api_costs(model, tokens, cost, timestamp) VALUES(?,?,?,?)`).run(model, tokens, cost, Math.floor(Date.now()/1000));
  }

  getSummary(): { spentToday: number; dailyLimit: number } {
    return { spentToday: this.getSpentToday(), dailyLimit: this.limits.daily };
  }
}
export default CostProtectionService;

