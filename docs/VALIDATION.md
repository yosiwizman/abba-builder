# Python Validation Engine & Open Interpreter

The default validation engine (src/services/enhanced/validation_engine.py) performs lightweight syntax and static checks without external dependencies.

## Extending Validation with Open Interpreter (Optional)

If you want real execution validation and richer diagnostics, you can integrate [Open Interpreter](https://github.com/KillianLucas/open-interpreter) or your preferred tool.

1) Install packages (suggested virtual environment):

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install open-interpreter
```

2) Add a new mode in validation_engine.py to spawn or call the interpreter for certain languages. For example, you could:
- Write the generated code to a temp file
- Execute it under a sandboxed interpreter process
- Capture stdout/stderr and return structured JSON

3) Ensure the Node bridge (python-bridge.ts) passes code via a temp file (already implemented) and supports timeouts and large outputs.

Security note: Never run untrusted code outside a sandbox. Consider Docker, firejail, or restricted interpreters when executing code.

