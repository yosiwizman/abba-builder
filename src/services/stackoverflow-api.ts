import axios, { AxiosInstance } from 'axios';
import log from 'electron-log';

const logger = log.scope('stackoverflow-api');

export interface StackOverflowQuestion {
  question_id: number;
  title: string;
  body: string;
  tags: string[];
  owner: {
    user_id?: number;
    display_name: string;
    reputation?: number;
    profile_image?: string;
  };
  is_answered: boolean;
  view_count: number;
  answer_count: number;
  score: number;
  creation_date: number;
  last_activity_date: number;
  link: string;
  accepted_answer_id?: number;
}

export interface StackOverflowAnswer {
  answer_id: number;
  question_id: number;
  body: string;
  owner: {
    user_id?: number;
    display_name: string;
    reputation?: number;
    profile_image?: string;
  };
  is_accepted: boolean;
  score: number;
  creation_date: number;
  last_activity_date: number;
}

export interface StackOverflowTag {
  name: string;
  count: number;
  has_synonyms: boolean;
  is_moderator_only: boolean;
  is_required: boolean;
}

export interface CommonError {
  error: string;
  solution: string;
  tags: string[];
  frequency: number;
  source: string;
  link?: string;
}

class StackOverflowAPIService {
  private client: AxiosInstance;
  private apiKey: string | null;
  private requestCount: number = 0;
  private dailyLimit: number = 10000; // StackExchange API daily limit with key

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.STACKOVERFLOW_API_KEY || null;
    
    this.client = axios.create({
      baseURL: 'https://api.stackexchange.com/2.3',
      params: {
        site: 'stackoverflow',
        ...(this.apiKey && { key: this.apiKey })
      },
      timeout: 10000
    });

