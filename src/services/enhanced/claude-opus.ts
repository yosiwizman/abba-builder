/**
 * Claude Opus 4.1 Service with 200K Context Support
 * Real implementation for Abba AI Builder
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { getAnthropicKey, getOpenAIKey } from '../../config/secrets';
import * as log from 'electron-log';

interface ClaudeOpusConfig {
  apiKey: string;
  maxTokens?: number;
  thinkingTokens?: number;
}

interface GenerationResult {
  success: boolean;
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  error?: string;
  streaming?: boolean;
  generationType?: 'real_claude' | 'fallback_template' | 'error';
  modelUsed?: string;
  tokensUsed?: number;
  duration?: number;
  retryCount?: number;
}

export class ClaudeOpusService {
  private client: Anthropic | null = null;
  private logger = log.scope('claude-opus');
  private maxContextTokens = 200000;
  private maxOutputTokens = 32000;
  private apiKey: string;
  private currentModel: string;
  private fallbackModel: string;
  private MAX_RETRIES: number;
  private STREAMING_TIMEOUT_MS: number;
  private openAIFallback: any = null;
  
  constructor(config?: ClaudeOpusConfig) {
    // Pull from secrets module first, then config, then env fallback
    this.apiKey = config?.apiKey || getAnthropicKey() || '';

    // Configure models and behavior from env with sensible defaults
    this.currentModel = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest';
    this.fallbackModel = process.env.CLAUDE_FALLBACK_MODEL || 'claude-3-haiku-20240307';
    this.MAX_RETRIES = Number(process.env.CLAUDE_MAX_RETRIES || 3);
    this.STREAMING_TIMEOUT_MS = Number(process.env.CLAUDE_STREAMING_TIMEOUT || 300000); // 5 minutes
    
    if (this.apiKey) {
      try {
        this.client = new Anthropic({
          apiKey: this.apiKey
        });
        this.logger.info(`Claude initialized with model: ${this.currentModel}`);
      } catch (error) {
        this.logger.error('Failed to initialize Claude client:', error);
      }
    } else {
      this.logger.warn('Claude API key not found, will attempt OpenAI fallback if available');
      this.initializeOpenAIFallback();
    }
  }

  /**
   * Initialize OpenAI as fallback when Claude is unavailable
   */
  private async initializeOpenAIFallback() {
    const openAIKey = getOpenAIKey();
    if (openAIKey) {
      try {
        const OpenAI = (await import('openai')).default;
        this.openAIFallback = new OpenAI({ apiKey: openAIKey });
        this.logger.info('OpenAI fallback initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize OpenAI fallback:', error);
      }
    } else {
      this.logger.warn('No OpenAI API key available for fallback');
    }
  }
  
  /**
   * Generate code with full 200K context window
   * Prefers streaming for long requests to avoid SDK timeouts.
   */
  async generateWithFullContext(
    prompt: string, 
    projectContext: any,
    thinkingTokens = 50000
  ): Promise<GenerationResult> {
    if (!this.client) {
      // Try OpenAI fallback
      if (this.openAIFallback) {
        this.logger.warn('Claude unavailable, attempting OpenAI fallback');
        return await this.generateWithOpenAIFallback(prompt, projectContext);
      }
      
      return {
        success: false,
        content: '',
        error: 'Claude API key not configured and no fallback available'
      };
    }
    
    const contextualPrompt = this.buildContextualPrompt(prompt, projectContext);
    const modelsToTry = [this.currentModel, this.fallbackModel];
    const preferStreaming = Boolean(process.env.CLAUDE_FORCE_STREAMING === 'true' || (projectContext?.totalTokens || 0) > 10000);

     console.log(`🔍 Claude.generateWithFullContext -> preferStreaming=${preferStreaming}, modelsToTry=${modelsToTry.join(' -> ')}`);

    let lastError: any = null;

    for (const model of modelsToTry) {
      for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
        try {
          if (preferStreaming) {
            const res = await this.callStreaming(model, contextualPrompt, this.STREAMING_TIMEOUT_MS);
            res.retryCount = attempt;
            return res;
          }
          const res = await this.callNonStreaming(model, contextualPrompt);
          res.retryCount = attempt;
          return res;
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || err);
          // Backoff on rate limit / overloaded
          if (msg.includes('rate') || msg.includes('overload') || msg.includes('429')) {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            continue; // retry same model
          }
          // Non-retryable error -> break to next model
          break;
        }
      }
    }

    console.error('Claude generation failed:', lastError);
    return {
      success: false,
      content: '',
      error: (lastError && (lastError.message || String(lastError))) || 'Generation failed'
    };
  }
  
  /**
   * Multi-stage generation with thinking process
   * Uses streaming for heavy stages to prevent long-request timeouts.
   */
  async generateWithThinking(
    prompt: string,
    context: any,
    stages: string[] = ['analyze', 'plan', 'implement', 'optimize']
  ): Promise<GenerationResult> {
    if (!this.client) {
      return {
        success: false,
        content: '',
        error: 'Claude API key not configured'
      };
    }
    
    let fullContent = '';
    let totalUsage = {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0
    };

    const preferStreaming = Boolean(process.env.CLAUDE_FORCE_STREAMING === 'true' || (context?.totalTokens || 0) > 10000);
    let anyReal = false;
    let totalDuration = 0;
    let lastModel: string | undefined = undefined;
    
    for (const stage of stages) {
      const stagePrompt = this.buildStagePrompt(stage, prompt, context, fullContent);

      let result: GenerationResult;
      if (preferStreaming || stage === 'implement' || stage === 'optimize') {
        result = await this.generateWithFullContext(stagePrompt, context, 30000);
      } else {
        result = await this.generateWithFullContext(stagePrompt, context, 30000);
      }
      
      if (!result.success) {
        return result;
      }
      
      fullContent += `\n\n## ${stage.toUpperCase()}\n${result.content}`;
      totalDuration += result.duration || 0;
      if (result.generationType === 'real_claude') {
        anyReal = true;
        lastModel = result.modelUsed || lastModel;
      }
      
      if (result.usage) {
        totalUsage.input_tokens += result.usage.input_tokens;
        totalUsage.output_tokens += result.usage.output_tokens;
        totalUsage.total_tokens += result.usage.total_tokens;
      }
    }
    
    return {
      success: true,
      content: fullContent,
      usage: totalUsage,
      generationType: anyReal ? 'real_claude' : 'error',
      modelUsed: lastModel,
      duration: totalDuration,
    };
  }
  
  /**
   * Build contextual prompt with project information
   */
  private buildContextualPrompt(prompt: string, context: any): string {
    const contextStr = typeof context === 'string' 
      ? context 
      : JSON.stringify(context, null, 2);
    
    // Truncate context if it exceeds limits
    const maxContextChars = this.maxContextTokens * 3; // Rough estimate
    const truncatedContext = contextStr.length > maxContextChars
      ? contextStr.substring(0, maxContextChars) + '\n... [context truncated]'
      : contextStr;
    
    return `## PROJECT CONTEXT
${truncatedContext}

## USER REQUEST
${prompt}

## INSTRUCTIONS
1. Analyze the project context carefully
2. Generate production-ready code that integrates seamlessly
3. Follow existing patterns and conventions in the codebase
4. Include proper error handling and type safety
5. Add comprehensive comments for complex logic
6. Ensure the code is testable and maintainable

Please provide the complete implementation.`;
  }
  
  /**
   * Build stage-specific prompts for multi-stage generation
   */
  private buildStagePrompt(stage: string, originalPrompt: string, context: any, previousWork: string): string {
    const stagePrompts: Record<string, string> = {
      analyze: `Analyze the codebase and requirements for: ${originalPrompt}
      Identify key components, dependencies, and integration points.`,
      
      plan: `Based on the analysis, create a detailed implementation plan for: ${originalPrompt}
      Include architecture decisions, component structure, and data flow.
      Previous analysis: ${previousWork}`,
      
      implement: `Implement the solution for: ${originalPrompt}
      Follow the plan and analysis provided.
      Previous work: ${previousWork}`,
      
      optimize: `Optimize and refine the implementation for: ${originalPrompt}
      Improve performance, add error handling, and ensure best practices.
      Current implementation: ${previousWork}`
    };
    
    return stagePrompts[stage] || originalPrompt;
  }
  
  /**
   * Get system prompt for Claude
   */
  private getSystemPrompt(): string {
    return `You are an expert full-stack developer working on the Abba AI Builder project.
You have deep knowledge of:
- React, TypeScript, and modern JavaScript
- Electron and desktop application development
- Node.js and backend services
- Testing with Playwright and Vitest
- AI/ML integration and prompt engineering
- Software architecture and design patterns

Your goal is to generate high-quality, production-ready code that:
1. Follows best practices and conventions
2. Is properly typed with TypeScript
3. Includes error handling and validation
4. Is well-documented and maintainable
5. Integrates seamlessly with existing code
6. Achieves a 95% success rate in testing

Always think step-by-step and explain your reasoning when implementing complex solutions.`;
  }
  
  /**
   * Validate API key and connection
   */
  async validateConnection(): Promise<boolean> {
    if (!this.client) {
      console.error('No Claude client initialized');
      return false;
    }
    
    try {
      const testModel = this.currentModel;
      const response = await this.client.messages.create({
        model: testModel,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Test connection'
        }]
      });
      
      return response.content.length > 0;
    } catch (error) {
      console.error('Claude connection validation failed:', error);
      return false;
    }
  }

  /**
   * Public: Force a streaming generation attempt with context.
   */
  async generateWithStreaming(
    prompt: string,
    projectContext: any,
    timeoutMs: number = this.STREAMING_TIMEOUT_MS
  ): Promise<GenerationResult> {
    if (!this.client) {
      return { success: false, content: '', error: 'Claude API key not configured' };
    }

    const contextualPrompt = this.buildContextualPrompt(prompt, projectContext);
    const modelsToTry = [this.currentModel, this.fallbackModel];
     console.log(`🔍 Claude.generateWithStreaming(timeout=${timeoutMs}) models=${modelsToTry.join(' -> ')}`);

    let lastError: any = null;
    for (const model of modelsToTry) {
      try {
        return await this.callStreaming(model, contextualPrompt, timeoutMs);
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        if (msg.includes('rate') || msg.includes('overload') || msg.includes('429')) {
          await new Promise((r) => setTimeout(r, 750));
          continue;
        }
      }
    }
    return { success: false, content: '', error: lastError?.message || String(lastError) || 'Streaming generation failed' };
  }

  /**
   * Test a specific model by making a tiny request.
   */
  async testModel(model: string): Promise<boolean> {
    if (!this.client) throw new Error('Claude client not initialized');
    try {
      const res = await this.client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return Array.isArray(res.content) && res.content.length > 0;
    } catch (e: any) {
      throw new Error(e?.message || String(e));
    }
  }

  /**
   * Internal: call Anthropic streaming API and accumulate response.
   */
  private async callStreaming(model: string, contextualPrompt: string, timeoutMs: number): Promise<GenerationResult> {
    if (!this.client) {
      return { success: false, content: '', error: 'No client' };
    }

    const start = Date.now();
    const effectiveMax = this.getMaxOutputTokensForModel(model);
    const stream = await (this.client as any).messages.stream({
      model,
      max_tokens: effectiveMax,
      messages: [{ role: 'user', content: contextualPrompt }],
      temperature: 0.7,
      system: this.getSystemPrompt(),
    });

    let text = '';

    const streamPromise = (async () => {
      try {
        for await (const event of stream) {
          const ev: any = event;
          if (ev?.type === 'content_block_delta') {
            const delta = ev.delta;
            if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
              text += delta.text;
            }
          }
        }
      } finally {
        // no-op; stream should end on its own
      }
      return text;
    })();

    const timeoutPromise = new Promise<string>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`Streaming timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const content = await Promise.race([streamPromise, timeoutPromise]) as string;
      let usage = undefined;
      try {
        const finalMsg = await (stream as any).finalMessage?.();
        usage = (finalMsg as any)?.usage;
      } catch {}

      const duration = Date.now() - start;
       console.log(`✅ Claude ${model} streamed response in ${duration}ms, ${content.length} chars`);
      return {
        success: true,
        content,
        usage: usage || undefined,
        streaming: true,
        generationType: 'real_claude',
        modelUsed: model,
        tokensUsed: (usage as any)?.output_tokens,
        duration,
      };
    } catch (err: any) {
      const duration = Date.now() - start;
      console.warn(`Streaming failed for ${model} after ${duration}ms:`, err?.message || err);
      throw err;
    }
  }

  /**
   * Internal: non-streaming call (short/simple requests).
   */
  private async callNonStreaming(model: string, contextualPrompt: string): Promise<GenerationResult> {
    if (!this.client) {
      return { success: false, content: '', error: 'No client' };
    }

    const start = Date.now();
    const effectiveMax = this.getMaxOutputTokensForModel(model);
    const response = await this.client.messages.create({
      model,
      max_tokens: effectiveMax,
      messages: [
        { role: 'user', content: contextualPrompt }
      ],
      temperature: 0.7,
      system: this.getSystemPrompt()
    });

    const duration = Date.now() - start;
    const textContent = (response.content as any[])
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

     console.log(`✅ Claude ${model} responded in ${duration}ms`);

    return {
      success: true,
      content: textContent,
      usage: {
        input_tokens: (response as any).usage?.input_tokens || 0,
        output_tokens: (response as any).usage?.output_tokens || 0,
        total_tokens:
          ((response as any).usage?.input_tokens || 0) +
          ((response as any).usage?.output_tokens || 0),
      },
      streaming: false,
      generationType: 'real_claude',
      modelUsed: model,
      tokensUsed: (response as any).usage?.output_tokens || 0,
      duration,
    };
  }
  /**
   * Determine a safe max output token value per model.
   */
  private getMaxOutputTokensForModel(model: string): number {
    const lower = (model || '').toLowerCase();
    if (lower.includes('sonnet')) return Math.min(this.maxOutputTokens, 8192);
    if (lower.includes('haiku')) return Math.min(this.maxOutputTokens, 4096);
    if (lower.includes('opus')) return Math.min(this.maxOutputTokens, 8192);
    // default safe cap
    return Math.min(this.maxOutputTokens, 4096);
  }

  /**
   * Validate which configured models are available by making tiny requests.
   */
  async validateAvailableModels(): Promise<string[]> {
    if (!this.client) return [];
    const candidates = [
      this.currentModel,
      this.fallbackModel,
      'claude-3-5-sonnet-latest',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ].filter(Boolean) as string[];

    const available: string[] = [];
    for (const model of candidates) {
      try {
        await this.client!.messages.create({
          model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        });
         console.log(`✅ Model ${model} available`);
        available.push(model);
      } catch (e: any) {
         console.log(`❌ Model ${model} unavailable: ${e?.message || e}`);
      }
    }
    return available;
  }

  /**
   * Validate Claude API connection on startup
   */
  async validateConnection(): Promise<boolean> {
    if (!this.client) {
      this.logger.warn('No Claude client available to validate');
      if (this.openAIFallback) {
        this.logger.info('OpenAI fallback is available');
        return true;  // We have fallback
      }
      return false;
    }

    try {
      // Try a minimal test request
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      this.logger.info('Claude API connection validated successfully');
      return true;
    } catch (error: any) {
      this.logger.error('Claude connection validation failed:', error);
      if (error?.status === 401) {
        this.logger.error('Invalid API key - please check your ANTHROPIC_API_KEY');
      }
      // Try to initialize fallback
      await this.initializeOpenAIFallback();
      return !!this.openAIFallback;
    }
  }

  /**
   * Generate using OpenAI as fallback
   */
  private async generateWithOpenAIFallback(
    prompt: string,
    projectContext: any
  ): Promise<GenerationResult> {
    if (!this.openAIFallback) {
      return {
        success: false,
        content: '',
        error: 'No OpenAI fallback available',
      };
    }

    try {
      const contextualPrompt = this.buildContextualPrompt(prompt, projectContext);
      const start = Date.now();

      const completion = await this.openAIFallback.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: contextualPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      });

      const duration = Date.now() - start;
      const content = completion.choices[0]?.message?.content || '';

      this.logger.info(`OpenAI fallback responded in ${duration}ms`);

      return {
        success: true,
        content,
        usage: {
          input_tokens: completion.usage?.prompt_tokens || 0,
          output_tokens: completion.usage?.completion_tokens || 0,
          total_tokens: completion.usage?.total_tokens || 0,
        },
        generationType: 'fallback_template',
        modelUsed: 'gpt-4-turbo-preview',
        duration,
      };
    } catch (error) {
      this.logger.error('OpenAI fallback failed:', error);
      return {
        success: false,
        content: '',
        error: `OpenAI fallback failed: ${error}`,
      };
    }
  }
}

// Export default instance
const claudeOpus = new ClaudeOpusService();
export default claudeOpus;
