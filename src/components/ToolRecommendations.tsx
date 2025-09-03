import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, TrendingUp, Brain, Package, Star, Filter, Search } from 'lucide-react';
import { ESSENTIAL_TOOLS_FOR_SUCCESS, COGNITIVE_LOAD_TOOLS, getCriticalToolsForSuccess } from '../services/recommendations';

interface Tool {
  name: string;
  category: string;
  description: string;
  url: string;
  whyEssential: string;
  cognitiveLoadImpact: 'reduces' | 'neutral' | 'increases';
  successRate: number;
  maturityLevel: 'stable' | 'emerging' | 'experimental';
  integrationEffort: 'low' | 'medium' | 'high';
  tags: string[];
}

const ToolRecommendations: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showOnlyCritical, setShowOnlyCritical] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'success' | 'cognitive' | 'name'>('success');

  useEffect(() => {
    // Load tools based on filter
    const toolsList = showOnlyCritical 
      ? getCriticalToolsForSuccess()
      : [...ESSENTIAL_TOOLS_FOR_SUCCESS, ...COGNITIVE_LOAD_TOOLS];
    
    setTools(toolsList);
    filterAndSortTools(toolsList, selectedCategory, searchQuery, sortBy);
  }, [showOnlyCritical, selectedCategory, searchQuery, sortBy]);

  const filterAndSortTools = (
    toolsList: Tool[], 
    category: string, 
    search: string, 
    sort: string
  ) => {
    let filtered = toolsList;

    // Category filter
    if (category !== 'all') {
      filtered = filtered.filter(tool => tool.category === category);
    }

    // Search filter
    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(tool => 
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case 'success':
          return b.successRate - a.successRate;
        case 'cognitive':
          const cognitiveWeight = { reduces: 0, neutral: 1, increases: 2 };
          return cognitiveWeight[a.cognitiveLoadImpact] - cognitiveWeight[b.cognitiveLoadImpact];
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    setFilteredTools(filtered);
  };

  const categories = Array.from(new Set(tools.map(tool => tool.category))).sort();

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getMaturityBadge = (level: string) => {
    switch (level) {
      case 'stable': 
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Stable</span>;
      case 'emerging': 
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Emerging</span>;
      case 'experimental': 
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Experimental</span>;
      default: 
        return null;
    }
  };

  const getCognitiveImpactIcon = (impact: string) => {
    switch (impact) {
      case 'reduces':
        return <Brain className="w-4 h-4 text-green-500" title="Reduces cognitive load" />;
      case 'increases':
        return <Brain className="w-4 h-4 text-red-500" title="Increases cognitive load" />;
      default:
        return <Brain className="w-4 h-4 text-gray-400" title="Neutral cognitive impact" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Package className="w-8 h-8 text-purple-500" />
          Essential Tools for Success
        </h1>
        <p className="text-gray-600">
          Curated open-source tools to reduce development time, increase performance, and improve success rates
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{tools.length}</div>
          <div className="text-sm text-gray-600">Total Tools</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {tools.filter(t => t.successRate >= 90).length}
          </div>
          <div className="text-sm text-gray-600">90%+ Success Rate</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {tools.filter(t => t.cognitiveLoadImpact === 'reduces').length}
          </div>
          <div className="text-sm text-gray-600">Reduce Cognitive Load</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {tools.filter(t => t.integrationEffort === 'low').length}
          </div>
          <div className="text-sm text-gray-600">Easy Integration</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="success">Sort by Success Rate</option>
            <option value="cognitive">Sort by Cognitive Impact</option>
            <option value="name">Sort by Name</option>
          </select>

          {/* Critical Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyCritical}
              onChange={(e) => setShowOnlyCritical(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium">Critical Tools Only (90%+)</span>
          </label>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool, index) => (
          <div
            key={`${tool.name}-${index}`}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">{tool.name}</h3>
                <p className="text-sm text-gray-500">{tool.category}</p>
              </div>
              <div className="flex items-center gap-2">
                {getCognitiveImpactIcon(tool.cognitiveLoadImpact)}
                <div className="text-lg font-bold text-green-600">{tool.successRate}%</div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 mb-3">{tool.description}</p>

            {/* Why Essential */}
            <div className="bg-blue-50 rounded p-3 mb-3">
              <p className="text-xs text-blue-800">
                <strong>Why Essential:</strong> {tool.whyEssential}
              </p>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-3 mb-4 text-xs">
              {getMaturityBadge(tool.maturityLevel)}
              <span className={`flex items-center gap-1 ${getEffortColor(tool.integrationEffort)}`}>
                <Clock className="w-3 h-3" />
                {tool.integrationEffort} effort
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {tool.tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Action Button */}
            <a
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No tools found matching your criteria</p>
        </div>
      )}

      {/* Footer with Recommendations */}
      <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Top Recommendations for Your Stack
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {getCriticalToolsForSuccess().slice(0, 4).map(tool => (
            <div key={tool.name} className="bg-white rounded p-3">
              <div className="font-medium text-sm">{tool.name}</div>
              <div className="text-xs text-gray-500 mt-1">{tool.category}</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-xs font-semibold text-green-600">{tool.successRate}%</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-4">
          These tools have the highest success rates and lowest cognitive load impact for modern development teams.
        </p>
      </div>
    </div>
  );
};

export default ToolRecommendations;
