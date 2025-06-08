import https from 'https';
import http from 'http';
import tls from 'tls';
import { URL } from 'url';
import type { SSLInfo, HeadersInfo, PortsInfo } from '@shared/schema';

export class VulnerabilityScanner {
  private securityHeaders = [
    'strict-transport-security',
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'referrer-policy',
  ];

  private commonPorts = [80, 443, 8080, 8443, 3000, 3001];

  async scanURL(url: string): Promise<{
    ssl: SSLInfo;
    headers: HeadersInfo;
    ports: PortsInfo;
    overallRisk: string;
    securityScore: number;
    recommendations: string[];
  }> {
    const parsedUrl = new URL(url);
    
    const [ssl, headers, ports] = await Promise.all([
      this.checkSSL(parsedUrl),
      this.checkHeaders(url),
      this.checkPorts(parsedUrl.hostname),
    ]);

    const { overallRisk, securityScore, recommendations } = this.calculateRisk(ssl, headers, ports);

    return {
      ssl,
      headers,
      ports,
      overallRisk,
      securityScore,
      recommendations,
    };
  }

  private async checkSSL(url: URL): Promise<SSLInfo> {
    if (url.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Website does not use HTTPS',
      };
    }

    return new Promise((resolve) => {
      const port = url.port ? parseInt(url.port) : 443;
      
      const socket = tls.connect(port, url.hostname, {
        servername: url.hostname,
        rejectUnauthorized: false,
      });

      socket.on('secureConnect', () => {
        try {
          const cert = socket.getPeerCertificate();
          const now = new Date();
          const expiry = new Date(cert.valid_to);
          const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          resolve({
            valid: socket.authorized,
            daysRemaining,
            issuer: cert.issuer?.CN || 'Unknown',
            expires: cert.valid_to,
            error: socket.authorized ? undefined : socket.authorizationError,
          });
        } catch (error) {
          resolve({
            valid: false,
            error: 'Failed to parse certificate',
          });
        }
        socket.destroy();
      });

      socket.on('error', (error) => {
        resolve({
          valid: false,
          error: error.message,
        });
      });

      socket.setTimeout(10000, () => {
        socket.destroy();
        resolve({
          valid: false,
          error: 'Connection timeout',
        });
      });
    });
  }

  private async checkHeaders(url: string): Promise<HeadersInfo> {
    return new Promise((resolve) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.request(url, { method: 'HEAD' }, (res) => {
        const headers = res.headers;
        const present: string[] = [];
        const missing: string[] = [];

        this.securityHeaders.forEach(header => {
          if (headers[header]) {
            present.push(header);
          } else {
            missing.push(header);
          }
        });

        const score = Math.round((present.length / this.securityHeaders.length) * 100);

        resolve({
          missing,
          present,
          score,
        });
      });

      req.on('error', () => {
        resolve({
          missing: this.securityHeaders,
          present: [],
          score: 0,
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          missing: this.securityHeaders,
          present: [],
          score: 0,
        });
      });

      req.end();
    });
  }

  private async checkPorts(hostname: string): Promise<PortsInfo> {
    const results = await Promise.allSettled(
      this.commonPorts.map(port => this.checkPort(hostname, port))
    );

    const open: number[] = [];
    const closed: number[] = [];

    results.forEach((result, index) => {
      const port = this.commonPorts[index];
      if (result.status === 'fulfilled' && result.value) {
        open.push(port);
      } else {
        closed.push(port);
      }
    });

    return {
      open,
      closed,
      total: this.commonPorts.length,
    };
  }

  private checkPort(hostname: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new (require('net').Socket)();
      
      socket.setTimeout(3000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(port, hostname);
    });
  }

  private calculateRisk(ssl: SSLInfo, headers: HeadersInfo, ports: PortsInfo): {
    overallRisk: string;
    securityScore: number;
    recommendations: string[];
  } {
    let score = 0;
    const recommendations: string[] = [];

    // SSL scoring (40% of total)
    if (ssl.valid) {
      if (ssl.daysRemaining && ssl.daysRemaining > 30) {
        score += 40;
      } else if (ssl.daysRemaining && ssl.daysRemaining > 0) {
        score += 25;
        recommendations.push('SSL certificate expires soon - consider renewal');
      }
    } else {
      recommendations.push('Fix SSL certificate issues - critical security vulnerability');
    }

    // Headers scoring (40% of total)
    score += Math.round((headers.score / 100) * 40);
    
    if (headers.missing.includes('content-security-policy')) {
      recommendations.push('Add Content-Security-Policy header to prevent XSS attacks');
    }
    if (headers.missing.includes('x-frame-options')) {
      recommendations.push('Enable X-Frame-Options to prevent clickjacking');
    }
    if (headers.missing.includes('strict-transport-security')) {
      recommendations.push('Add Strict-Transport-Security header for HTTPS enforcement');
    }

    // Ports scoring (20% of total)
    const expectedPorts = [80, 443];
    const unexpectedOpen = ports.open.filter(p => !expectedPorts.includes(p));
    
    if (unexpectedOpen.length === 0) {
      score += 20;
    } else {
      score += 10;
      recommendations.push(`Consider closing unnecessary ports: ${unexpectedOpen.join(', ')}`);
    }

    let risk: string;
    if (score >= 80) {
      risk = 'LOW RISK';
    } else if (score >= 50) {
      risk = 'MEDIUM RISK';
    } else {
      risk = 'HIGH RISK';
    }

    return {
      overallRisk: risk,
      securityScore: score,
      recommendations,
    };
  }
}

export const scanner = new VulnerabilityScanner();
