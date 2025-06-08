import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { scans } from "@shared/schema";

export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL provided, using in-memory storage');
    return;
  }

  try {
    // Handle URL encoding for special characters in Supabase URLs
    const encodeSupabaseUrl = (url: string): string => {
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
    };

    const encodedUrl = encodeSupabaseUrl(process.env.DATABASE_URL);
    const client = postgres(encodedUrl);
    
    // Test connection
    await client`SELECT 1`;
    console.log('✓ Connected to Supabase database');

    // Create table if it doesn't exist
    await client`
      CREATE TABLE IF NOT EXISTS scans (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        duration INTEGER NOT NULL,
        overall_risk TEXT NOT NULL,
        security_score INTEGER NOT NULL,
        ssl JSONB NOT NULL,
        headers JSONB NOT NULL,
        ports JSONB NOT NULL,
        recommendations JSONB NOT NULL,
        completed BOOLEAN DEFAULT false NOT NULL
      )
    `;
    
    console.log('✓ Database tables initialized');
    await client.end();
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    console.log('Falling back to in-memory storage');
  }
}