import React, { useState, useEffect } from 'react';
import {
  Image,
  ShoppingCart,
  Heart,
  Eye,
  Filter,
  Grid,
  List,
  Search,
  TrendingUp,
  Clock,
  Gavel,
  Tag,
  Palette,
  Sparkles,
  Crown,
  Star,
  Share2,
  MoreHorizontal,
  Download,
  Upload,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Users,
  Trophy,
  Flame,
  Diamond,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Copy,
  Settings,
  RefreshCw,
  Zap,
  Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  currency: string;
  owner: string;
  creator: string;
  collection: string;
  tokenId: string;
  contractAddress: string;
  likes: number;
  views: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  attributes: Array<{ trait: string; value: string; rarity: number }>;
  history: Array<{ event: string; price: number; from: string; to: string; date: Date }>;
  isVerified: boolean;
  chain: string;
  royalties: number;
  isAuction?: boolean;
  auctionEndTime?: Date;
  highestBid?: number;
}

interface Collection {
  id: string;
  name: string;
  description: string;
  image: string;
  banner: string;
  creator: string;
  items: number;
  owners: number;
  floorPrice: number;
  volume: number;
  volumeChange: number;
  isVerified: boolean;
  chain: string;
  category: string;
}

interface Activity {
  id: string;
  type: 'sale' | 'listing' | 'bid' | 'transfer' | 'mint';
  nft: string;
  price?: number;
  from: string;
  to: string;
  date: Date;
  txHash: string;
}

const MOCK_NFTS: NFT[] = [
  {
    id: '1',
    name: 'CryptoPunk #1234',
    description: 'A unique pixelated character from the CryptoPunks collection',
    image: 'https://via.placeholder.com/400x400/FF6B6B/FFFFFF?text=Punk',
    price: 45.5,
    currency: 'ETH',
    owner: '0x1234...5678',
    creator: '0xabcd...efgh',
    collection: 'CryptoPunks',
    tokenId: '1234',
    contractAddress: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB',
    likes: 342,
    views: 5621,
    rarity: 'legendary',
    attributes: [
      { trait: 'Type', value: 'Alien', rarity: 0.1 },
      { trait: 'Hat', value: 'Beanie', rarity: 5 },
      { trait: 'Glasses', value: '3D Glasses', rarity: 2 }
    ],
    history: [
      { event: 'Sale', price: 45.5, from: '0xaaaa...bbbb', to: '0x1234...5678', date: new Date('2024-01-15') },
      { event: 'Listing', price: 40, from: '0xcccc...dddd', to: '', date: new Date('2024-01-10') }
    ],
    isVerified: true,
    chain: 'Ethereum',
    royalties: 2.5
  },
  {
    id: '2',
    name: 'Bored Ape #5678',
    description: 'A bored ape from the Bored Ape Yacht Club',
    image: 'https://via.placeholder.com/400x400/4ECDC4/FFFFFF?text=Ape',
    price: 72.3,
    currency: 'ETH',
    owner: '0x9876...5432',
    creator: '0xijkl...mnop',
    collection: 'BAYC',
    tokenId: '5678',
    contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    likes: 892,
    views: 12341,
    rarity: 'epic',
    attributes: [
      { trait: 'Fur', value: 'Gold', rarity: 1.5 },
      { trait: 'Eyes', value: 'Laser', rarity: 0.8 },
      { trait: 'Mouth', value: 'Grin', rarity: 12 }
    ],
    history: [],
    isVerified: true,
    chain: 'Ethereum',
    royalties: 5,
    isAuction: true,
    auctionEndTime: new Date('2024-02-01'),
    highestBid: 68.5
  }
];

const MOCK_COLLECTIONS: Collection[] = [
  {
    id: '1',
    name: 'CryptoPunks',
    description: '10,000 unique collectible characters with proof of ownership stored on the Ethereum blockchain',
    image: 'https://via.placeholder.com/200x200/FF6B6B/FFFFFF?text=Punks',
    banner: 'https://via.placeholder.com/1200x300/FF6B6B/FFFFFF?text=CryptoPunks',
    creator: 'Larva Labs',
    items: 10000,
    owners: 3421,
    floorPrice: 42.5,
    volume: 523000,
    volumeChange: 12.5,
    isVerified: true,
    chain: 'Ethereum',
    category: 'Art'
  },
  {
    id: '2',
    name: 'Bored Ape Yacht Club',
    description: 'BAYC is a collection of 10,000 unique Bored Ape NFTs',
    image: 'https://via.placeholder.com/200x200/4ECDC4/FFFFFF?text=BAYC',
    banner: 'https://via.placeholder.com/1200x300/4ECDC4/FFFFFF?text=BAYC',
    creator: 'Yuga Labs',
    items: 10000,
    owners: 5892,
    floorPrice: 68.2,
    volume: 892000,
    volumeChange: -5.2,
    isVerified: true,
    chain: 'Ethereum',
    category: 'PFP'
  }
];

