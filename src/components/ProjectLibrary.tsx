import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Filter,
  Download,
  Star,
  GitBranch,
  Github,
  Plus,
  Copy,
  ExternalLink,
  Package,
  TrendingUp,
  Code,
  Folder,
  RefreshCw,
  ChevronDown,
  Loader,
} from "lucide-react";

interface Project {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  topics: string[];
  lastUpdated: string;
  size: number;
  hasReadme: boolean;
  license?: string;
  forks?: number;
  openIssues?: number;
  localPath?: string;
}

interface ProjectStats {
  totalProjects: number;
  totalStars: number;
  languages: { [key: string]: number };
  topProjects: Project[];
}

const ProjectLibrary = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [sortBy, setSortBy] = useState<"stars" | "name" | "updated">("stars");
  const [showAddModal, setShowAddModal] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const LIMIT = 50;

  useEffect(() => {
    loadProjects(true);
  }, []);

  useEffect(() => {
    // Reset and reload when filters change
    setOffset(0);
    setProjects([]);
    setAllProjects([]);
    loadProjects(true);
  }, [searchTerm, selectedLanguage, sortBy]);

  const loadProjects = async (reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const currentOffset = reset ? 0 : offset;
      const result = await window.electron.invoke("project-library:get-all", {
        offset: currentOffset,
        limit: LIMIT,
        sortBy,
        filterLanguage: selectedLanguage,
        searchTerm: searchTerm || undefined,
      });
      
      if (result.success && result.data) {
        const newProjects = result.data.projects || [];
        
        if (reset) {
          setProjects(newProjects);
          setAllProjects(newProjects);
          setOffset(LIMIT);
        } else {
          setProjects(prev => [...prev, ...newProjects]);
          setAllProjects(prev => [...prev, ...newProjects]);
          setOffset(prev => prev + LIMIT);
        }
        
        setHasMore(newProjects.length === LIMIT);
        
        if (result.data.stats) {
          setStats(result.data.stats);
        }
        
        // Extract unique languages from all loaded projects
        if (reset) {
          const langSet = new Set<string>();
          allProjects.forEach((p: Project) => {
            if (p.language && p.language !== 'Unknown') langSet.add(p.language);
          });
          newProjects.forEach((p: Project) => {
            if (p.language && p.language !== 'Unknown') langSet.add(p.language);
          });
          setLanguages(Array.from(langSet).sort());
        }
        
//         console.log(`Loaded ${newProjects.length} projects (total: ${reset ? newProjects.length : projects.length + newProjects.length})`);
      } else {
        console.error("Failed to load projects - no data returned");
        if (reset) {
          setProjects([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      if (reset) {
        setProjects([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMockProjects = () => {
    // Mock data for development
    const mockProjects: Project[] = [
      {
        id: "1",
        owner: "facebook",
        name: "react",
        fullName: "facebook/react",
        description: "A declarative, efficient, and flexible JavaScript library for building user interfaces",
        stars: 215000,
        language: "JavaScript",
        topics: ["react", "ui", "frontend", "javascript", "library"],
        lastUpdated: "2024-01-15",
        size: 164825,
        hasReadme: true,
        license: "MIT",
        forks: 45000,
        openIssues: 1200,
      },
      {
        id: "2",
        owner: "tensorflow",
        name: "tensorflow",
        fullName: "tensorflow/tensorflow",
        description: "An Open Source Machine Learning Framework for Everyone",
        stars: 180000,
        language: "C++",
        topics: ["machine-learning", "tensorflow", "deep-learning", "python"],
        lastUpdated: "2024-01-14",
        size: 230000,
        hasReadme: true,
        license: "Apache-2.0",
        forks: 88000,
        openIssues: 2000,
      },
      {
        id: "3",
        owner: "vuejs",
        name: "vue",
        fullName: "vuejs/vue",
        description: "🖖 Vue.js is a progressive, incrementally-adoptable JavaScript framework",
        stars: 206000,
        language: "TypeScript",
        topics: ["vue", "javascript", "frontend", "framework"],
        lastUpdated: "2024-01-13",
        size: 34825,
        hasReadme: true,
        license: "MIT",
        forks: 33000,
        openIssues: 600,
      },
    ];
    setProjects(mockProjects);
    setLanguages(["JavaScript", "TypeScript", "Python", "C++", "Go", "Rust"]);
  };

  // Set up infinite scroll observer
  useEffect(() => {
    if (!loadMoreTriggerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadProjects(false);
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(loadMoreTriggerRef.current);
    
    return () => {
      if (loadMoreTriggerRef.current) {
        observer.unobserve(loadMoreTriggerRef.current);
      }
    };
  }, [hasMore, loadingMore, loading, offset]);
  
  const loadMoreProjects = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      loadProjects(false);
    }
  }, [hasMore, loadingMore, loading]);

  const refreshLibrary = async () => {
    setOffset(0);
    setProjects([]);
    setAllProjects([]);
    setHasMore(true);
    await loadProjects(true);
  };

  const addGithubRepo = async () => {
    if (!githubUrl) return;

    try {
      const result = await window.electron.invoke("project-library:add-github", {
        url: githubUrl,
      });
      if (result.success) {
        setGithubUrl("");
        setShowAddModal(false);
        await loadProjects();
      }
    } catch (error) {
      console.error("Failed to add GitHub repo:", error);
    }
  };

  const useAsTemplate = async (project: Project) => {
    try {
      // Show loading indicator
      const loadingMessage = document.createElement('div');
      loadingMessage.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2';
      loadingMessage.innerHTML = `
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Creating project from template...
      `;
      document.body.appendChild(loadingMessage);

      const result = await window.electron.invoke("project-library:use-template", {
        projectId: project.id,
        projectPath: project.localPath,
      });
      
      // Remove loading indicator
      document.body.removeChild(loadingMessage);
      
      if (result.success && result.data) {
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successMessage.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <p class="font-semibold">Project created successfully!</p>
              <p class="text-sm opacity-90">${result.data.projectPath}</p>
            </div>
          </div>
        `;
        document.body.appendChild(successMessage);
        
        // Remove success message after 5 seconds
        setTimeout(() => {
          document.body.removeChild(successMessage);
        }, 5000);
        
//         console.log("Project created from template:", result.data);
      } else {
        // Show error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        errorMessage.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <div>
              <p class="font-semibold">Failed to create project</p>
              <p class="text-sm opacity-90">${result.error || 'Unknown error'}</p>
            </div>
          </div>
        `;
        document.body.appendChild(errorMessage);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
          document.body.removeChild(errorMessage);
        }, 5000);
      }
    } catch (error) {
      console.error("Failed to use template:", error);
      // Show error notification
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      errorMessage.textContent = 'Failed to create project from template';
      document.body.appendChild(errorMessage);
      setTimeout(() => {
        document.body.removeChild(errorMessage);
      }, 5000);
    }
  };

  const openProjectRepo = (project: Project) => {
    window.electron.invoke("open-external-url", 
      `https://github.com/${project.fullName || `${project.owner}/${project.name}`}`
    );
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Project Library</h1>
              <p className="text-sm text-gray-500">
                Browse {projects.length} curated project templates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add GitHub Repo
            </button>
            <button
              onClick={refreshLibrary}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects by name, description, or topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Languages</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "stars" | "name" | "updated")}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="stars">Sort by Stars</option>
            <option value="name">Sort by Name</option>
            <option value="updated">Sort by Updated</option>
          </select>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" />
                <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" />
                <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6">
        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No projects found matching your criteria</p>
          </div>
        ) : viewMode === "grid" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {project.name}
                      </h3>
                      <p className="text-xs text-gray-500">{project.owner}</p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-semibold">
                        {formatNumber(project.stars)}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {project.description || "No description available"}
                  </p>

                  {project.language && (
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          project.language === "JavaScript" ? "bg-yellow-400" :
                          project.language === "TypeScript" ? "bg-blue-500" :
                          project.language === "Python" ? "bg-blue-600" :
                          project.language === "Go" ? "bg-cyan-500" :
                          project.language === "Rust" ? "bg-orange-600" :
                          project.language === "C++" ? "bg-pink-500" :
                          "bg-gray-400"
                        }`}
                      />
                      <span className="text-xs text-gray-600">{project.language}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.topics?.slice(0, 3).map((topic) => (
                      <span
                        key={topic}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                    {project.topics && project.topics.length > 3 && (
                      <span className="text-xs px-2 py-1 text-gray-500">
                        +{project.topics.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        useAsTemplate(project);
                      }}
                      className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                    >
                      Use Template
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openProjectRepo(project);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Github className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              ))}
            </div>
            
            {/* Load more trigger and indicator */}
            {hasMore && (
              <div ref={loadMoreTriggerRef} className="flex items-center justify-center py-8">
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Loading more projects...</span>
                  </div>
                ) : (
                  <button
                    onClick={loadMoreProjects}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load More Projects
                  </button>
                )}
              </div>
            )}
            
            {!hasMore && projects.length > 0 && (
              <div className="text-center py-4 text-gray-500">
                No more projects to load
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-2">
              {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">
                          {project.owner}/{project.name}
                        </h3>
                        {project.language && (
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                            {project.language}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {project.description || "No description"}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4" />
                        {formatNumber(project.stars)}
                      </div>
                      {project.forks && (
                        <div className="flex items-center gap-1">
                          <GitBranch className="w-4 h-4" />
                          {formatNumber(project.forks)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => useAsTemplate(project)}
                        className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => openProjectRepo(project)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              ))}
            </div>
            
            {/* Load more trigger and indicator for list view */}
            {hasMore && (
              <div ref={loadMoreTriggerRef} className="flex items-center justify-center py-8">
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Loading more projects...</span>
                  </div>
                ) : (
                  <button
                    onClick={loadMoreProjects}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load More Projects
                  </button>
                )}
              </div>
            )}
            
            {!hasMore && projects.length > 0 && (
              <div className="text-center py-4 text-gray-500">
                No more projects to load
              </div>
            )}
          </>
        )}
      </div>

      {/* Add GitHub Repo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Add GitHub Repository</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub URL
              </label>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setGithubUrl("");
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={addGithubRepo}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Add Repository
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-2/3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
                <p className="text-gray-500">{selectedProject.owner}</p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <p className="text-gray-700 mb-4">{selectedProject.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-500">Stars</span>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-semibold">{formatNumber(selectedProject.stars)}</span>
                </div>
              </div>
              {selectedProject.forks && (
                <div>
                  <span className="text-sm text-gray-500">Forks</span>
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">{formatNumber(selectedProject.forks)}</span>
                  </div>
                </div>
              )}
              {selectedProject.language && (
                <div>
                  <span className="text-sm text-gray-500">Language</span>
                  <div className="font-semibold">{selectedProject.language}</div>
                </div>
              )}
              {selectedProject.license && (
                <div>
                  <span className="text-sm text-gray-500">License</span>
                  <div className="font-semibold">{selectedProject.license}</div>
                </div>
              )}
            </div>

            {selectedProject.topics && selectedProject.topics.length > 0 && (
              <div className="mb-4">
                <span className="text-sm text-gray-500">Topics</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedProject.topics.map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  useAsTemplate(selectedProject);
                  setSelectedProject(null);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Use as Template
              </button>
              <button
                onClick={() => openProjectRepo(selectedProject)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                View on GitHub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectLibrary;
