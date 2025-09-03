import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Coins, 
  TrendingUp, 
  BarChart3,
  Rocket,
  Shield,
  Brain
} from 'lucide-react';
import BlockchainTokenGenerator from './BlockchainTokenGenerator';
import DeFiProtocolBuilder from './DeFiProtocolBuilder';
import { BlockchainAnalyticsEnhanced } from './BlockchainAnalyticsEnhanced';
import AISmartContractAssistant from './AISmartContractAssistant';
import Web3AppGenerator from './Web3AppGenerator';
import { DeFiDashboard } from './DeFiDashboard';

const BlockchainHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('tokens');

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">Blockchain Hub</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Generate tokens, build DeFi protocols, and analyze blockchain data
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-6 mt-4 grid grid-cols-6 w-fit">
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Token Generator
          </TabsTrigger>
          <TabsTrigger value="defi" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            DeFi Builder
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="web3" className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Web3 Apps
          </TabsTrigger>
          <TabsTrigger value="defi-dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            DeFi Dashboard
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="tokens" className="h-full m-0">
            <BlockchainTokenGenerator embedded={true} />
          </TabsContent>

          <TabsContent value="defi" className="h-full m-0">
            <DeFiProtocolBuilder />
          </TabsContent>

          <TabsContent value="ai" className="h-full m-0">
            <AISmartContractAssistant />
          </TabsContent>

          <TabsContent value="analytics" className="h-full m-0">
            <BlockchainAnalyticsEnhanced />
          </TabsContent>

          <TabsContent value="web3" className="h-full m-0">
            <Web3AppGenerator />
          </TabsContent>

          <TabsContent value="defi-dashboard" className="h-full m-0">
            <DeFiDashboard />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default BlockchainHub;
