/**
 * Enhanced App Gallery Component
 * Features: Edit functionality, app info display, screenshot preview
 */

import React, { useState, useEffect, } from "react";
import {
  MoreVertical,
  Edit,
  Info,
  Trash2,
  FolderOpen,
  RefreshCw,
  HardDrive,
  Calendar,
  Code,
  Play,
} from "lucide-react";

const AppGalleryEnhanced = () => {
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [editingApp, setEditingApp] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [menuOpen, setMenuOpen] = useState({});
  const [screenshots, setScreenshots] = useState({});

  // Load apps from storage or API
  useEffect(() => {
    loadApps();
    loadScreenshots();
  }, []);

  const loadApps = async () => {
    try {
      // This would be replaced with actual app loading logic
      const storedApps = (await window.electronAPI?.getApps()) || getMockApps();
      setApps(storedApps);
    } catch (error) {
      console.error("Failed to load apps:", error);
      setApps(getMockApps());
    }
  };

  const getMockApps = () => {
    return [
      {
        id: "whistling-hedgehog-rest",
        name: "whistling-hedgehog-rest",
        description: "No description available",
        createdAt: new Date(Date.now() - 2 * 60000),
        color: "#10B981",
        size: "45.2 MB",
        location: "C:\\Users\\yosiw\\dyad-apps\\whistling-hedgehog-rest",
        buildDate: new Date(Date.now() - 2 * 60000),
        framework: "Electron",
        version: "1.0.0",
      },
      {
        id: "calm-beluga-crawl",
        name: "calm-beluga-crawl",
        description: "No description available",
        createdAt: new Date(Date.now() - 22 * 60000),
        color: "#FB923C",
        size: "32.8 MB",
        location: "C:\\Users\\yosiw\\dyad-apps\\calm-beluga-crawl",
        buildDate: new Date(Date.now() - 22 * 60000),
        framework: "Tauri",
        version: "1.0.0",
      },
      {
        id: "wise-kraken-zoom",
        name: "wise-kraken-zoom",
        description: "No description available",
        createdAt: new Date(Date.now() - 4 * 3600000),
        color: "#10B981",
        size: "67.4 MB",
        location: "C:\\Users\\yosiw\\dyad-apps\\wise-kraken-zoom",
        buildDate: new Date(Date.now() - 4 * 3600000),
        framework: "Flutter",
        version: "1.0.0",
      },
      {
        id: "radiant-iguana-sprint",
        name: "radiant-iguana-sprint",
        description: "No description available",
        createdAt: new Date(Date.now() - 4 * 3600000),
        color: "#A855F7",
        size: "28.9 MB",
        location: "C:\\Users\\yosiw\\dyad-apps\\radiant-iguana-sprint",
        buildDate: new Date(Date.now() - 4 * 3600000),
        framework: "Electron",
        version: "1.0.0",
      },
    ];
  };

  const loadScreenshots = async () => {
    // Load actual screenshots for each app
    const screenshots = {};
    for (const app of apps) {
      try {
        const screenshot = await captureAppScreenshot(app.id);
        screenshots[app.id] = screenshot;
      } catch (error) {
        console.error(`Failed to load screenshot for ${app.id}:`, error);
      }
    }
    setScreenshots(screenshots);
  };

  const captureAppScreenshot = async (appId) => {
    try {
      // Call electron API to capture screenshot
      if (window.electronAPI?.captureScreenshot) {
        const screenshotPath =
          await window.electronAPI.captureScreenshot(appId);
        return screenshotPath;
      }
      return null;
    } catch (error) {
      console.error("Screenshot capture failed:", error);
      return null;
    }
  };

  const handleEdit = (app) => {
    setEditingApp({ ...app });
    setMenuOpen({});
  };

  const handleSaveEdit = async () => {
    if (!editingApp) return;

    try {
      // Update app in storage
      const updatedApps = apps.map((app) =>
        app.id === editingApp.id ? editingApp : app,
      );
      setApps(updatedApps);

      // Save to backend
      if (window.electronAPI?.updateApp) {
        await window.electronAPI.updateApp(editingApp);
      }

      setEditingApp(null);
    } catch (error) {
      console.error("Failed to save app edits:", error);
    }
  };

  const handleDelete = async (appId) => {
    if (!confirm("Are you sure you want to delete this app?")) return;

    try {
      // Remove from list
      setApps(apps.filter((app) => app.id !== appId));

      // Delete from storage
      if (window.electronAPI?.deleteApp) {
        await window.electronAPI.deleteApp(appId);
      }

      setMenuOpen({});
    } catch (error) {
      console.error("Failed to delete app:", error);
    }
  };

  const handleShowInfo = (app) => {
    setSelectedApp(app);
    setShowInfo(true);
    setMenuOpen({});
  };

  const handleLaunchApp = async (app) => {
    try {
      if (window.electronAPI?.launchApp) {
        await window.electronAPI.launchApp(app.id, app.location);
      } else {
        console.log("Launching app:", app.name);
      }
    } catch (error) {
      console.error("Failed to launch app:", error);
    }
  };

  const handleOpenFolder = async (location) => {
    try {
      if (window.electronAPI?.openFolder) {
        await window.electronAPI.openFolder(location);
      } else {
        console.log("Opening folder:", location);
      }
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  };

  const handleRefreshScreenshot = async (appId) => {
    try {
      const screenshot = await captureAppScreenshot(appId);
      setScreenshots((prev) => ({ ...prev, [appId]: screenshot }));
    } catch (error) {
      console.error("Failed to refresh screenshot:", error);
    }
  };

  

  const formatDate = (date) => {
    if (!date) return "Unknown";
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  };

  const getTimeAgo = (date) => {
    if (!date) return "";
    const now = new Date();
    const d = new Date(date);
    const diff = now - d;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `about ${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `about ${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "just now";
  };

  return (
    <div className="app-gallery-enhanced">
      <div className="gallery-header">
        <h1>App Gallery</h1>
        <p>All your created apps in one place. Click on any app to open it.</p>
        <p className="note">
          Visual previews are automatically captured for each app.
        </p>
      </div>

      <div className="apps-grid">
        {apps.map((app) => (
          <div key={app.id} className="app-card">
            <div
              className="app-thumbnail"
              style={{ backgroundColor: app.color }}
            >
              {screenshots[app.id] ? (
                <img src={screenshots[app.id]} alt={app.name} />
              ) : (
                <div className="placeholder">
                  <Code size={48} />
                  <span>{app.name}</span>
                </div>
              )}

              <button
                className="refresh-screenshot"
                onClick={() => handleRefreshScreenshot(app.id)}
                title="Refresh screenshot"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="app-content">
              <div className="app-header">
                <h3>{app.name}</h3>
                <div className="app-menu">
                  <button
                    className="menu-trigger"
                    onClick={() =>
                      setMenuOpen({ ...menuOpen, [app.id]: !menuOpen[app.id] })
                    }
                  >
                    <MoreVertical size={20} />
                  </button>

                  {menuOpen[app.id] && (
                    <div className="dropdown-menu">
                      <button onClick={() => handleEdit(app)}>
                        <Edit size={16} /> Edit
                      </button>
                      <button onClick={() => handleShowInfo(app)}>
                        <Info size={16} /> Info
                      </button>
                      <button onClick={() => handleOpenFolder(app.location)}>
                        <FolderOpen size={16} /> Open Folder
                      </button>
                      <button onClick={() => handleLaunchApp(app)}>
                        <Play size={16} /> Launch
                      </button>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="delete"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <p className="app-description">{app.description}</p>
              <div className="app-meta">
                <span className="framework">{app.framework}</span>
                <span className="time">{getTimeAgo(app.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingApp && (
        <div className="modal-overlay" onClick={() => setEditingApp(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit App</h2>
            <div className="form-group">
              <label>App Name</label>
              <input
                type="text"
                value={editingApp.name}
                onChange={(e) =>
                  setEditingApp({ ...editingApp, name: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editingApp.description}
                onChange={(e) =>
                  setEditingApp({ ...editingApp, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Version</label>
              <input
                type="text"
                value={editingApp.version}
                onChange={(e) =>
                  setEditingApp({ ...editingApp, version: e.target.value })
                }
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setEditingApp(null)}>Cancel</button>
              <button onClick={handleSaveEdit} className="primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && selectedApp && (
        <div className="modal-overlay" onClick={() => setShowInfo(false)}>
          <div
            className="modal info-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>App Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">
                  <Code size={16} /> Name
                </span>
                <span className="info-value">{selectedApp.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  <HardDrive size={16} /> Size
                </span>
                <span className="info-value">{selectedApp.size}</span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  <FolderOpen size={16} /> Location
                </span>
                <span className="info-value">{selectedApp.location}</span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  <Calendar size={16} /> Build Date
                </span>
                <span className="info-value">
                  {formatDate(selectedApp.buildDate)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Framework</span>
                <span className="info-value">{selectedApp.framework}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Version</span>
                <span className="info-value">{selectedApp.version}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => handleOpenFolder(selectedApp.location)}>
                <FolderOpen size={16} /> Open Folder
              </button>
              <button onClick={() => setShowInfo(false)} className="primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppGalleryEnhanced;
