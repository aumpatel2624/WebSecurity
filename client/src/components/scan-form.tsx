import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Shield, Search, IdCard, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { scanApi } from "@/lib/api";
import { startScanSchema, type StartScan } from "@shared/schema";

export function ScanForm() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<StartScan>({
    resolver: zodResolver(startScanSchema),
    defaultValues: {
      url: "",
    },
  });

  const scanMutation = useMutation({
    mutationFn: scanApi.startScan,
    onSuccess: (data) => {
      // Use setTimeout to avoid state updates during render
      setTimeout(() => {
        toast({
          title: "Scan Started",
          description: `Scanning ${form.getValues().url}...`,
        });
        
        setIsScanning(true);
        setScanProgress(0);
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          setScanProgress(prev => {
            const newProgress = prev + Math.random() * 15;
            if (newProgress >= 100) {
              clearInterval(progressInterval);
              setIsScanning(false);
              setScanProgress(0);
              
              // Invalidate and refetch scans
              queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
              queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
              
              toast({
                title: "Scan Complete",
                description: "Vulnerability analysis finished successfully.",
              });
              
              form.reset();
              return 100;
            }
            return newProgress;
          });
        }, 200);
      }, 0);
    },
    onError: (error: any) => {
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
        toast({
          title: "Scan Failed",
          description: error.message || "Failed to start scan",
          variant: "destructive",
        });
      }, 0);
    },
  });

  const onSubmit = (data: StartScan) => {
    scanMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-dark-surface border-dark-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-semibold text-white">New Security Scan</CardTitle>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Shield className="h-4 w-4" />
              <span>SSL, Headers, Ports Analysis</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-gray-300">Target URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          className="bg-dark-card border-dark-border text-white placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col justify-end">
                  <Button
                    type="submit"
                    disabled={scanMutation.isPending || isScanning}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Start Scan
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          <div className="flex items-center space-x-6 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <IdCard className="h-4 w-4 text-green-500" />
              <span>SSL Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Security Headers</span>
            </div>
            <div className="flex items-center space-x-2">
              <Network className="h-4 w-4 text-purple-500" />
              <span>Port Scanning</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isScanning && (
        <Card className="bg-dark-surface border-dark-border">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="animate-spin text-blue-500">
                <Search className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Scanning in progress...</span>
                  <span className="text-sm text-gray-400">{Math.round(scanProgress)}%</span>
                </div>
                <Progress value={scanProgress} className="w-full" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              <span>
                {scanProgress < 25 && "Analyzing SSL certificate..."}
                {scanProgress >= 25 && scanProgress < 50 && "Checking security headers..."}
                {scanProgress >= 50 && scanProgress < 75 && "Scanning network ports..."}
                {scanProgress >= 75 && "Generating security report..."}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
