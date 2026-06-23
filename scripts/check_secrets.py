"""CI script: scan the codebase for hardcoded API keys and credentials.

Usage:
    python scripts/check_secrets.py

Exit code:
    0 if no secrets found
    1 if potential secrets detected (CI should fail)
"""

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

SECRET_PATTERNS = [
    (r'(?i)MISTRAL_API_KEY\s*=\s*["\']?[A-Za-z0-9_\-]{20,}', "Mistral API key"),
    (r'(?i)VITE_MAPPLS_API_KEY\s*=\s*["\']?[A-Za-z0-9_\-]{20,}', "Mappls API key"),
    (r'(?i)TWILIO_ACCOUNT_SID\s*=\s*["\']?AC[A-Za-z0-9_\-]{20,}', "Twilio Account SID"),
    (r'(?i)TWILIO_AUTH_TOKEN\s*=\s*["\']?[A-Za-z0-9_\-]{20,}', "Twilio Auth Token"),
    (r'(?i)openai.*sk-[A-Za-z0-9_\-]{20,}', "OpenAI API key"),
    (r'(?i)api.?key\s*[:=]\s*["\'][A-Za-z0-9_\-]{20,}', "Generic API key"),
    (r'(?i)password\s*[:=]\s*["\'][^"\']{6,}', "Password"),
    (r'(?i)secret\s*[:=]\s*["\'][A-Za-z0-9_\-]{10,}', "Secret"),
]

EXCLUDE_DIRS = {
    '.git', '__pycache__', 'node_modules', 'dist', 'build',
    'data', 'outputs', '.opencode',
}

EXCLUDE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.pdf', '.parquet', '.db', '.db-wal', '.db-shm', '.csv'}


def scan_file(filepath: Path) -> list:
    issues = []
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        return issues

    for pattern, label in SECRET_PATTERNS:
        matches = re.finditer(pattern, content)
        for match in matches:
            start_line = content[:match.start()].count('\n') + 1
            # Redact the matched value for safe display
            redacted = match.group()[:20] + '...'
            issues.append((filepath, start_line, label, redacted))
    return issues


def main():
    all_issues = []
    files_scanned = 0

    for filepath in REPO_ROOT.rglob('*'):
        # Skip excluded directories
        rel = filepath.relative_to(REPO_ROOT)
        if any(part in EXCLUDE_DIRS for part in rel.parts):
            continue
        if filepath.suffix.lower() in EXCLUDE_EXTENSIONS:
            continue
        if not filepath.is_file():
            continue
        if filepath.name == '.env':
            continue

        files_scanned += 1
        all_issues.extend(scan_file(filepath))

    print(f"Scanned {files_scanned} files.")

    if all_issues:
        print(f"\n{'=' * 60}")
        print(f"⚠️  FOUND {len(all_issues)} POTENTIAL SECRET(S)")
        print(f"{'=' * 60}")
        for filepath, line, label, match in sorted(all_issues, key=lambda x: (x[0], x[1])):
            rel_path = filepath.relative_to(REPO_ROOT)
            print(f"  [{label}] {rel_path}:{line} -> {match}")
        print(f"\nAction required: Rotate exposed keys. Run `git rm --cached .env` if .env is tracked.")
        sys.exit(1)
    else:
        print("✅ No hardcoded secrets found.")
        sys.exit(0)


if __name__ == '__main__':
    main()