export const NFTMarketplace: React.FC = () => {
  const [activeTab, setActiveTab] = useState('explore');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedChain, setSelectedChain] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState<'price' | 'recent' | 'popular'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMintOpen, setIsMintOpen] = useState(false);
  
  // Mint form state
  const [mintForm, setMintForm] = useState({
    name: '',
    description: '',
    image: null as File | null,
    collection: '',
    price: '',
    royalties: '2.5',
    attributes: [] as Array<{ trait: string; value: string }>
  });

  // Stats
  const [stats] = useState({
    totalVolume: 1892000,
    totalSales: 45231,
    totalCreators: 8923,
    avgPrice: 12.5
  });

  const formatPrice = (price: number): string => {
    return price.toFixed(2);
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 13) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common': return 'text-gray-500';
      case 'rare': return 'text-blue-500';
      case 'epic': return 'text-purple-500';
      case 'legendary': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getRarityBadgeColor = (rarity: string): string => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMint = () => {
     console.log('Minting NFT:', mintForm);
    setIsMintOpen(false);
  };

  const handleBuy = (nft: NFT) => {
     console.log('Buying NFT:', nft);
  };

  const handleBid = (nft: NFT, amount: number) => {
     console.log('Placing bid:', nft, amount);
  };

  return (
    <div className="nft-marketplace p-6 space-y-6">
      {/* Header */}
      <div className="header flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Diamond className="h-8 w-8 text-purple-600" />
            NFT Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover, collect, and trade unique digital assets
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
          <Button 
            onClick={() => setIsMintOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Create NFT
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatPrice(stats.totalVolume)} ETH</span>
              <Badge variant="outline" className="text-green-500">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                12.5%
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.totalSales.toLocaleString()}</span>
              <Badge variant="outline">
                <TrendingUp className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.totalCreators.toLocaleString()}</span>
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                Growing
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatPrice(stats.avgPrice)} ETH</span>
              <Badge variant="outline" className="text-blue-500">
                <Tag className="h-3 w-3 mr-1" />
                Market
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="explore">Explore</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="my-nfts">My NFTs</TabsTrigger>
        </TabsList>

        {/* Explore Tab */}
        <TabsContent value="explore" className="space-y-4">
          {/* Filters Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search NFTs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="art">Art</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="pfp">PFP</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="photography">Photography</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Chain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chains</SelectItem>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="recent">Recently Listed</SelectItem>
                    <SelectItem value="price">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NFT Grid/List */}
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}>
            {MOCK_NFTS.map((nft) => (
              <Card key={nft.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative group cursor-pointer" onClick={() => {
                  setSelectedNFT(nft);
                  setIsDetailsOpen(true);
                }}>
                  <img 
                    src={nft.image} 
                    alt={nft.name}
                    className="w-full h-full object-cover"
                  />
                  {nft.isAuction && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Auction
                    </div>
                  )}
                  {nft.isVerified && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                      <CheckCircle className="h-3 w-3" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{nft.collection}</p>
                      <h3 className="font-semibold">{nft.name}</h3>
                    </div>
                    <Badge className={getRarityBadgeColor(nft.rarity)}>
                      {nft.rarity}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {nft.isAuction ? 'Current Bid' : 'Price'}
                      </p>
                      <p className="font-bold">
                        {nft.isAuction ? formatPrice(nft.highestBid!) : formatPrice(nft.price)} {nft.currency}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <button className="hover:text-red-500 transition-colors">
                        <Heart className="h-4 w-4" />
                        <span className="text-xs">{nft.likes}</span>
                      </button>
                      <div>
                        <Eye className="h-4 w-4 inline" />
                        <span className="text-xs ml-1">{nft.views}</span>
                      </div>
                    </div>
                  </div>

                  {nft.isAuction && nft.auctionEndTime && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">Auction ends in</p>
                      <p className="font-medium text-sm">
                        {Math.floor((nft.auctionEndTime.getTime() - Date.now()) / (1000 * 60 * 60))} hours
                      </p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  {nft.isAuction ? (
                    <Button className="w-full" variant="outline">
                      <Gavel className="h-4 w-4 mr-2" />
                      Place Bid
                    </Button>
                  ) : (
                    <Button className="w-full">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Buy Now
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-4">
          <div className="grid gap-4">
            {MOCK_COLLECTIONS.map((collection) => (
              <Card key={collection.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <img 
                      src={collection.image}
                      alt={collection.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold">{collection.name}</h3>
                        {collection.isVerified && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {collection.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge variant="secondary">{collection.category}</Badge>
                        <Badge variant="outline">{collection.chain}</Badge>
                        <span className="text-sm text-muted-foreground">
                          by {collection.creator}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-6 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Floor Price</p>
                        <p className="font-semibold">{formatPrice(collection.floorPrice)} ETH</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Volume</p>
                        <p className="font-semibold">{(collection.volume / 1000).toFixed(0)}K ETH</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Items</p>
                        <p className="font-semibold">{collection.items.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Owners</p>
                        <p className="font-semibold">{collection.owners.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {collection.volumeChange > 0 ? (
                        <Badge className="text-green-500">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          {collection.volumeChange}%
                        </Badge>
                      ) : (
                        <Badge className="text-red-500">
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                          {Math.abs(collection.volumeChange)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest transactions and listings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500" />
                    <div>
                      <p className="font-medium">CryptoPunk #1234</p>
                      <p className="text-sm text-muted-foreground">
                        Sold for 45.5 ETH
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">5 minutes ago</p>
                    <a href="#" className="text-sm text-blue-500 hover:underline">
                      View Transaction
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* NFT Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedNFT && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedNFT.name}</DialogTitle>
                <DialogDescription>
                  {selectedNFT.collection} • Token #{selectedNFT.tokenId}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <img 
                    src={selectedNFT.image}
                    alt={selectedNFT.name}
                    className="w-full rounded-lg"
                  />
                  <div className="flex justify-between">
                    <Button variant="outline" size="sm">
                      <Heart className="h-4 w-4 mr-2" />
                      {selectedNFT.likes} Likes
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedNFT.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Current Price</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {selectedNFT.isAuction ? selectedNFT.highestBid : selectedNFT.price} {selectedNFT.currency}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        (${((selectedNFT.isAuction ? selectedNFT.highestBid! : selectedNFT.price) * 2500).toFixed(2)} USD)
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Attributes</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNFT.attributes.map((attr, idx) => (
                        <div key={idx} className="p-2 border rounded-lg">
                          <p className="text-xs text-muted-foreground">{attr.trait}</p>
                          <p className="font-medium text-sm">{attr.value}</p>
                          <p className="text-xs text-muted-foreground">{attr.rarity}% rarity</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Details</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contract Address</span>
                        <span className="font-mono">{formatAddress(selectedNFT.contractAddress)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token ID</span>
                        <span>{selectedNFT.tokenId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chain</span>
                        <span>{selectedNFT.chain}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Creator Royalties</span>
                        <span>{selectedNFT.royalties}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                {selectedNFT.isAuction ? (
                  <div className="flex gap-2 w-full">
                    <Input placeholder="Enter bid amount" className="flex-1" />
                    <Button className="min-w-[120px]">
                      <Gavel className="h-4 w-4 mr-2" />
                      Place Bid
                    </Button>
                  </div>
                ) : (
                  <Button className="w-full md:w-auto" onClick={() => handleBuy(selectedNFT)}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Buy for {selectedNFT.price} {selectedNFT.currency}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Mint NFT Dialog */}
      <Dialog open={isMintOpen} onOpenChange={setIsMintOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New NFT</DialogTitle>
            <DialogDescription>
              Mint your digital asset as an NFT on the blockchain
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Enter NFT name"
                value={mintForm.name}
                onChange={(e) => setMintForm({...mintForm, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your NFT"
                value={mintForm.description}
                onChange={(e) => setMintForm({...mintForm, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Upload Image</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop or click to upload
                </p>
                <Input type="file" className="hidden" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Collection</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Create new collection</SelectItem>
                    <SelectItem value="existing">My Collection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Blockchain</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (ETH)</Label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={mintForm.price}
                  onChange={(e) => setMintForm({...mintForm, price: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Royalties (%)</Label>
                <Input
                  type="number"
                  placeholder="2.5"
                  value={mintForm.royalties}
                  onChange={(e) => setMintForm({...mintForm, royalties: e.target.value})}
                />
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Minting Fee</AlertTitle>
              <AlertDescription>
                Estimated gas fee: 0.02 ETH (~$50 USD)
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMintOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMint} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <Sparkles className="h-4 w-4 mr-2" />
              Create NFT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
