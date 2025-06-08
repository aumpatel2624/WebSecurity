import { MongoClient, Db, Collection } from 'mongodb';
import { scans, type Scan, type InsertScan } from "@shared/schema";
import { IStorage } from "./storage";

interface MongoScan {
  id: number;
  url: string;
  timestamp: Date;
  duration: number;
  overallRisk: string;
  securityScore: number;
  ssl: any;
  headers: any;
  ports: any;
  recommendations: any;
  completed: boolean;
}

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private collection: Collection<MongoScan>;
  private connected: boolean = false;

  constructor() {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB || 'vulnerability_scanner';
    
    this.client = new MongoClient(mongoUrl);
    this.db = this.client.db(dbName);
    this.collection = this.db.collection('scans');
  }

  private async ensureConnection(): Promise<void> {
    if (!this.connected) {
      try {
        await this.client.connect();
        this.connected = true;
        console.log('Connected to MongoDB');
      } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw new Error('Database connection failed');
      }
    }
  }

  async getScan(id: number): Promise<Scan | undefined> {
    await this.ensureConnection();
    
    const result = await this.collection.findOne({ id });
    if (!result) return undefined;
    
    return result as Scan;
  }

  async getAllScans(): Promise<Scan[]> {
    await this.ensureConnection();
    
    const results = await this.collection.find({}).sort({ timestamp: -1 }).toArray();
    return results as Scan[];
  }

  async createScan(scanData: Omit<Scan, 'id'>): Promise<Scan> {
    await this.ensureConnection();
    
    // Get the next available ID
    const lastScan = await this.collection.findOne({}, { sort: { id: -1 } });
    const newId = lastScan ? lastScan.id + 1 : 1;
    
    const scan: MongoScan = { ...scanData, id: newId } as MongoScan;
    
    await this.collection.insertOne(scan);
    return scan as Scan;
  }

  async updateScan(id: number, updates: Partial<Scan>): Promise<Scan | undefined> {
    await this.ensureConnection();
    
    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    
    if (!result) return undefined;
    
    return result as Scan;
  }

  async getRecentScans(limit: number = 10): Promise<Scan[]> {
    await this.ensureConnection();
    
    const results = await this.collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    return results as Scan[];
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
      console.log('Disconnected from MongoDB');
    }
  }
}