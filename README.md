# WebVuln Analyzer

A comprehensive web vulnerability scanner built with Node.js/Express backend, Python scanning engine, and React frontend. This tool performs SSL certificate analysis, security header checks, port scanning, and provides detailed security recommendations.

## Features

### 🔍 **Comprehensive Security Analysis**
- **SSL Certificate Validation**: Check certificate validity, expiration dates, and issuer information
- **Security Headers Detection**: Analyze missing and present security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Port Scanning**: Scan common ports to identify potential attack vectors
- **Risk Assessment**: Calculate overall security scores with actionable recommendations

### 🎯 **Advanced Scanning Capabilities**
- **Dual Scanner Architecture**: Node.js TypeScript scanner + Python scanner for enhanced coverage
- **Real-time Updates**: Live scan progress tracking with WebSocket-like polling
- **Rate Limiting**: Built-in protection against scan abuse (10 scans per 15 minutes per IP)
- **Export Functionality**: Download detailed JSON reports for compliance and documentation

### 💾 **Flexible Data Storage**
- **MongoDB Integration**: Persistent storage for scan history and results
- **In-Memory Fallback**: Automatic fallback to in-memory storage if MongoDB unavailable
- **Historical Analysis**: Track security improvements over time

### 🎨 **Modern User Interface**
- **Dark Theme**: Professional security-focused design
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Real-time Stats**: Dashboard with risk distribution and scan statistics
- **Interactive Results**: Click to view detailed scan breakdowns

## Architecture

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   └── lib/           # API client and utilities
├── server/                # Express.js backend
│   ├── routes.ts          # API endpoint definitions
│   ├── scanner.ts         # TypeScript vulnerability scanner
│   ├── python-scanner.ts  # Python scanner integration
│   ├── storage.ts         # Data layer abstraction
│   └── mongo-storage.ts   # MongoDB implementation
├── scanner/               # Python scanning engine
│   └── scanner.py         # Advanced vulnerability scanner
└── shared/               # Shared types and schemas
    └── schema.ts         # Data models and validation
```

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB (optional - will use in-memory storage as fallback)

### Installation

1. **Clone and setup dependencies**:
```bash
npm install
pip install requests
```

2. **Configure environment** (optional):
```bash
# For MongoDB persistence
export MONGODB_URI="mongodb://localhost:27017"
export MONGODB_DB="vulnerability_scanner"
```

3. **Start the application**:
```bash
npm run dev
```

4. **Access the dashboard**:
Open `http://localhost:5000` in your browser

## API Reference

### Start New Scan
```http
POST /api/scans
Content-Type: application/json

{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "scanId": 1,
  "message": "Scan started"
}
```

### Get All Scans
```http
GET /api/scans
```

**Response:**
```json
[
  {
    "id": 1,
    "url": "https://example.com",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "duration": 5230,
    "overallRisk": "MEDIUM RISK",
    "securityScore": 65,
    "ssl": {
      "valid": true,
      "daysRemaining": 89,
      "issuer": "Let's Encrypt"
    },
    "headers": {
      "missing": ["content-security-policy"],
      "present": ["strict-transport-security"],
      "score": 83
    },
    "ports": {
      "open": [80, 443],
      "closed": [22, 21, 25],
      "total": 13
    },
    "recommendations": [
      "Add Content-Security-Policy header to prevent XSS attacks"
    ],
    "completed": true
  }
]
```

### Get Specific Scan
```http
GET /api/scans/:id
```

### Get Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "totalScans": 42,
  "highRisk": 5,
  "mediumRisk": 18,
  "lowRisk": 19,
  "averageScore": 71
}
```

## Security Features

### Rate Limiting
- **Scan Limits**: 10 scans per 15-minute window per IP address
- **Automatic Blocking**: Temporary blocks for excessive requests
- **Configurable**: Easily adjust limits based on requirements

### Security Headers
The application implements comprehensive security headers:
- Content Security Policy (CSP)
- Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy

### Input Validation
- **URL Validation**: Strict URL format checking with Zod schemas
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Protection**: Content sanitization and CSP headers

## Scanner Details

### TypeScript Scanner (Node.js)
- **SSL Analysis**: TLS certificate validation and expiration checking
- **Header Analysis**: HTTP security header detection
- **Port Scanning**: TCP connection testing for common ports
- **Fast Execution**: Optimized for speed with concurrent operations

### Python Scanner (Enhanced)
- **Extended Port Range**: Comprehensive port scanning with threading
- **Nmap Integration**: Advanced network discovery when available
- **Certificate Deep Dive**: Detailed SSL certificate chain analysis
- **Enhanced Reporting**: More detailed vulnerability descriptions

### Scan Results Format

Each scan produces a comprehensive report including:

```json
{
  "url": "https://example.com",
  "ssl": {
    "valid": true,
    "daysRemaining": 122,
    "issuer": "DigiCert Inc",
    "expires": "2024-12-31T23:59:59Z"
  },
  "headers": {
    "missing": ["Content-Security-Policy", "X-Frame-Options"],
    "present": ["Strict-Transport-Security", "X-Content-Type-Options"],
    "score": 67
  },
  "ports": {
    "open": [80, 443],
    "closed": [22, 21, 25, 53, 110, 993, 995],
    "total": 13
  },
  "overall_risk": "MEDIUM RISK",
  "security_score": 65,
  "recommendations": [
    "Add Content-Security-Policy header to prevent XSS attacks",
    "Enable X-Frame-Options to prevent clickjacking"
  ]
}
```

## Deployment

### Environment Variables
```bash
# Database (optional)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=vulnerability_scanner

# Server Configuration
NODE_ENV=production
PORT=5000

# Security
TRUST_PROXY=1
```

### Production Deployment
1. **Build the application**:
```bash
npm run build
```

2. **Start in production mode**:
```bash
NODE_ENV=production npm start
```

3. **Configure reverse proxy** (nginx example):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Development

### Project Structure
- **Modular Architecture**: Clean separation between frontend, backend, and scanning logic
- **TypeScript**: Full type safety across the application
- **React Query**: Efficient data fetching and caching
- **Tailwind CSS**: Utility-first styling with dark theme support

### Adding New Scan Types
1. **Update Schema** (`shared/schema.ts`):
```typescript
export const newScanTypeSchema = z.object({
  // Define new scan type structure
});
```

2. **Implement Scanner** (`server/scanner.ts`):
```typescript
private async newScanType(url: string): Promise<NewScanResult> {
  // Implement scanning logic
}
```

3. **Update Frontend** (`client/src/components/`):
```typescript
// Add UI components for new scan type
```

### Testing
```bash
# Run TypeScript scanner test
node -e "
const { scanner } = require('./server/scanner.ts');
scanner.scanURL('https://example.com').then(console.log);
"

# Run Python scanner test
python scanner/scanner.py https://example.com
```

## Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-scanner`
3. **Implement changes** with proper TypeScript types
4. **Add tests** for new functionality
5. **Submit pull request** with detailed description

## Security Considerations

- **No Stored Credentials**: Scanner doesn't store or transmit authentication data
- **Rate Limited**: Prevents abuse with configurable limits
- **Input Sanitization**: All user inputs are validated and sanitized
- **Secure Headers**: Application implements security best practices
- **Audit Trail**: All scans are logged with timestamps and source IPs

## License

MIT License - see LICENSE file for details.

## Support

For issues, feature requests, or security concerns, please create an issue in the repository or contact the development team.

---

**Built with security in mind** 🔒