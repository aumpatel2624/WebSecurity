import { useQuery } from "@tanstack/react-query";
import { Clock, Timer, ChevronRight, IdCard, Shield, Network } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { scanApi } from "@/lib/api";
import type { Scan } from "@shared/schema";

interface ScanResultsProps {
  onSelectScan: (scan: Scan) => void;
  selectedScanId?: number;
}

export function ScanResults({ onSelectScan, selectedScanId }: ScanResultsProps) {
  const { data: scans, isLoading } = useQuery({
    queryKey: ["/api/scans"],
    queryFn: scanApi.getAllScans,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="bg-dark-surface border-dark-border animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-dark-card rounded mb-4"></div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="h-16 bg-dark-card rounded"></div>
                <div className="h-16 bg-dark-card rounded"></div>
                <div className="h-16 bg-dark-card rounded"></div>
              </div>
              <div className="h-4 bg-dark-card rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!scans?.length) {
    return (
      <Card className="bg-dark-surface border-dark-border">
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500">No scans yet. Start your first security scan above.</p>
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getSSLStatus = (ssl: any) => {
    if (!ssl.valid) return { text: "Invalid", color: "text-red-400" };
    if (ssl.daysRemaining < 0) return { text: "Expired", color: "text-red-400" };
    if (ssl.daysRemaining < 30) return { text: "Expiring Soon", color: "text-orange-400" };
    return { text: `${ssl.daysRemaining}d left`, color: "text-green-400" };
  };

  return (
    <div className="space-y-4">
      {scans.map((scan) => {
        const sslStatus = getSSLStatus(scan.ssl);
        const isSelected = selectedScanId === scan.id;
        
        return (
          <Card
            key={scan.id}
            className={`bg-dark-surface border-dark-border cursor-pointer transition-all hover:border-opacity-50 ${
              isSelected ? "ring-2 ring-blue-500" : ""
            } ${
              scan.overallRisk === "HIGH RISK"
                ? "hover:border-red-500/30"
                : scan.overallRisk === "MEDIUM RISK"
                ? "hover:border-orange-500/30"
                : "hover:border-green-500/30"
            }`}
            onClick={() => onSelectScan(scan)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-mono text-blue-400 text-sm">{scan.url}</span>
                    <Badge className={`text-xs font-medium ${getRiskColor(scan.overallRisk)}`}>
                      {scan.overallRisk}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(scan.timestamp).toLocaleDateString()} {new Date(scan.timestamp).toLocaleTimeString()}
                    </span>
                    <span>
                      <Timer className="h-3 w-3 inline mr-1" />
                      {formatDuration(scan.duration)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-dark-card rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <IdCard className={`h-4 w-4 ${sslStatus.color.replace('text-', 'text-')}`} />
                    <span className="text-sm text-gray-300">SSL</span>
                  </div>
                  <div className="mt-1">
                    <span className={`font-medium ${sslStatus.color}`}>{sslStatus.text}</span>
                  </div>
                </div>
                <div className="bg-dark-card rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Shield className={`h-4 w-4 ${(scan.headers as any).missing?.length > 0 ? 'text-orange-500' : 'text-green-500'}`} />
                    <span className="text-sm text-gray-300">Headers</span>
                  </div>
                  <div className="mt-1">
                    <span className={`font-medium ${(scan.headers as any).missing?.length > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                      {(scan.headers as any).missing?.length > 0 
                        ? `${(scan.headers as any).missing.length} Missing`
                        : "All Present"
                      }
                    </span>
                  </div>
                </div>
                <div className="bg-dark-card rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Network className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-300">Ports</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-green-400 font-medium">{(scan.ports as any).open?.length || 0} Open</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">Security Score</div>
                  <Progress value={scan.securityScore} className="w-full h-2" />
                </div>
                <div className="text-right">
                  <span className={`font-bold text-lg ${
                    scan.securityScore >= 80 ? "text-green-400" :
                    scan.securityScore >= 50 ? "text-orange-400" : "text-red-400"
                  }`}>
                    {scan.securityScore}/100
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
