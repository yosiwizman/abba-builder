import React, { useState, useEffect } from "react";
import {
  Search,
  Database,
  Brain,
  Bug,
  CheckCircle,
  AlertTriangle,
  Book,
  Github,
  FileText,
  Trash2,
  Download,
  RefreshCw,
  Code2,
  Shield,
} from "lucide-react";
import ProjectLibrary from "./ProjectLibrary";
import BlockchainHub from "./BlockchainHub";

const KnowledgeHub = () => {
  const [activeTab, setActiveTab] = useState("patterns");
  const [searchTerm, setSearchTerm] = useState("");
  const [knowledgeData, setKnowledgeData] = useState({
    patterns: [],
    bugs: [],
    scraped: [],
    templates: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadKnowledgeData();
  }, []);

  const loadKnowledgeData = async () => {
    setLoading(true);
    try {
      // Call REAL IPC handlers that connect to your actual database
      const [patterns, bugs, scraped, templates] = await Promise.all([
        window.electron.invoke("knowledge:get-patterns"),
        window.electron.invoke("knowledge:get-bugs"),
        window.electron.invoke("knowledge:get-scraped"),
        window.electron.invoke("knowledge:get-templates"),
      ]);

      setKnowledgeData({
        patterns: patterns.data || [],
        bugs: bugs.data || [],
        scraped: scraped.data || [],
        templates: templates.data || [],
      });
      setLoading(false);
    } catch (error) {
      console.error("Failed to load knowledge data:", error);
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      // Trigger real data refresh from GitHub, StackOverflow, etc
      await window.electron.invoke("knowledge:refresh");
      // Reload the data
      await loadKnowledgeData();
    } catch (error) {
      console.error("Failed to refresh:", error);
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const result = await window.electron.invoke("knowledge:export");
      if (result.success) {
        // Handle export (save to file)
        console.log("Exported data:", result.data);
      }
    } catch (error) {
      console.error("Failed to export:", error);
    }
  };

  const clearData = async () => {
    if (confirm("Are you sure you want to clear the knowledge base?")) {
      try {
        await window.electron.invoke("knowledge:clear");
        await loadKnowledgeData();
      } catch (error) {
        console.error("Failed to clear:", error);
      }
    }
  };

  const filteredData = () => {
    const currentData = knowledgeData[activeTab];
    if (!searchTerm) return currentData;

    return currentData.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-green-500";
      case "syncing":
        return "text-blue-500";
      case "inactive":
        return "text-gray-500";
      default:
        return "text-gray-400";
    }
  };

  const getSuccessRateColor = (rate) => {
    if (rate >= 95) return "text-green-500";
    if (rate >= 85) return "text-blue-500";
    if (rate >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Knowledge Hub
              </h1>
              <p className="text-sm text-gray-500">
                AI Learning Database - Live Data
              </p>
            </div>
          </div>
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      <div className="px-6 py-4 bg-white border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="px-6 py-3 bg-white border-b">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("patterns")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === "patterns"
                ? "bg-purple-100 text-purple-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Successful Patterns ({knowledgeData.patterns.length})
          </button>
          <button
            onClick={() => setActiveTab("bugs")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === "bugs"
                ? "bg-purple-100 text-purple-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Bug className="w-4 h-4" />
            Known Bugs ({knowledgeData.bugs.length})
          </button>
          <button
            onClick={() => setActiveTab("scraped")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === "scraped"
                ? "bg-purple-100 text-purple-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Database className="w-4 h-4" />
            Scraped Sources ({knowledgeData.scraped.length})
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === "templates"
                ? "bg-purple-100 text-purple-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            Templates ({knowledgeData.templates.length})
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === "projects"
                ? "bg-purple-100 text-purple-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Code2 className="w-4 h-4" />
            Project Library (1000+)
          </button>
          <button
            onClick={() => setActiveTab("blockchain")}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === "blockchain"
                ? "bg-purple-100 text-purple-700"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Shield className="w-4 h-4" />
            Blockchain
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "projects" ? (
          <ProjectLibrary />
        ) : activeTab === "blockchain" ? (
          <BlockchainHub />
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredData().length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              No data yet. Click Refresh to load from database.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeTab === "patterns" &&
              filteredData().map((pattern) => (
                <div
                  key={pattern.id}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {pattern.name}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                        {pattern.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-bold ${getSuccessRateColor(pattern.successRate)}`}
                      >
                        {pattern.successRate}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Used {pattern.usage} times
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {activeTab === "bugs" &&
              filteredData().map((bug) => (
                <div
                  key={bug.id}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <code className="text-sm text-red-600 font-mono">
                          {bug.error}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <p className="text-sm text-gray-700">{bug.solution}</p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-semibold text-gray-600">
                        {bug.frequency} times
                      </div>
                      <div className="text-xs text-gray-500">
                        from {bug.source}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {activeTab === "scraped" &&
              filteredData().map((source) => (
                <div
                  key={source.id}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Github className="w-6 h-6 text-gray-600" />
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {source.source}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Last updated{" "}
                          {new Date(source.lastUpdate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          {source.items.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">items</div>
                      </div>
                      <div
                        className={`flex items-center gap-1 ${getStatusColor(source.status)}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${source.status === "active" ? "bg-green-500" : source.status === "syncing" ? "bg-blue-500 animate-pulse" : "bg-gray-500"}`}
                        ></div>
                        <span className="text-sm capitalize">
                          {source.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {activeTab === "templates" &&
              filteredData().map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                          {template.framework}
                        </span>
                        <span className="text-xs text-gray-500">
                          {template.components} components
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${i < Math.floor(template.rating) ? "text-yellow-400" : "text-gray-300"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-sm font-semibold">
                        {template.rating}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="bg-white border-t px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Book className="w-4 h-4 text-purple-600" />
              <span className="text-gray-600">
                Total Knowledge Items:{" "}
                <span className="font-semibold text-gray-800">
                  {Object.values(knowledgeData).reduce(
                    (sum, arr) => sum + arr.length,
                    0,
                  )}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">
                Active Sources:{" "}
                <span className="font-semibold text-gray-800">
                  {
                    knowledgeData.scraped.filter((s) => s.status === "active")
                      .length
                  }
                </span>
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportData}
              className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={clearData}
              className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeHub;
