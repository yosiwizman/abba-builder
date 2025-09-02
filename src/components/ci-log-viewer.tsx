import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  Copy,
  Maximize2,
  Minimize2,
  RefreshCw,
  X,
} from "lucide-react";

interface CILogViewerProps {
  logs: string[];
  title?: string;
  buildId?: string;
  isStreaming?: boolean;
  onClose?: () => void;
  className?: string;
}

export function CILogViewer({
  logs,
  title = "Build Logs",
  buildId,
  isStreaming = false,
  onClose,
  className = "",
}: CILogViewerProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!terminalRef.current || terminal.current) return;

    // Initialize terminal with VS Code-like theme
    terminal.current = new Terminal({
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#ffffff",
        black: "#000000",
        red: "#cd3131",
        green: "#0dbc79",
        yellow: "#e5e510",
        blue: "#2472c8",
        magenta: "#bc3fbc",
        cyan: "#11a8cd",
        white: "#e5e5e5",
        brightBlack: "#666666",
        brightRed: "#f14c4c",
        brightGreen: "#23d18b",
        brightYellow: "#f5f543",
        brightBlue: "#3b8eea",
        brightMagenta: "#d670d6",
        brightCyan: "#29b8db",
        brightWhite: "#e5e5e5",
      },
      fontSize: 13,
      fontFamily: '"Cascadia Code", "Courier New", monospace',
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 10000,
      convertEol: true,
    });

    // Add addons
    fitAddon.current = new FitAddon();
    terminal.current.loadAddon(fitAddon.current);

    const webLinksAddon = new WebLinksAddon();
    terminal.current.loadAddon(webLinksAddon);

    searchAddon.current = new SearchAddon();
    terminal.current.loadAddon(searchAddon.current);

    // Open terminal in the DOM
    terminal.current.open(terminalRef.current);

    // Fit after a small delay to ensure proper dimensions
    setTimeout(() => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    }, 0);

    // Add initial header
    terminal.current.writeln(
      `\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
    );
    terminal.current.writeln(
      `\x1b[1;33m  ${title}${buildId ? ` - Build #${buildId}` : ""}\x1b[0m`,
    );
    terminal.current.writeln(
      `\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n`,
    );

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.current?.dispose();
    };
  }, [title, buildId]);

  // Update logs when they change
  useEffect(() => {
    if (!terminal.current) return;

    // Clear and rewrite logs
    terminal.current.clear();

    // Write header again
    terminal.current.writeln(
      `\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`,
    );
    terminal.current.writeln(
      `\x1b[1;33m  ${title}${buildId ? ` - Build #${buildId}` : ""}\x1b[0m`,
    );
    terminal.current.writeln(
      `\x1b[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n`,
    );

    // Process and write logs with ANSI color support
    logs.forEach((log) => {
      const timestamp = new Date().toLocaleTimeString();
      let coloredLog = log;

      // Apply color based on log content
      if (log.includes("ERROR") || log.includes("FAILED")) {
        coloredLog = `\x1b[1;31m[${timestamp}] ${log}\x1b[0m`; // Red for errors
      } else if (log.includes("WARNING") || log.includes("WARN")) {
        coloredLog = `\x1b[1;33m[${timestamp}] ${log}\x1b[0m`; // Yellow for warnings
      } else if (log.includes("SUCCESS") || log.includes("PASSED")) {
        coloredLog = `\x1b[1;32m[${timestamp}] ${log}\x1b[0m`; // Green for success
      } else if (log.includes("INFO")) {
        coloredLog = `\x1b[1;36m[${timestamp}] ${log}\x1b[0m`; // Cyan for info
      } else if (log.startsWith("$") || log.startsWith(">")) {
        coloredLog = `\x1b[1;35m[${timestamp}] ${log}\x1b[0m`; // Magenta for commands
      } else {
        coloredLog = `\x1b[37m[${timestamp}] ${log}\x1b[0m`; // Default white
      }

      terminal.current?.writeln(coloredLog);
    });

    // Add streaming indicator if needed
    if (isStreaming) {
      terminal.current.writeln("");
      terminal.current.write("\x1b[1;33m⚡ Streaming logs...\x1b[0m");
    }

    // Scroll to bottom
    terminal.current.scrollToBottom();
  }, [logs, isStreaming, title, buildId]);

  const handleSearch = () => {
    if (searchAddon.current && searchQuery) {
      searchAddon.current.findNext(searchQuery, {
        regex: false,
        wholeWord: false,
        caseSensitive: false,
      });
    }
  };

  const handleSearchPrevious = () => {
    if (searchAddon.current && searchQuery) {
      searchAddon.current.findPrevious(searchQuery, {
        regex: false,
        wholeWord: false,
        caseSensitive: false,
      });
    }
  };

  const handleCopyAll = () => {
    if (terminal.current) {
      const selection = terminal.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      } else {
        // Copy all content
        const buffer = terminal.current.buffer.active;
        let content = "";
        for (let i = 0; i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) {
            content += line.translateToString(true) + "\n";
          }
        }
        navigator.clipboard.writeText(content);
      }
    }
  };

  const handleDownload = () => {
    const content = logs.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `build-${buildId || "logs"}-${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    terminal.current?.clear();
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      fitAddon.current?.fit();
    }, 100);
  };

  return (
    <div
      className={`flex flex-col ${
        isFullscreen ? "fixed inset-0 z-50 bg-background" : ""
      } ${className}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {buildId && (
            <span className="text-xs text-muted-foreground">#{buildId}</span>
          )}
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-yellow-500">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Search */}
          {searchVisible && (
            <div className="flex items-center gap-1 mr-2">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                  if (e.key === "Escape") setSearchVisible(false);
                }}
                className="h-7 w-40 text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSearchPrevious}
                className="h-7 w-7 p-0"
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSearch}
                className="h-7 w-7 p-0"
              >
                ↓
              </Button>
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSearchVisible(!searchVisible)}
            title="Search"
            className="h-7 w-7 p-0"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyAll}
            title="Copy All"
            className="h-7 w-7 p-0"
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            title="Download Logs"
            className="h-7 w-7 p-0"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            title="Clear"
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="h-7 w-7 p-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              title="Close"
              className="h-7 w-7 p-0 ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className={`flex-1 ${isFullscreen ? "h-full" : "h-96"} bg-[#1e1e1e]`}
      />
    </div>
  );
}
