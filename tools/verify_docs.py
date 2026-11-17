"""Check portable local Markdown links without opening external sites."""
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
LINK = re.compile(r'!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^)\n]+)\s*\)')


def markdown_files(root):
    if (root / '.git').exists():
        result = subprocess.run(['git', 'ls-files', '-z', '-co', '--exclude-standard'],
                                cwd=root, check=True, capture_output=True)
        return sorted({root / name for name in result.stdout.decode().split('\0')
                       if name.endswith('.md') and (root / name).is_file()})
    excluded = {'.git', '.scratch', '.venv', 'venv', 'node_modules', '.pio', '.vs', '.build-v3'}
    return sorted(path for path in root.rglob('*.md') if not excluded.intersection(path.relative_to(root).parts))


def link_errors(path, root):
    errors = []
    fence = None
    for number, line in enumerate(path.read_text(encoding='utf-8-sig').splitlines(), 1):
        marker = re.match(r'^\s{0,3}(`{3,}|~{3,})', line)
        if marker:
            if fence is None:
                fence = marker[1]
            elif marker[1][0] == fence[0] and len(marker[1]) >= len(fence):
                fence = None
            continue
        if fence:
            continue
        for match in LINK.finditer(line):
            target = match[1].strip()
            if target.startswith('<'):
                target = target[1:-1]
            else:
                target = re.split(r'\s+["\']', target, maxsplit=1)[0]
            url = urlsplit(target)
            if url.scheme == 'file' or re.match(r'^[A-Za-z]:[/\\]', target):
                errors.append((number, target, 'machine-specific path'))
                continue
            if url.scheme or target.startswith('//') or not url.path:
                continue
            relative = unquote(url.path)
            destination = (root / relative.lstrip('/') if relative.startswith('/')
                           else path.parent / relative).resolve()
            if not destination.is_relative_to(root.resolve()):
                errors.append((number, target, 'outside repository'))
            elif not destination.exists():
                errors.append((number, target, 'missing destination'))
    return errors


def verify(root=ROOT):
    files = markdown_files(root)
    errors = [(path.relative_to(root), line, target, reason)
              for path in files for line, target, reason in link_errors(path, root)]
    return len(files), errors


if __name__ == '__main__':
    count, errors = verify()
    for path, line, target, reason in errors:
        print(f'{path}:{line}: {reason}: {target}')
    print(f'Checked {count} Markdown files; {len(errors)} local link errors.')
    raise SystemExit(bool(errors))
