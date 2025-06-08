import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { storage } from "./storage";
import { scanner } from "./scanner";
import { startScanSchema } from "@shared/schema";

const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 scans per windowMs
  message: { error: "Too many scan requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // Get all scans
  app.get("/api/scans", async (req, res) => {
    try {
      const scans = await storage.getAllScans();
      res.json(scans);
    } catch (error) {
      console.error("Error fetching scans:", error);
      res.status(500).json({ error: "Failed to fetch scans" });
    }
  });

  // Get a specific scan
  app.get("/api/scans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid scan ID" });
      }

      const scan = await storage.getScan(id);
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      res.json(scan);
    } catch (error) {
      console.error("Error fetching scan:", error);
      res.status(500).json({ error: "Failed to fetch scan" });
    }
  });

  // Start a new scan
  app.post("/api/scans", scanLimiter, async (req, res) => {
    try {
      const validatedData = startScanSchema.parse(req.body);
      
      // Create initial scan record
      const scan = await storage.createScan({
        url: validatedData.url,
        timestamp: new Date(),
        duration: 0,
        overallRisk: "SCANNING",
        securityScore: 0,
        ssl: { valid: false },
        headers: { missing: [], present: [], score: 0 },
        ports: { open: [], closed: [], total: 0 },
        recommendations: [],
        completed: false,
      });

      res.json({ scanId: scan.id, message: "Scan started" });

      // Perform scan asynchronously
      const startTime = Date.now();
      
      try {
        const results = await scanner.scanURL(validatedData.url);
        const duration = Date.now() - startTime;

        await storage.updateScan(scan.id, {
          duration,
          overallRisk: results.overallRisk,
          securityScore: results.securityScore,
          ssl: results.ssl,
          headers: results.headers,
          ports: results.ports,
          recommendations: results.recommendations,
          completed: true,
        });
      } catch (scanError) {
        console.error("Scan error:", scanError);
        await storage.updateScan(scan.id, {
          duration: Date.now() - startTime,
          overallRisk: "ERROR",
          securityScore: 0,
          ssl: { valid: false, error: "Scan failed" },
          headers: { missing: [], present: [], score: 0 },
          ports: { open: [], closed: [], total: 0 },
          recommendations: ["Unable to complete scan - please verify URL is accessible"],
          completed: true,
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors.map(e => e.message).join(", ")
        });
      }
      
      console.error("Error starting scan:", error);
      res.status(500).json({ error: "Failed to start scan" });
    }
  });

  // Get scan statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const scans = await storage.getAllScans();
      
      const stats = {
        totalScans: scans.length,
        highRisk: scans.filter(s => s.overallRisk === "HIGH RISK").length,
        mediumRisk: scans.filter(s => s.overallRisk === "MEDIUM RISK").length,
        lowRisk: scans.filter(s => s.overallRisk === "LOW RISK").length,
        averageScore: scans.length > 0 
          ? Math.round(scans.reduce((sum, s) => sum + s.securityScore, 0) / scans.length)
          : 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
