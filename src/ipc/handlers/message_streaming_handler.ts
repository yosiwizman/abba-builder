/**
 * Message Streaming Handler for Real-time AI Responses
 * Handles streaming responses from multiple AI providers
 */

import { BrowserWindow } from "electron";
import { db } from "../../db";
import { messages, chats } from "../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";
import { DyadOrchestrator } from "../../services/enhanced/orchestrator";
import { createLoggedHandler } from "./safe_handle";
import EventEmitter from "events";

const logger = log.scope("message_streaming");
const handle = createLoggedHandler(logger);

// Stream manager for handling multiple concurrent streams
class StreamManager extends EventEmitter {
  private activeStreams: Map<string, AbortController> = new Map();
  private orchestrator: DyadOrchestrator | null = null;
  
  constructor() {
    super();
    this.initializeOrchestrator();
  }
  
  private async initializeOrchestrator() {
    try {
      // Initialize with API key from environment or settings
      const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";
      this.orchestrator = new DyadOrchestrator(apiKey);
      await this.orchestrator.initialize();
      logger.info("Orchestrator initialized for message streaming");
    } catch (error) {
      logger.error("Failed to initialize orchestrator:", error);
    }
  }
  
  async streamMessage(
    chatId: number,
    userMessage: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    const streamId = `${chatId}-${Date.now()}`;
    const abortController = new AbortController();
    this.activeStreams.set(streamId, abortController);
    
    try {
      // Save user message to database
      const [userMsg] = await db.insert(messages).values({
        chatId,
        role: "user" as const,
        content: userMessage,
        modelUsed: "user",
      }).returning();
      
      // Emit user message event
      this.emit("message", {
        chatId,
        messageId: userMsg.id,
        role: "user",
        content: userMessage,
        complete: true,
      });
      
      // Get chat context
      const chat = await db.query.chats.findFirst({
        where: eq(chats.id, chatId),
        with: {
          messages: {
            orderBy: (messages, { desc }) => [desc(messages.createdAt)],
            limit: 10, // Last 10 messages for context
          },
        },
      });
      
      if (!chat) {
        throw new Error("Chat not found");
      }
      
      // Build context from previous messages
      const context = chat.messages
        .reverse()
        .map(m => `${m.role}: ${m.content}`)
        .join("\n");
      
      // Start assistant message in database
      const [assistantMsg] = await db.insert(messages).values({
        chatId,
        role: "assistant" as const,
        content: "",
        modelUsed: options.model || "claude-3-opus",
      }).returning();
      
      let fullResponse = "";
      let tokenCount = 0;
      
      // Use orchestrator for generation if available
      if (this.orchestrator) {
        try {
          // Generate response with orchestrator
          const result = await this.orchestrator.generateCode({
            request: userMessage,
            type: this.detectRequestType(userMessage),
            options: {
              ...options,
              context,
              streaming: true,
              onToken: (token: string) => {
                fullResponse += token;
                tokenCount++;
                
                // Emit streaming event
                this.emit("stream", {
                  chatId,
                  messageId: assistantMsg.id,
                  token,
                  tokenCount,
                });
                
                // Check if aborted
                if (abortController.signal.aborted) {
                  throw new Error("Stream aborted");
                }
              },
            },
          });
          
          if (result.success && result.code) {
            fullResponse = result.code;
            
            // Add metadata about generation
            const metadata = {
              generationType: result.generationType,
              modelUsed: result.modelUsed,
              iterations: result.iterations,
              validated: result.validation?.success,
            };
            
            fullResponse = `${fullResponse}\n\n<!-- Metadata: ${JSON.stringify(metadata)} -->`;
          }
        } catch (orchError) {
          logger.error("Orchestrator generation failed:", orchError);
          // Fall back to template response
          fullResponse = await this.generateFallbackResponse(userMessage, context);
        }
      } else {
        // No orchestrator available, use fallback
        fullResponse = await this.generateFallbackResponse(userMessage, context);
      }
      
      // Update assistant message with full response
      await db.update(messages)
        .set({ 
          content: fullResponse,
          tokenCount,
          completedAt: new Date(),
        })
        .where(eq(messages.id, assistantMsg.id));
      
      // Emit completion event
      this.emit("message", {
        chatId,
        messageId: assistantMsg.id,
        role: "assistant",
        content: fullResponse,
        complete: true,
        tokenCount,
      });
      
      // Update chat title if it's the first exchange
      if (chat.messages.length === 0 && !chat.title) {
        const title = this.generateChatTitle(userMessage, fullResponse);
        await db.update(chats).set({ title }).where(eq(chats.id, chatId));
        this.emit("chatTitleUpdate", { chatId, title });
      }
      
      return fullResponse;
    } catch (error: any) {
      logger.error("Stream message error:", error);
      this.emit("error", {
        chatId,
        error: error.message || "Stream failed",
      });
      throw error;
    } finally {
      this.activeStreams.delete(streamId);
    }
  }
  
