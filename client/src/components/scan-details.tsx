import { Check, X, Download, IdCard, Shield, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Scan } from "@shared/schema";

interface ScanDetailsProps {
  scan: Scan | null;
}

export function ScanDetails({ scan }: ScanDetailsProps) {
  if (!scan) {
    return (
      <Card className="bg-dark-surface border-dark-border sticky top-24">
        <CardHeader className="border-b border-dark-border">
          <CardTitle className="text-lg font-semibold text-white">Scan Details</CardTitle>
          <p className="text-sm text-gray-400">Select a scan to view detailed analysis</p>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">
            Click on any scan result to view comprehensive security analysis and recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "HIGH RISK":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "MEDIUM RISK":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "LOW RISK":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getSSLStatus = (ssl: any) => {
    if (!ssl.valid) return { text: "Invalid", color: "text-red-400" };
    if (ssl.daysRemaining < 0) return { text: "Expired", color: "text-red-400" };
    if (ssl.daysRemaining < 30) return { text: "Expiring Soon", color: "text-orange-400" };
    return { text: "Valid", color: "text-green-400" };
  };

  const sslStatus = getSSLStatus(scan.ssl);
  const headers = scan.headers as any;
  const ports = scan.ports as any;
  const recommendations = scan.recommendations as string[];

  const exportReport = () => {
    const report = {
      url: scan.url,
      timestamp: scan.timestamp,
      overallRisk: scan.overallRisk,
      securityScore: scan.securityScore,
      ssl: scan.ssl,
      headers: scan.headers,
      ports: scan.ports,
      recommendations: scan.recommendations,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-scan-${scan.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-dark-surface border-dark-border sticky top-24">
      <CardHeader className="border-b border-dark-border">
        <CardTitle className="text-lg font-semibold text-white">Scan Details</CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <span className="font-mono text-blue-400 text-sm break-all">{scan.url}</span>
            <Badge className={`text-xs font-medium ${getRiskColor(scan.overallRisk)}`}>
              {scan.overallRisk}
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                <IdCard className="h-4 w-4 mr-2" />
                SSL IdCard
              </h4>
              <div className="bg-dark-card rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Status</span>
                  <span className={`text-sm font-medium ${sslStatus.color}`}>
                    {sslStatus.text}
                  </span>
                </div>
                {(scan.ssl as any).daysRemaining !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Days Remaining</span>
                    <span className="text-white text-sm">{(scan.ssl as any).daysRemaining}</span>
                  </div>
                )}
                {(scan.ssl as any).issuer && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Issuer</span>
                    <span className="text-white text-sm">{(scan.ssl as any).issuer}</span>
                  </div>
                )}
                {(scan.ssl as any).error && (
                  <div className="text-xs text-red-400 mt-2">{(scan.ssl as any).error}</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Security Headers
              </h4>
              <div className="space-y-2">
                {headers.present?.map((header: string) => (
                  <div key={header} className="bg-dark-card rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-300 capitalize">
                        {header.replace(/-/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
                {headers.missing?.map((header: string) => (
                  <div key={header} className="bg-dark-card rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <X className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-gray-300 capitalize">
                        {header.replace(/-/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white mb-2 flex items-center">
                <Network className="h-4 w-4 mr-2" />
                Open Ports
              </h4>
              <div className="bg-dark-card rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">
                    {ports.open?.length ? ports.open.join(', ') : 'None detected'}
                  </span>
                  {ports.open?.length > 0 && (
                    <span className="text-xs text-gray-500">
                      ({ports.open.includes(80) ? 'HTTP' : ''}{ports.open.includes(80) && ports.open.includes(443) ? ', ' : ''}{ports.open.includes(443) ? 'HTTPS' : ''})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {recommendations?.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-4">Recommendations</h4>
            <div className="space-y-3">
              {recommendations.map((recommendation: string, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-300">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-dark-border pt-6">
          <Button onClick={exportReport} className="w-full bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
