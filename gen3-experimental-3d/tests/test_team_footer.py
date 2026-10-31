"""Render the shared contact cards without starting robot controllers."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

from jinja2 import Environment, FileSystemLoader, select_autoescape


WEB = Path(__file__).resolve().parents[1] / 'backend' / 'web_dashboard'


class Elements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.actions = []
        self.text = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('class') == 'surge-team-action':
            self.actions.append((tag, attrs))

    def handle_data(self, data):
        self.text.append(data)


class TeamFooterTests(unittest.TestCase):
    def test_contact_actions_and_unprovided_slots(self):
        env = Environment(loader=FileSystemLoader(WEB / 'templates'),
                          autoescape=select_autoescape())
        for template in ('index.html', 'gen3.html'):
            with self.subTest(template=template):
                parsed = Elements(env.get_template(template).render())
                links = [attrs for tag, attrs in parsed.actions if tag == 'a']
                buttons = [attrs for tag, attrs in parsed.actions if tag == 'button']
                self.assertEqual(len(parsed.actions), 12)
                self.assertEqual({attrs['href'] for attrs in links}, {
                    'mailto:ee1241048@iitd.ac.in', 'tel:+918690604513',
                    'tel:+918233281016', 'tel:+916376356392',
                    'https://github.com/shashankjangir',
                    'https://www.instagram.com/shxnkg_/',
                })
                self.assertEqual(len(buttons), 6)
                self.assertTrue(all('disabled' in attrs for attrs in buttons))
                self.assertTrue(all('not added yet' in attrs['aria-label'] for attrs in buttons))
                for attrs in links:
                    if attrs['href'].startswith('https:'):
                        self.assertEqual(attrs['target'], '_blank')
                        self.assertEqual(attrs['rel'], 'noopener noreferrer')
                visible = ' '.join(parsed.text)
                for value in ('ee1241048@', 'me124xxxx@', '8690604513',
                              '8233281016', '6376356392', 'shxnkg_',
                              'https://github.com/shashankjangir'):
                    self.assertNotIn(value, visible)


if __name__ == '__main__':
    unittest.main()
