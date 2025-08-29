#!/usr/bin/env python3
"""
Validation Engine for Code Verification
Validates generated code through syntax checking and static analysis
"""

import subprocess
import json
import sys
import tempfile
import os
import re
from typing import Dict, Any, List

class ValidationEngine:
    """Main validation engine for code verification"""
    
    def __init__(self):
        self.supported_languages = {
            'javascript': self._validate_js,
            'typescript': self._validate_ts,
            'python': self._validate_python,
            'html': self._validate_html,
            'css': self._validate_css,
            'json': self._validate_json
        }
    
    def validate_code(self, code: str, language: str) -> Dict[str, Any]:
        """Validate generated code by language"""
        try:
            language = language.lower()
            
            if language in self.supported_languages:
                return self.supported_languages[language](code)
            else:
                return {
                    'success': False,
                    'error': f'Unsupported language: {language}',
                    'suggestions': []
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'suggestions': []
            }
    
    def _validate_js(self, code: str) -> Dict[str, Any]:
        """Validate JavaScript code"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Try to parse with Node.js
            result = subprocess.run(
                ['node', '--check', temp_file],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                # Additional checks for common issues
                issues = self._check_common_js_issues(code)
                
                if issues:
                    return {
                        'success': True,
                        'warnings': issues,
                        'output': 'Syntax valid with warnings',
                        'suggestions': self._get_js_suggestions(issues)
                    }
                
                return {
                    'success': True,
                    'output': 'Syntax valid',
                    'suggestions': []
                }
            else:
                error_msg = result.stderr
                return {
                    'success': False,
                    'error': error_msg,
                    'line': self._extract_error_line(error_msg),
                    'suggestions': self._get_js_fix_suggestions(error_msg)
                }
        finally:
            os.unlink(temp_file)
    
    def _validate_ts(self, code: str) -> Dict[str, Any]:
        """Validate TypeScript code"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.ts', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Check if TypeScript compiler is available
            tsc_check = subprocess.run(
                ['npx', 'tsc', '--version'],
                capture_output=True,
                timeout=5
            )
            
            if tsc_check.returncode != 0:
                # Fall back to JavaScript validation
                return self._validate_js(code)
            
            # Validate with TypeScript compiler
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit', '--skipLibCheck', temp_file],
                capture_output=True,
                text=True,
                timeout=15
            )
            
            if result.returncode == 0:
                return {
                    'success': True,
                    'output': 'TypeScript syntax valid',
                    'suggestions': []
                }
            else:
                return {
                    'success': False,
                    'error': result.stdout or result.stderr,
                    'suggestions': self._get_ts_fix_suggestions(result.stdout)
                }
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': 'TypeScript validation timeout',
                'suggestions': ['Consider simplifying the code']
            }
        finally:
            os.unlink(temp_file)
    
    def _validate_python(self, code: str) -> Dict[str, Any]:
        """Validate Python code"""
        try:
            # Try to compile the code
            compile(code, '<string>', 'exec')
            
            # Check for common issues
            issues = self._check_common_python_issues(code)
            
            if issues:
                return {
                    'success': True,
                    'warnings': issues,
                    'output': 'Python syntax valid with warnings',
                    'suggestions': issues
                }
            
            return {
                'success': True,
                'output': 'Python syntax valid',
                'suggestions': []
            }
        except SyntaxError as e:
            return {
                'success': False,
                'error': str(e),
                'line': e.lineno,
                'suggestions': self._get_python_fix_suggestions(str(e))
            }
    
    def _validate_html(self, code: str) -> Dict[str, Any]:
        """Validate HTML code"""
        issues = []
        
        # Check for basic HTML structure
        if '<html' not in code.lower() and '<!doctype' not in code.lower():
            issues.append('Missing HTML doctype or html tag')
        
        # Check for unclosed tags
        open_tags = re.findall(r'<(\w+)[^>]*>', code)
        close_tags = re.findall(r'</(\w+)>', code)
        
        for tag in open_tags:
            if tag not in ['img', 'br', 'hr', 'input', 'meta', 'link']:
                if close_tags.count(tag) < open_tags.count(tag):
                    issues.append(f'Unclosed {tag} tag')
        
        if issues:
            return {
                'success': True,
                'warnings': issues,
                'output': 'HTML has issues',
                'suggestions': issues
            }
        
        return {
            'success': True,
            'output': 'HTML structure valid',
            'suggestions': []
        }
    
    def _validate_css(self, code: str) -> Dict[str, Any]:
        """Validate CSS code"""
        # Basic CSS validation
        if '{' in code and '}' in code:
            open_count = code.count('{')
            close_count = code.count('}')
            
            if open_count != close_count:
                return {
                    'success': False,
                    'error': f'Mismatched braces: {open_count} open, {close_count} close',
                    'suggestions': ['Check for missing closing braces']
                }
        
        return {
            'success': True,
            'output': 'CSS syntax appears valid',
            'suggestions': []
        }
    
    def _validate_json(self, code: str) -> Dict[str, Any]:
        """Validate JSON code"""
        try:
            json.loads(code)
            return {
                'success': True,
                'output': 'Valid JSON',
                'suggestions': []
            }
        except json.JSONDecodeError as e:
            return {
                'success': False,
                'error': str(e),
                'line': e.lineno if hasattr(e, 'lineno') else None,
                'suggestions': ['Check for missing commas', 'Ensure proper quote usage']
            }
    
    def _check_common_js_issues(self, code: str) -> List[str]:
        """Check for common JavaScript issues"""
        issues = []
        
        # Check for undefined variables (basic)
        if 'undefined' in code and 'typeof' not in code:
            issues.append('Possible undefined variable usage')
        
        # Check for missing semicolons (optional)
        lines = code.split('\n')
        for i, line in enumerate(lines):
            line = line.strip()
            if line and not line.endswith((';', '{', '}', ',', ':', '//', '*/')) and not line.startswith('//'):
                # This is a very basic check
                pass
        
        return issues
    
    def _check_common_python_issues(self, code: str) -> List[str]:
        """Check for common Python issues"""
        issues = []
        
        # Check for mixed indentation
        if '\t' in code and '    ' in code:
            issues.append('Mixed tabs and spaces in indentation')
        
        # Check for missing colons
        lines = code.split('\n')
        for line in lines:
            if any(keyword in line for keyword in ['def ', 'class ', 'if ', 'for ', 'while ', 'with ']):
                if not line.rstrip().endswith(':') and '//' not in line and '#' not in line:
                    issues.append(f'Possible missing colon: {line[:50]}...')
        
        return issues
    
    def _extract_error_line(self, error_msg: str) -> int:
        """Extract line number from error message"""
        match = re.search(r'line (\d+)', error_msg, re.IGNORECASE)
        if match:
            return int(match.group(1))
        return None
    
    def _get_js_suggestions(self, issues: List[str]) -> List[str]:
        """Get JavaScript fix suggestions"""
        suggestions = []
        for issue in issues:
            if 'undefined' in issue:
                suggestions.append('Check variable declarations')
            if 'semicolon' in issue:
                suggestions.append('Add semicolons to statement ends')
        return suggestions
    
    def _get_js_fix_suggestions(self, error: str) -> List[str]:
        """Get JavaScript error fix suggestions"""
        suggestions = []
        
        if 'unexpected token' in error.lower():
            suggestions.append('Check for missing brackets or parentheses')
            suggestions.append('Verify proper syntax for arrow functions')
        
        if 'is not defined' in error:
            suggestions.append('Import or declare the missing variable')
        
        return suggestions
    
    def _get_ts_fix_suggestions(self, error: str) -> List[str]:
        """Get TypeScript error fix suggestions"""
        suggestions = []
        
        if 'cannot find module' in error.lower():
            suggestions.append('Install missing dependencies')
            suggestions.append('Check import paths')
        
        if 'type' in error.lower():
            suggestions.append('Add proper type annotations')
        
        return suggestions
    
    def _get_python_fix_suggestions(self, error: str) -> List[str]:
        """Get Python error fix suggestions"""
        suggestions = []
        
        if 'indentation' in error.lower():
            suggestions.append('Fix indentation - use consistent spaces or tabs')
        
        if 'invalid syntax' in error.lower():
            suggestions.append('Check for missing colons or parentheses')
        
        return suggestions

def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python validation_engine.py <code_or_file> <language>'
        }))
        sys.exit(1)
    
    arg = sys.argv[1]
    language = sys.argv[2]
    
    # Allow either raw code or a path to a file containing code
    if os.path.exists(arg) and os.path.isfile(arg):
        try:
            with open(arg, 'r', encoding='utf-8') as f:
                code = f.read()
        except Exception as e:
            print(json.dumps({
                'success': False,
                'error': f'Failed to read code file: {str(e)}'
            }))
            sys.exit(1)
    else:
        code = arg
    
    engine = ValidationEngine()
    result = engine.validate_code(code, language)
    
    print(json.dumps(result))

if __name__ == '__main__':
    main()