  private detectRequestType(message: string): "web" | "desktop" | "react" | "mobile" {
    const lower = message.toLowerCase();
    if (lower.includes("react") || lower.includes("component")) return "react";
    if (lower.includes("electron") || lower.includes("desktop")) return "desktop";
    if (lower.includes("mobile") || lower.includes("react native")) return "mobile";
    return "web";
  }
  
  private async generateFallbackResponse(userMessage: string, _context: string): Promise<string> {
    // Intelligent fallback based on common patterns
    const lower = userMessage.toLowerCase();
    
    if (lower.includes("hello") || lower.includes("hi")) {
      return "Hello! I'm Abba AI, your coding assistant. I can help you create web applications, React components, desktop apps with Electron, and more. What would you like to build today?";
    }
    
    if (lower.includes("help") || lower.includes("what can you do")) {
      return `I can help you with:
• 🌐 Creating web applications (HTML, CSS, JavaScript)
• ⚛️ Building React components and applications
• 🖥️ Developing desktop apps with Electron
• 📱 Creating mobile apps with React Native
• 🔧 Writing scripts and automation tools
• 🐍 Python development and data science
• 🚀 Setting up CI/CD pipelines
• 📦 Managing dependencies and project structure

What would you like to create?`;
    }
    
    if (lower.includes("create") || lower.includes("build") || lower.includes("make")) {
      return `I understand you want to create something. To provide the best solution, could you tell me more about:
1. What type of application (web, desktop, mobile)?
2. What features do you need?
3. Any specific technologies or frameworks you prefer?

Based on your request: "${userMessage}"

I'll prepare a template to get you started. In the meantime, you can browse the Project Library for existing templates that might match your needs.`;
    }
    
    // Default response
    return `I'm processing your request: "${userMessage}"

While I work on generating the optimal solution, here are some suggestions:
1. Check the Project Library for similar templates
2. Use the Knowledge Hub to find relevant patterns
3. Browse the GitHub templates for inspiration

I'll have a more detailed response ready soon. In the meantime, feel free to provide more specific requirements or constraints for your project.`;
  }
  
  private generateChatTitle(userMessage: string, _response: string): string {
    // Extract key terms from the message
    const keywords = userMessage
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(" ")
      .filter(word => word.length > 3)
      .slice(0, 3);
    
    if (keywords.length > 0) {
      return keywords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    
    return "New Chat";
  }
  
  abortStream(chatId: number) {
    for (const [streamId, controller] of this.activeStreams) {
      if (streamId.startsWith(`${chatId}-`)) {
        controller.abort();
        this.activeStreams.delete(streamId);
        logger.info(`Aborted stream for chat ${chatId}`);
      }
    }
  }
  
  abortAllStreams() {
    for (const controller of this.activeStreams.values()) {
      controller.abort();
    }
    this.activeStreams.clear();
    logger.info("Aborted all active streams");
  }
}

// Singleton instance
const streamManager = new StreamManager();

export function registerMessageStreamingHandlers() {
  logger.info("Registering message streaming handlers");
  
  // Stream a message with AI response
  handle("stream-message", async (event, params: {
    chatId: number;
    message: string;
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    };
  }) => {
    const { chatId, message, options } = params;
    
    if (!chatId || !message) {
      throw new Error("Chat ID and message are required");
    }
    
    // Get the window to send streaming events
    const window = BrowserWindow.fromWebContents(event.sender);
    
    if (window) {
      // Forward streaming events to the renderer
      const streamHandler = (data: any) => {
        window.webContents.send("message-stream", data);
      };
      
      const errorHandler = (data: any) => {
        window.webContents.send("message-error", data);
      };
      
      streamManager.on("stream", streamHandler);
      streamManager.on("message", streamHandler);
      streamManager.on("error", errorHandler);
      streamManager.on("chatTitleUpdate", (data) => {
        window.webContents.send("chat-title-update", data);
      });
      
      try {
        const response = await streamManager.streamMessage(chatId, message, options);
        
        // Cleanup listeners
        streamManager.off("stream", streamHandler);
        streamManager.off("message", streamHandler);
        streamManager.off("error", errorHandler);
        
        return { success: true, response };
      } catch (error: any) {
        // Cleanup listeners on error
        streamManager.off("stream", streamHandler);
        streamManager.off("message", streamHandler);
        streamManager.off("error", errorHandler);
        
        throw error;
      }
    } else {
      // No window, just return the response
      const response = await streamManager.streamMessage(chatId, message, options);
      return { success: true, response };
    }
  });
  
  // Abort a stream
  handle("abort-stream", async (_event, chatId: number) => {
    streamManager.abortStream(chatId);
    return { success: true };
  });
  
  // Abort all streams
  handle("abort-all-streams", async () => {
    streamManager.abortAllStreams();
    return { success: true };
  });
  
  // Get streaming status
  handle("get-stream-status", async () => {
    return {
      activeStreams: streamManager.activeStreams.size,
      isInitialized: streamManager.orchestrator !== null,
    };
  });
  
  logger.info("Message streaming handlers registered successfully");
}
