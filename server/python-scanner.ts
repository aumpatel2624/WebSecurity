import { spawn } from 'child_process';
import path from 'path';
import type { SSLInfo, HeadersInfo, PortsInfo } from '@shared/schema';

interface PythonScanResult {
  url: string;
  timestamp: string;
  ssl: SSLInfo;
  headers: HeadersInfo;
  ports: PortsInfo;
  nmap?: {
    available: boolean;
    output?: string;
    error?: string;
  };
  overall_risk: string;
  security_score: number;
  recommendations: string[];
}

export class PythonScanner {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    this.pythonPath = 'python3';
    this.scriptPath = path.join(process.cwd(), 'scanner', 'scanner.py');
  }

  async scanURL(url: string): Promise<{
    ssl: SSLInfo;
    headers: HeadersInfo;
    ports: PortsInfo;
    overallRisk: string;
    securityScore: number;
    recommendations: string[];
    nmap?: any;
  }> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, url], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python scanner stderr:', stderr);
          reject(new Error(`Python scanner failed with exit code ${code}: ${stderr}`));
          return;
        }

        try {
          const result: PythonScanResult = JSON.parse(stdout);
          
          // Transform Python result to match our schema
          resolve({
            ssl: {
              valid: result.ssl.valid,
              daysRemaining: result.ssl.days_remaining,
              issuer: result.ssl.issuer,
              expires: result.ssl.expires,
              error: result.ssl.error,
            },
            headers: {
              missing: result.headers.missing,
              present: result.headers.present,
              score: result.headers.score,
            },
            ports: {
              open: result.ports.open,
              closed: result.ports.closed,
              total: result.ports.total,
            },
            overallRisk: result.overall_risk,
            securityScore: result.security_score,
            recommendations: result.recommendations,
            nmap: result.nmap,
          });
        } catch (error) {
          console.error('Failed to parse Python scanner output:', error);
          console.error('Raw stdout:', stdout);
          reject(new Error('Failed to parse scanner output'));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error('Python scanner process error:', error);
        reject(new Error(`Failed to start Python scanner: ${error.message}`));
      });

      // Set timeout
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Python scanner timeout'));
      }, 60000); // 60 second timeout
    });
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const testProcess = spawn(this.pythonPath, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      testProcess.on('close', (code) => {
        resolve(code === 0);
      });

      testProcess.on('error', () => {
        resolve(false);
      });

      setTimeout(() => {
        testProcess.kill();
        resolve(false);
      }, 5000);
    });
  }
}

export const pythonScanner = new PythonScanner();