    // Track API usage
    this.client.interceptors.response.use(
      (response) => {
        this.requestCount++;
        if (response.data?.quota_remaining) {
          logger.debug(`StackOverflow API quota remaining: ${response.data.quota_remaining}`);
        }
        return response;
      },
      (error) => {
        if (error.response?.status === 429) {
          logger.error('StackOverflow API rate limit exceeded');
        }
        return Promise.reject(error);
      }
    );
  }

  async searchQuestions(query: string, options: {
    tagged?: string[];
    sort?: 'activity' | 'votes' | 'creation' | 'relevance';
    order?: 'asc' | 'desc';
    page?: number;
    pagesize?: number;
    fromdate?: number;
    todate?: number;
  } = {}): Promise<{ items: StackOverflowQuestion[]; has_more: boolean }> {
    try {
      const params = {
        intitle: query,
        tagged: options.tagged?.join(';'),
        sort: options.sort || 'relevance',
        order: options.order || 'desc',
        page: options.page || 1,
        pagesize: Math.min(options.pagesize || 30, 100),
        fromdate: options.fromdate,
        todate: options.todate,
        filter: '!9_bDE(fI5' // Include body in response
      };

      const response = await this.client.get('/search/advanced', { params });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to search questions:', error.message);
      throw error;
    }
  }

  async getQuestionsByTags(tags: string[], options: {
    sort?: 'activity' | 'votes' | 'creation' | 'hot' | 'week' | 'month';
    order?: 'asc' | 'desc';
    page?: number;
    pagesize?: number;
  } = {}): Promise<{ items: StackOverflowQuestion[]; has_more: boolean }> {
    try {
      const params = {
        sort: options.sort || 'votes',
        order: options.order || 'desc',
        page: options.page || 1,
        pagesize: Math.min(options.pagesize || 30, 100),
        filter: '!9_bDE(fI5'
      };

      const tagString = tags.join(';');
      const response = await this.client.get(`/questions?tagged=${tagString}`, { params });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get questions by tags:', error.message);
      throw error;
    }
  }

  async getAnswers(questionId: number, options: {
    sort?: 'activity' | 'votes' | 'creation';
    order?: 'asc' | 'desc';
    page?: number;
    pagesize?: number;
  } = {}): Promise<{ items: StackOverflowAnswer[]; has_more: boolean }> {
    try {
      const params = {
        sort: options.sort || 'votes',
        order: options.order || 'desc',
        page: options.page || 1,
        pagesize: Math.min(options.pagesize || 10, 100),
        filter: '!9_bDE(fI5'
      };

      const response = await this.client.get(`/questions/${questionId}/answers`, { params });
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get answers for question ${questionId}:`, error.message);
      throw error;
    }
  }

  async getTrendingTags(options: {
    page?: number;
    pagesize?: number;
  } = {}): Promise<{ items: StackOverflowTag[]; has_more: boolean }> {
    try {
      const params = {
        sort: 'popular',
        order: 'desc',
        page: options.page || 1,
        pagesize: Math.min(options.pagesize || 30, 100)
      };

      const response = await this.client.get('/tags', { params });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get trending tags:', error.message);
      throw error;
    }
  }

  async extractCommonErrors(tags: string[]): Promise<CommonError[]> {
    try {
      // Search for error-related questions
      const errorKeywords = ['error', 'exception', 'failed', 'cannot', 'undefined', 'null'];
      const commonErrors: CommonError[] = [];

      for (const tag of tags) {
        for (const keyword of errorKeywords.slice(0, 3)) { // Limit to avoid too many requests
          try {
            const result = await this.searchQuestions(keyword, {
              tagged: [tag],
              sort: 'votes',
              pagesize: 10
            });

            for (const question of result.items) {
              if (question.is_answered && question.score > 10) {
                // Get the accepted answer if available
                let solution = 'Check Stack Overflow for solutions';
                if (question.accepted_answer_id) {
                  try {
                    const answers = await this.getAnswers(question.question_id, {
                      pagesize: 1
                    });
                    if (answers.items.length > 0) {
                      // Extract first paragraph of the answer as solution summary
                      const answerBody = answers.items[0].body;
                      solution = this.extractSolutionSummary(answerBody);
                    }
                  } catch (e) {
                    // Continue without answer details
                  }
                }

                commonErrors.push({
                  error: question.title,
                  solution,
                  tags: question.tags,
                  frequency: question.view_count,
                  source: 'StackOverflow',
                  link: question.link
                });
              }
            }

            // Avoid hitting rate limits
            await this.delay(100);
          } catch (error) {
            logger.warn(`Failed to extract errors for tag ${tag} and keyword ${keyword}`);
          }
        }
      }

      // Sort by frequency and return top errors
      return commonErrors
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 50);
    } catch (error: any) {
      logger.error('Failed to extract common errors:', error.message);
      throw error;
    }
  }

  async getRelatedQuestions(questionId: number): Promise<{ items: StackOverflowQuestion[]; has_more: boolean }> {
    try {
      const response = await this.client.get(`/questions/${questionId}/related`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get related questions for ${questionId}:`, error.message);
      throw error;
    }
  }

  async getPopularQuestionsByLanguage(language: string, options: {
    fromdate?: number;
    todate?: number;
    page?: number;
    pagesize?: number;
  } = {}): Promise<{ items: StackOverflowQuestion[]; has_more: boolean }> {
    try {
      // Map common language names to StackOverflow tags
      const languageTagMap: Record<string, string> = {
        'JavaScript': 'javascript',
        'TypeScript': 'typescript',
        'Python': 'python',
        'Java': 'java',
        'C#': 'c#',
        'C++': 'c++',
        'Go': 'go',
        'Rust': 'rust',
        'Ruby': 'ruby',
        'PHP': 'php',
        'Swift': 'swift',
        'Kotlin': 'kotlin',
        'Dart': 'dart',
        'R': 'r',
        'Scala': 'scala'
      };

      const tag = languageTagMap[language] || language.toLowerCase();
      
      return this.getQuestionsByTags([tag], {
        sort: 'votes',
        order: 'desc',
        page: options.page,
        pagesize: options.pagesize
      });
    } catch (error: any) {
      logger.error(`Failed to get popular questions for ${language}:`, error.message);
      throw error;
    }
  }

  getRequestCount(): number {
    return this.requestCount;
  }

  private extractSolutionSummary(htmlBody: string): string {
    // Simple HTML tag removal and truncation
    const textOnly = htmlBody.replace(/<[^>]*>/g, ' ').trim();
    const sentences = textOnly.split(/[.!?]+/);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default StackOverflowAPIService;
