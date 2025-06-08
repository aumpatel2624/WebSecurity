import { scans, type Scan, type InsertScan } from "@shared/schema";

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

export const storage = new MemStorage();
