/**
 * Browser Error Capture System
 * Injects into the renderer to capture ALL browser/React errors
 */

export class BrowserErrorCapture {
  private errors: any[] = [];
  private originalConsoleError: any;
  private originalConsoleWarn: any;
  private isDevelopment: boolean;
  
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development' || (window as any).location?.hostname === 'localhost';
    this.setupErrorCapture();
  }
  
  private setupErrorCapture() {
    // Save original console methods
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    
    // Override console.error
    console.error = (...args: any[]) => {
      // Filter out React forwardRef warnings in development
      const argStr = args.join(' ');
      if (this.isDevelopment && (
        argStr.includes('forwardRef') ||
        argStr.includes('Function components cannot be given refs') ||
        argStr.includes('Warning: Function components cannot have refs')
      )) {
        // Skip capturing these warnings
        return;
      }
      
      this.captureError('Console Error', args);
      this.originalConsoleError.apply(console, args);
    };
    
    // Override console.warn
    console.warn = (...args: any[]) => {
      // Filter out development warnings
      const argStr = args.join(' ');
      if (this.isDevelopment && (
        argStr.includes('PostHog') ||
        argStr.includes('$pageview') ||
        argStr.includes('forwardRef') ||
        argStr.includes('Function components cannot be given refs') ||
        argStr.includes('Warning: Function components cannot have refs') ||
        argStr.includes('beforeSend function')
      )) {
        // Skip capturing these warnings
        return;
      }
      
      // Only capture actual warnings, not dev noise
      if (!this.isDevelopment) {
        this.captureError('Console Warning', args);
      }
      this.originalConsoleWarn.apply(console, args);
    };
    
    // Capture window errors
    window.addEventListener('error', (event) => {
      this.captureError('Window Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack || event.error
      });
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError('Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
    
    // React error boundary fallback
    if (typeof window !== 'undefined') {
      const checkReactErrors = () => {
        const errorElements = document.querySelectorAll('[data-reactroot]');
        errorElements.forEach(el => {
          if (el.innerHTML.includes('Error') || el.innerHTML.includes('undefined')) {
            this.captureError('React Render Error', {
              html: el.innerHTML.substring(0, 500)
            });
          }
        });
      };
      
      // Check periodically for React errors
      setInterval(checkReactErrors, 5000);
    }
    
    // Check for missing elements
    this.checkForMissingElements();
    
    // Log initial page load status (only in production)
    
    window.addEventListener('DOMContentLoaded', () => {
      if (!this.isDevelopment) {
         console.log('[BrowserErrorCapture] DOM Loaded');
      }
      this.checkPageStatus();
    });
    
    window.addEventListener('load', () => {
      if (!this.isDevelopment) {
         console.log('[BrowserErrorCapture] Page Fully Loaded');
      }
      this.checkPageStatus();
    });
  }
  
  private captureError(type: string, data: any) {
    // Skip capturing warnings in development
    if (this.isDevelopment && (type === 'Console Warning' || type === 'React Render Error')) {
      return;
    }
    
    const error = {
      type,
      timestamp: new Date().toISOString(),
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.errors.push(error);
    
    // Only send to main process for actual errors, not warnings
    if ((window as any).electronAPI && type !== 'Console Warning') {
      (window as any).electronAPI.send('browser-error', error);
    }
    
    // Only log actual errors to console, not warnings in development
    if (!this.isDevelopment || type === 'Console Error' || type === 'Window Error') {
      console.log(
        `%c[${type}]`,
        'background: red; color: white; padding: 2px 5px; border-radius: 3px;',
        data
      );
    }
  }
  
  private checkForMissingElements() {
    setTimeout(() => {
      // Check if root element exists
      const root = document.getElementById('root');
      if (!root) {
        this.captureError('Missing Root Element', 'No #root element found');
        return;
      }
      
      // Check if root has content
      if (!root.innerHTML || root.innerHTML.trim() === '') {
        this.captureError('Empty Root Element', 'Root element has no content');
      }
      
      // Check for React
      if (!(window as any).React && !(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        this.captureError('React Not Loaded', 'React library not detected');
      }
      
      // Check for router
      if (!document.querySelector('[data-reactroot]') && !document.querySelector('#root > div')) {
        this.captureError('React Not Rendering', 'No React components rendered');
      }
    }, 3000);
  }
  
  private checkPageStatus() {
    const status = {
      hasRoot: !!document.getElementById('root'),
      hasContent: document.body.innerHTML.length > 100,
      reactLoaded: !!(window as any).React || !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
      stylesLoaded: document.styleSheets.length > 0,
      scriptsLoaded: document.scripts.length > 0,
      errors: this.errors.length
    };
    
    // Only log in production or if there's an actual issue
    if (!this.isDevelopment && !status.hasContent) {
       console.log('[Page Status]', status);
      this.captureError('Page Load Failed', status);
    }
  }
  
  public getErrors() {
    return this.errors;
  }
  
  public clearErrors() {
    this.errors = [];
  }
  
  public exportReport() {
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      errors: this.errors,
      pageInfo: {
        title: document.title,
        readyState: document.readyState,
        stylesheets: document.styleSheets.length,
        scripts: document.scripts.length,
        hasRoot: !!document.getElementById('root')
      }
    };
    
     console.log('[Error Report]', report);
    return report;
  }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  (window as any).__errorCapture = new BrowserErrorCapture();
  // Only log initialization in production
  const isDevelopment = process.env.NODE_ENV === 'development' || (window as any).location?.hostname === 'localhost';
  if (!isDevelopment) {
     console.log('[BrowserErrorCapture] Initialized');
  }
}
