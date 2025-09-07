import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Activity, Rocket, Package, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CIDashboard } from "@/components/ci-dashboard";
import { CISettings } from "@/components/ci-settings";
import { DeploymentManager } from "@/components/ci-deployment-manager";
import { CIBuildDetails } from "@/components/ci-build-details";

export default function CICDPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">CI/CD Integration</h1>
        <p className="text-muted-foreground mt-2">
          Manage builds, deployments, and continuous integration workflows
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="builds" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Builds
          </TabsTrigger>
          <TabsTrigger value="deployments" className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Deployments
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <CIDashboard />
        </TabsContent>

        <TabsContent value="builds" className="space-y-6">
          <CIBuildDetails />
        </TabsContent>

        <TabsContent value="deployments" className="space-y-6">
          <DeploymentManager />

          {/* Deploy to Stores */}
          <Card className="deployment-manager">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Deploy to App Stores
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={() => (window as any).electron.invoke('store:deploy-ios')}>Deploy iOS</Button>
              <Button onClick={() => (window as any).electron.invoke('store:deploy-android')}>Deploy Android</Button>
              <Button onClick={() => (window as any).electron.invoke('store:deploy-all')}>Deploy Both</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <CISettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
