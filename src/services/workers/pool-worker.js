/**
 * Worker script for Piscina thread pool
 * Handles CPU-intensive tasks in separate threads
 */

const ts = require("typescript");
const esprima = require("esprima");
const uglifyjs = require("uglify-js");
const beautify = require("js-beautify");

/**
 * Main task handler
 */
module.exports = async function (task) {
  const { type, data } = task;
  const startTime = Date.now();

  try {
    let result;

    switch (type) {
      case "compile":
        result = await compileTypeScript(data);
        break;

      case "parse":
        result = await parseCode(data);
        break;

      case "analyze":
        result = await analyzeCode(data);
        break;

      case "transform":
        result = await transformCode(data);
        break;

      case "custom":
        result = await executeCustomTask(data);
        break;

      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    return {
      success: true,
      data: result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
};

/**
 * Compile TypeScript code
 */
async function compileTypeScript({ code, options = {} }) {
  const defaultOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    ...options,
  };

  const result = ts.transpileModule(code, {
    compilerOptions: defaultOptions,
  });

  return {
    outputText: result.outputText,
    diagnostics:
      result.diagnostics?.map((d) => ({
        message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
        category: d.category,
        code: d.code,
        start: d.start,
        length: d.length,
      })) || [],
  };
}

/**
 * Parse JavaScript/TypeScript code
 */
async function parseCode({ code, _language = "javascript" }) {
  try {
    // Use esprima for JavaScript parsing
    const ast = esprima.parseScript(code, {
      loc: true,
      range: true,
      tokens: true,
      comment: true,
      tolerant: true,
    });

    // Extract metrics
    const metrics = {
      lines: code.split("\n").length,
      functions: 0,
      classes: 0,
      imports: 0,
      exports: 0,
      complexity: 0,
    };

    // Simple AST traversal to count elements
    traverseAST(ast, (node) => {
      switch (node.type) {
        case "FunctionDeclaration":
        case "FunctionExpression":
        case "ArrowFunctionExpression":
          metrics.functions++;
          break;
        case "ClassDeclaration":
        case "ClassExpression":
          metrics.classes++;
          break;
        case "ImportDeclaration":
          metrics.imports++;
          break;
        case "ExportDefaultDeclaration":
        case "ExportNamedDeclaration":
        case "ExportAllDeclaration":
          metrics.exports++;
          break;
        case "IfStatement":
        case "WhileStatement":
        case "ForStatement":
        case "DoWhileStatement":
        case "SwitchStatement":
          metrics.complexity++;
          break;
      }
    });

    return {
      ast,
      metrics,
      errors: [],
    };
  } catch (error) {
    return {
      ast: null,
      metrics: null,
      errors: [error.message],
    };
  }
}

/**
 * Analyze code for patterns, issues, and improvements
 */
async function analyzeCode({ code, language }) {
  const parseResult = await parseCode({ code, language });

  if (!parseResult.ast) {
    return {
      issues: [],
      suggestions: [],
      metrics: null,
      error: parseResult.errors[0],
    };
  }

  const issues = [];
  const suggestions = [];

  // Check for common issues
  traverseAST(parseResult.ast, (node, _parent) => {
    // Check for console.log statements
    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      node.callee.object.name === "console"
    ) {
      issues.push({
        type: "warning",
        message: `Console statement found at line ${node.loc?.start.line}`,
        line: node.loc?.start.line,
        column: node.loc?.start.column,
      });
    }

    // Check for var declarations (suggest let/const)
    if (node.type === "VariableDeclaration" && node.kind === "var") {
      suggestions.push({
        type: "improvement",
        message: `Use 'let' or 'const' instead of 'var' at line ${node.loc?.start.line}`,
        line: node.loc?.start.line,
      });
    }

    // Check for deeply nested code (complexity)
    if (node.type === "BlockStatement") {
      const depth = getNodeDepth(node, parseResult.ast);
      if (depth > 4) {
        issues.push({
          type: "complexity",
          message: `Deeply nested code (depth: ${depth}) at line ${node.loc?.start.line}`,
          line: node.loc?.start.line,
        });
      }
    }
  });

  // Calculate cognitive load score
  const cognitiveLoad = calculateCognitiveLoad(parseResult.metrics);

  return {
    issues,
    suggestions,
    metrics: {
      ...parseResult.metrics,
      cognitiveLoad,
    },
  };
}

/**
 * Transform code (minify, beautify, transpile)
 */
async function transformCode({ code, transformType }) {
  switch (transformType) {
    case "minify":
      const minified = uglifyjs.minify(code);
      if (minified.error) {
        throw new Error(`Minification failed: ${minified.error}`);
      }
      return {
        output: minified.code,
        originalSize: code.length,
        minifiedSize: minified.code.length,
        reduction:
          ((1 - minified.code.length / code.length) * 100).toFixed(2) + "%",
      };

    case "beautify":
      const beautified = beautify.js(code, {
        indent_size: 2,
        indent_char: " ",
        max_preserve_newlines: 2,
        preserve_newlines: true,
        keep_array_indentation: false,
        break_chained_methods: false,
        indent_scripts: "normal",
        brace_style: "collapse",
        space_before_conditional: true,
        unescape_strings: false,
        wrap_line_length: 0,
        wrap_attributes: "auto",
        wrap_attributes_indent_size: 2,
        end_with_newline: true,
      });
      return {
        output: beautified,
        originalSize: code.length,
        beautifiedSize: beautified.length,
      };

    case "transpile":
      const transpiled = await compileTypeScript({ code });
      return {
        output: transpiled.outputText,
        diagnostics: transpiled.diagnostics,
      };

    default:
      throw new Error(`Unknown transform type: ${transformType}`);
  }
}

/**
 * Execute custom tasks
 */
async function executeCustomTask(data) {
  // This can be extended to handle any custom CPU-intensive task
  // For now, just echo back the data
  return {
    message: "Custom task executed",
    input: data,
    timestamp: Date.now(),
  };
}

/**
 * Helper: Traverse AST recursively
 */
function traverseAST(node, callback, parent = null) {
  if (!node || typeof node !== "object") return;

  callback(node, parent);

  for (const key in node) {
    if (key === "parent") continue; // Avoid circular references

    if (Array.isArray(node[key])) {
      node[key].forEach((child) => traverseAST(child, callback, node));
    } else if (typeof node[key] === "object") {
      traverseAST(node[key], callback, node);
    }
  }
}

/**
 * Helper: Get node depth in AST
 */
function getNodeDepth(node, root) {
  let depth = 0;
  let current = node;

  while (current && current !== root) {
    if (current.type === "BlockStatement" || current.type === "Program") {
      depth++;
    }
    current = current.parent;
  }

  return depth;
}

/**
 * Helper: Calculate cognitive load score
 */
function calculateCognitiveLoad(metrics) {
  if (!metrics) return 100;

  // Simple heuristic-based calculation
  let score = 100;

  // Penalize high complexity
  score -= Math.min(metrics.complexity * 2, 30);

  // Penalize too many functions (could be split into modules)
  if (metrics.functions > 10) {
    score -= Math.min((metrics.functions - 10) * 2, 20);
  }

  // Penalize long files
  if (metrics.lines > 200) {
    score -= Math.min(Math.floor((metrics.lines - 200) / 50) * 5, 25);
  }

  // Bonus for modular code (imports/exports)
  if (metrics.imports > 0 || metrics.exports > 0) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}
