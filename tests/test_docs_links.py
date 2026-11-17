"""Portable Markdown checks also work in a folder exported without Git metadata."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('verify_docs', Path(__file__).resolve().parents[1] / 'tools/verify_docs.py')
DOCS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(DOCS)


class DocumentationLinksTests(unittest.TestCase):
    def test_exported_folder_checks_links_but_skips_examples_and_external_urls(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'docs').mkdir()
            (root / 'image one.png').write_bytes(b'image')
            page = root / 'docs/guide.md'
            page.write_text('''[Image](../image%20one.png)
[Folder](../docs/)
[Anchor](#setup)
[Website](https://example.com/missing)
[Missing](absent.md)
[Drive](file:///C:/private/file.md)
[Escape](../../outside.md)
```markdown
[Example](example-only.md)
```
''', encoding='utf-8')
            count, errors = DOCS.verify(root)
            self.assertEqual(count, 1)
            self.assertEqual([error[3] for error in errors],
                             ['missing destination', 'machine-specific path', 'outside repository'])
            self.assertEqual([error[1] for error in errors], [5, 6, 7])


if __name__ == '__main__':
    unittest.main()
