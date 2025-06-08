import { scans, type Scan, type InsertScan } from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getScan(id: number): Promise<Scan | undefined>;
  getAllScans(): Promise<Scan[]>;
  createScan(scan: Omit<Scan, 'id'>): Promise<Scan>;
  updateScan(id: number, updates: Partial<Scan>): Promise<Scan | undefined>;
  getRecentScans(limit?: number): Promise<Scan[]>;
}

export class MemStorage implements IStorage {
  private scans: Map<number, Scan>;
  private currentId: number;

  constructor() {
    this.scans = new Map();
    this.currentId = 1;
  }

  async getScan(id: number): Promise<Scan | undefined> {
    return this.scans.get(id);
  }

  async getAllScans(): Promise<Scan[]> {
    return Array.from(this.scans.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async createScan(scanData: Omit<Scan, 'id'>): Promise<Scan> {
    const id = this.currentId++;
    const scan: Scan = { ...scanData, id };
    this.scans.set(id, scan);
    return scan;
  }

  async updateScan(id: number, updates: Partial<Scan>): Promise<Scan | undefined> {
    const existing = this.scans.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.scans.set(id, updated);
    return updated;
  }

  async getRecentScans(limit: number = 10): Promise<Scan[]> {
    const allScans = await this.getAllScans();
    return allScans.slice(0, limit);
  }
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required for PostgresStorage');
    }
    
    // Handle URL encoding for special characters in Supabase URLs
    const encodedUrl = this.encodeSupabaseUrl(process.env.DATABASE_URL);
    const client = postgres(encodedUrl);
    this.db = drizzle(client);
  }

  private encodeSupabaseUrl(url: string): string {
    try {
      // Handle special characters in password by manually parsing and reconstructing URL
      const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@(.+)$/);
      if (match) {
        const [, username, password, rest] = match;
        const encodedPassword = encodeURIComponent(password);
        return `postgresql://${username}:${encodedPassword}@${rest}`;
      }
      return url;
    } catch {
      return url;
    }
  }

  async getScan(id: number): Promise<Scan | undefined> {
    const result = await this.db.select().from(scans).where(eq(scans.id, id));
    return result[0] || undefined;
  }

  async getAllScans(): Promise<Scan[]> {
    return await this.db.select().from(scans).orderBy(desc(scans.timestamp));
  }

  async createScan(scanData: Omit<Scan, 'id'>): Promise<Scan> {
    const result = await this.db.insert(scans).values(scanData).returning();
    return result[0];
  }

  async updateScan(id: number, updates: Partial<Scan>): Promise<Scan | undefined> {
    const result = await this.db
      .update(scans)
      .set(updates)
      .where(eq(scans.id, id))
      .returning();
    
    return result[0] || undefined;
  }

  async getRecentScans(limit: number = 10): Promise<Scan[]> {
    return await this.db
      .select()
      .from(scans)
      .orderBy(desc(scans.timestamp))
      .limit(limit);
  }
}

// Use Supabase/Postgres if DATABASE_URL is provided, otherwise fallback to in-memory
export const storage: IStorage = process.env.DATABASE_URL 
  ? new PostgresStorage() 
  : new MemStorage();
