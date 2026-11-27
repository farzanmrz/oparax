import importlib.util
import pathlib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('verify', pathlib.Path(__file__).parents[1] / 'lib/verify.py')
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)
URL = 'https://press.example/footwear'
CANDIDATE = dict(source=URL, company='Barbour', person='Nicholas Drury', role='Head of Footwear',
                 quote='A paraphrase that never appeared in the source.', email='editor@press.example')


class EvidenceTests(unittest.TestCase):
    def check(self, html, **changes):
        page = verifier.Page()
        page.feed(html)
        with patch.object(verifier, 'fetch', return_value=(URL, page.finish())):
            return verifier.verify({**CANDIDATE, **changes})

    def test_named_contact_from_press_without_exact_model_quote(self):
        result = self.check('<head><meta property="article:published_time" content="2025-11-11T12:00:00Z"></head>'
                            '<p>Said <strong>Nicholas Drury</strong>, Head of Footwear at Barbour. '
                            'Media contact editor@press.example</p>')
        self.assertEqual(result['status'], 'verified')
        self.assertEqual(result['lead']['evidence'], 'Nicholas Drury, Head of Footwear at Barbour')
        self.assertEqual(result['lead']['sourceDate'], '2025-11-11')
        self.assertEqual(result['lead']['email'], '')

    def test_misattribution_paragraphs_and_former_contact(self):
        cases = [
            '<p>Nicholas Drury spoke with Jane Smith, Head of Footwear at Barbour.</p>',
            '<p>Jane Smith, Head of Footwear at Barbour, and Nicholas Drury.</p>',
            '<p>Nicholas Drury.</p><p>Head of Footwear at Barbour.</p>',
            '<p>Nicholas Drury, formerly Head of Footwear at Barbour, founded another company.</p>',
            '<script>Nicholas Drury, Head of Footwear at Barbour</script><p>Other news</p>',
            '<p>Barbour joined Nicholas Drury. Head of Footwear at Columbia.</p>'
        ]
        for case in cases:
            with self.subTest(case=case):
                self.assertEqual(self.check(case)['status'], 'unsupported')

    def test_company_first_attribution_and_unicode(self):
        result = self.check('<p>Barbour’s head of footwear, Nicolás Drury, announced the collection.</p>',
                            person='Nicolas Drury')
        self.assertEqual(result['lead']['evidence'], 'Barbour’s head of footwear, Nicolás Drury')

    def test_explicit_email_and_unrelated_email(self):
        line = '<p>Nicholas Drury, Head of Footwear at Barbour (nick.drury@barbour.example)</p>'
        result = self.check(line, email='nick.drury@barbour.example')
        self.assertEqual(result['lead']['email'], 'nick.drury@barbour.example')
        result = self.check(line.replace(' (', '. Editor '), email='nick.drury@barbour.example')
        self.assertEqual(result['lead']['email'], '')

    def test_company_requires_company_and_exact_evidence(self):
        line = '<p>Barbour purchases leather for its footwear collections.</p>'
        row = dict(person='', role='', quote='purchases leather for its footwear collections')
        self.assertEqual(self.check(line, **row)['status'], 'verified')
        self.assertEqual(self.check(line, **row, company='Others')['status'], 'unsupported')

    def test_inaccessible_source_is_reported_separately(self):
        with patch.object(verifier, 'fetch', side_effect=OSError):
            self.assertEqual(verifier.verify(CANDIDATE), {'status':'unavailable'})

    def test_unsupported_host_cannot_fetch(self):
        with patch('socket.getaddrinfo', side_effect=AssertionError('No DNS expected')):
            for url in ['https://www.linkedin.com/in/example', 'https://example.internal/page',
                        'http://example.org', 'https://example.org:444/path']:
                with self.subTest(url=url), self.assertRaises(ValueError):
                    verifier.fetch(url)
        with patch('socket.getaddrinfo', return_value=[(None, None, None, None, ('127.0.0.1', 443))]):
            with self.assertRaises(ValueError):
                verifier.fetch('https://example.org')


if __name__ == '__main__':
    unittest.main()
