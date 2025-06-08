import { apiRequest } from "./queryClient";
import type { Scan, StartScan } from "@shared/schema";

export const scanApi = {
  getAllScans: (): Promise<Scan[]> =>
    fetch("/api/scans", { credentials: "include" }).then(res => res.json()),
    
  getScan: (id: number): Promise<Scan> =>
    fetch(`/api/scans/${id}`, { credentials: "include" }).then(res => res.json()),
    
  startScan: (data: StartScan): Promise<{ scanId: number; message: string }> =>
    apiRequest("POST", "/api/scans", data).then(res => res.json()),
    
  getStats: (): Promise<{
    totalScans: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    averageScore: number;
  }> =>
    fetch("/api/stats", { credentials: "include" }).then(res => res.json()),
};
