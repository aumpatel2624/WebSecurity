#!/usr/bin/env python3

import ssl
import socket
import json
import sys
import requests
import subprocess
import argparse
from urllib.parse import urlparse
from datetime import datetime
import concurrent.futures
import warnings

# Suppress SSL warnings for testing
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

class VulnerabilityScanner:
    def __init__(self):
        self.security_headers = [
            'strict-transport-security',
            'content-security-policy', 
            'x-frame-options',
            'x-content-type-options',
            'x-xss-protection',
            'referrer-policy'
        ]
        self.common_ports = [80, 443, 8080, 8443, 3000, 3001, 22, 21, 25, 53, 110, 993, 995]

    def check_ssl_certificate(self, hostname, port=443):
        """Check SSL certificate validity and expiration"""
        try:
            context = ssl.create_default_context()
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    
                    # Parse expiration date
                    expiry_date = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_remaining = (expiry_date - datetime.now()).days
                    
                    return {
                        'valid': True,
                        'days_remaining': days_remaining,
                        'issuer': cert.get('issuer', [{}])[0].get('commonName', 'Unknown'),
                        'expires': cert['notAfter'],
                        'subject': cert.get('subject', [{}])[0].get('commonName', 'Unknown')
                    }
                    
        except Exception as e:
            return {
                'valid': False,
                'error': str(e),
                'days_remaining': 0
            }

    def check_security_headers(self, url):
        """Check for security headers"""
        try:
            response = requests.head(url, timeout=10, verify=False, allow_redirects=True)
            headers = {k.lower(): v for k, v in response.headers.items()}
            
            present = []
            missing = []
            
            for header in self.security_headers:
                if header in headers:
                    present.append(header)
                else:
                    missing.append(header)
            
            score = round((len(present) / len(self.security_headers)) * 100)
            
            return {
                'missing': missing,
                'present': present,
                'score': score,
                'status_code': response.status_code
            }
            
        except Exception as e:
            return {
                'missing': self.security_headers,
                'present': [],
                'score': 0,
                'error': str(e)
            }

    def scan_port(self, hostname, port, timeout=3):
        """Scan a single port"""
        try:
            with socket.create_connection((hostname, port), timeout=timeout):
                return True
        except:
            return False

    def scan_ports(self, hostname):
        """Scan common ports using threading"""
        open_ports = []
        closed_ports = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = {
                executor.submit(self.scan_port, hostname, port): port 
                for port in self.common_ports
            }
            
            for future in concurrent.futures.as_completed(futures):
                port = futures[future]
                try:
                    if future.result():
                        open_ports.append(port)
                    else:
                        closed_ports.append(port)
                except:
                    closed_ports.append(port)
        
        return {
            'open': sorted(open_ports),
            'closed': sorted(closed_ports),
            'total': len(self.common_ports)
        }

    def nmap_scan(self, hostname):
        """Run basic nmap scan if available"""
        try:
            result = subprocess.run([
                'nmap', '-sS', '-O', '--top-ports', '100', hostname
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return {
                    'available': True,
                    'output': result.stdout,
                    'summary': 'Nmap scan completed successfully'
                }
            else:
                return {
                    'available': False,
                    'error': 'Nmap scan failed'
                }
        except FileNotFoundError:
            return {
                'available': False,
                'error': 'Nmap not installed'
            }
        except subprocess.TimeoutExpired:
            return {
                'available': False,
                'error': 'Nmap scan timeout'
            }
        except Exception as e:
            return {
                'available': False,
                'error': str(e)
            }

    def calculate_risk_score(self, ssl_info, headers_info, ports_info):
        """Calculate overall risk assessment"""
        score = 0
        recommendations = []
        
        # SSL scoring (40% of total)
        if ssl_info.get('valid', False):
            if ssl_info.get('days_remaining', 0) > 30:
                score += 40
            elif ssl_info.get('days_remaining', 0) > 0:
                score += 25
                recommendations.append('SSL certificate expires soon - consider renewal')
            else:
                recommendations.append('SSL certificate has expired - critical security issue')
        else:
            recommendations.append('Fix SSL certificate issues - critical security vulnerability')
        
        # Headers scoring (40% of total)
        headers_score = headers_info.get('score', 0)
        score += round((headers_score / 100) * 40)
        
        missing_headers = headers_info.get('missing', [])
        if 'content-security-policy' in missing_headers:
            recommendations.append('Add Content-Security-Policy header to prevent XSS attacks')
        if 'x-frame-options' in missing_headers:
            recommendations.append('Enable X-Frame-Options to prevent clickjacking')
        if 'strict-transport-security' in missing_headers:
            recommendations.append('Add Strict-Transport-Security header for HTTPS enforcement')
        
        # Ports scoring (20% of total)
        open_ports = ports_info.get('open', [])
        expected_ports = [80, 443]
        unexpected_open = [p for p in open_ports if p not in expected_ports]
        
        if not unexpected_open:
            score += 20
        elif len(unexpected_open) <= 2:
            score += 10
            recommendations.append(f'Consider closing unnecessary ports: {", ".join(map(str, unexpected_open))}')
        else:
            recommendations.append(f'Multiple unnecessary ports open: {", ".join(map(str, unexpected_open))} - security risk')
        
        # Determine risk level
        if score >= 80:
            risk_level = 'LOW RISK'
        elif score >= 50:
            risk_level = 'MEDIUM RISK'
        else:
            risk_level = 'HIGH RISK'
        
        return {
            'overall_risk': risk_level,
            'security_score': score,
            'recommendations': recommendations
        }

    def scan_url(self, url):
        """Main scanning function"""
        parsed_url = urlparse(url)
        hostname = parsed_url.hostname
        
        if not hostname:
            return {
                'error': 'Invalid URL provided',
                'url': url
            }
        
        print(f"Starting vulnerability scan for: {url}", file=sys.stderr)
        
        # Perform all scans
        ssl_info = self.check_ssl_certificate(hostname)
        headers_info = self.check_security_headers(url)
        ports_info = self.scan_ports(hostname)
        nmap_info = self.nmap_scan(hostname)
        
        # Calculate risk assessment
        risk_assessment = self.calculate_risk_score(ssl_info, headers_info, ports_info)
        
        return {
            'url': url,
            'timestamp': datetime.now().isoformat(),
            'ssl': ssl_info,
            'headers': headers_info,
            'ports': ports_info,
            'nmap': nmap_info,
            'overall_risk': risk_assessment['overall_risk'],
            'security_score': risk_assessment['security_score'],
            'recommendations': risk_assessment['recommendations']
        }

def main():
    parser = argparse.ArgumentParser(description='Web Vulnerability Scanner')
    parser.add_argument('url', help='Target URL to scan')
    parser.add_argument('--output', '-o', help='Output file (JSON format)')
    
    args = parser.parse_args()
    
    scanner = VulnerabilityScanner()
    results = scanner.scan_url(args.url)
    
    # Output results as JSON
    json_output = json.dumps(results, indent=2, default=str)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(json_output)
        print(f"Results saved to {args.output}", file=sys.stderr)
    else:
        print(json_output)

if __name__ == '__main__':
    main()