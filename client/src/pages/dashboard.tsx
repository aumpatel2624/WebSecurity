import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanForm } from "@/components/scan-form";
import { ScanResults } from "@/components/scan-results";
import { ScanDetails } from "@/components/scan-details";
import { scanApi } from "@/lib/api";
import type { Scan } from "@shared/schema";

export default function Dashboard() {
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: scanApi.getStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleSelectScan = (scan: Scan) => {
    setSelectedScan(scan);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-500" />
              <h1 className="text-xl font-bold text-white">WebVuln Analyzer</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                <Clock className="h-4 w-4 inline mr-1" />
                Scanner Ready
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-300">Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scan Form */}
        <ScanForm />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Scan Results */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Recent Scans</h2>
            </div>
            <ScanResults onSelectScan={handleSelectScan} selectedScanId={selectedScan?.id} />
          </div>

          {/* Scan Details */}
          <div className="lg:col-span-1">
            <ScanDetails scan={selectedScan} />
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats?.totalScans || 0}</div>
                  <div className="text-sm text-gray-400">Total Scans</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats?.highRisk || 0}</div>
                  <div className="text-sm text-gray-400">High Risk</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats?.mediumRisk || 0}</div>
                  <div className="text-sm text-gray-400">Medium Risk</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-dark-surface border-dark-border">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats?.lowRisk || 0}</div>
                  <div className="text-sm text-gray-400">Low Risk</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
