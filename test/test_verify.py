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

    def test_industry_is_grounded_in_this_company(self):
        target = dict(company='Barbour', industry='footwear', industryTerms=['shoes'])
        result = self.check('<p>Constance Brown, Buyer at Barbour.</p><p>Barbour designs leather shoes.</p>',
                            person='Constance Brown', role='Buyer', researchTarget=target)
        self.assertEqual(result['lead']['companyVerification']['evidence'], 'Barbour designs leather shoes')
        other = '<p>Constance Brown, Buyer at Barbour.</p><p>Acme designs footwear for the event.</p>'
        namesake = '<p>Constance Brown, Buyer at Barbour Engineering.</p><p>Barbour designs leather shoes.</p>'
        footer = '<p>Constance Brown, Buyer at Barbour.</p><footer>Barbour designs footwear.</footer>'
        for html in [other, namesake, footer]:
            self.assertEqual(self.check(html, person='Constance Brown', role='Buyer',
                                        researchTarget=target)['status'], 'unsupported')
        result = self.check('<p>Nicholas Drury, Head of Footwear at Barbour.</p>', researchTarget=target)
        self.assertEqual(result['status'], 'verified')

    def test_requested_domain_requires_a_contextual_link_or_first_party_source(self):
        target = dict(company='Barbour', domain='barbour.com', industry='footwear')
        html = '<p>Nicholas Drury, Head of Footwear at <a href="https://www.barbour.com/">Barbour</a>.</p>'
        result = self.check(html, researchTarget=target)
        self.assertEqual(result['lead']['companyVerification']['domain'], 'barbour.com')
        self.assertEqual(self.check(html.replace('barbour.com', 'barbour.com.example'), researchTarget=target)['status'],
                         'unsupported')
        self.assertEqual(self.check(html.replace('<a href="https://www.barbour.com/">Barbour</a>', 'Barbour') +
                                    '<footer><a href="https://www.barbour.com/">Barbour</a></footer>',
                                    researchTarget=target)['status'], 'unsupported')
        self.assertEqual(self.check('<p>Nicholas Drury, Head of Footwear at Barbour.</p>',
                                    researchTarget={'company':'Acme'})['status'], 'unsupported')

    def test_official_anchor_and_indexed_affiliation_need_no_personal_press_mention(self):
        target = {'company':'Barbour', 'industry':'footwear', 'industryTerms':['shoes']}
        page = '<p>Barbour designs leather shoes.</p>'
        hit = {'url':'https://uk.linkedin.com/in/jane-smith-123?trk=public',
               'title':'Jane Smith - Senior Footwear Buyer at Barbour | LinkedIn', 'snippet':''}
        row = dict(kind='profile', person='Jane Smith', role='Senior Footwear Buyer',
                   researchTarget=target, profileHit=hit, email='other@barbour.example')
        company = self.check(page, kind='company', researchTarget=target)
        self.assertEqual(company['lead']['companyVerification']['evidence'], 'Barbour designs leather shoes')
        result = self.check(page, **row)
        self.assertEqual(result['status'], 'verified')
        self.assertEqual(result['lead']['linkedinUrl'], 'https://www.linkedin.com/in/jane-smith-123')
        self.assertTrue(result['lead']['evidence'].startswith('Public LinkedIn index'))
        self.assertEqual(result['lead']['verificationSource'], 'profile_index')
        self.assertEqual(result['lead']['email'], '')
        self.assertEqual(result['lead']['sourceDate'], '')
        self.assertEqual(self.check('<p>Barbour develops software.</p>', **row)['status'], 'unsupported')

    def test_profile_index_does_not_verify_namesakes_old_jobs_or_unrelated_functions(self):
        target = {'company':'Barbour','industry':'footwear'}
        page = '<p>Barbour designs footwear.</p>'
        def check(title, snippet='', role='Footwear Buyer', url='https://www.linkedin.com/in/jane-smith'):
            return self.check(page, person='Jane Smith', role=role, kind='profile', researchTarget=target,
                              profileHit=dict(url=url,title=title,snippet=snippet))['status']
        self.assertEqual(check('Jane Smith - Footwear Buyer at Barbour | LinkedIn'), 'verified')
        for wrong in [
            ('Jane Smith - Former Footwear Buyer at Barbour | LinkedIn', ''),
            ('Jane Smith - Footwear Buyer at Barbour Engineering | LinkedIn', ''),
            ('Jane Smith - Acme | LinkedIn','Footwear Buyer at Barbour'),
            ('Jane Smith - Footwear Buyer at Acme | LinkedIn','Previously Footwear Buyer at Barbour'),
            ('Jane Smith - Barbour | LinkedIn','Footwear Buyer at Barbour Jan 2019 – Sep 2022'),
            ('Jill Smith - Footwear Buyer at Barbour | LinkedIn','')
        ]:
            self.assertEqual(check(*wrong), 'unsupported', wrong)
        self.assertEqual(check('Jane Smith - Finance Director at Barbour | LinkedIn', '', 'Finance Director'),
                         'unsupported')
        self.assertEqual(check('Jane Smith - Footwear Buyer at Barbour | LinkedIn',
                               url='https://linkedin.com.evil.example/in/jane'), 'unsupported')
        result = self.check(page, kind='company', researchTarget={'company':'Barbour'})
        self.assertEqual(result['status'], 'unsupported')

    def test_exact_domain_on_profile_supplies_the_employer_bridge(self):
        target = {'company':'Barbour','domain':'barbour.com'}
        page = '<p>The speaker was from <a href="https://barbour.com">Barbour</a>.</p>'
        hit = dict(url='https://uk.linkedin.com/in/jane-smith',title='Jane Smith - Buyer at Barbour | LinkedIn',
                   snippet='Buyer at Barbour (barbour.com)')
        result = self.check(page, kind='profile', person='Jane Smith', role='Buyer',
                            researchTarget=target, profileHit=hit)
        self.assertEqual(result['status'],'verified')
        hit['snippet'] = 'Buyer at Barbour (barbour.com.biz)'
        self.assertEqual(self.check(page, kind='profile',person='Jane Smith',role='Buyer',
                                    researchTarget=target,profileHit=hit)['status'],'unsupported')

    def test_generic_buyer_has_grounded_company_bridge(self):
        url = 'https://www.barbour.com/us/footwear-guide.html'
        legal_url = 'https://www.barbour.com/gb/legal/terms-of-use.html'
        def page(html):
            p = verifier.Page()
            p.feed(html)
            return p.finish()
        brand = page('<head><title>Barbour Footwear | Discover the Collection</title></head>'
                     '<footer><a href="/gb/legal/terms-of-use.html">Terms of use</a>'
                     '<a href="https://www.linkedin.com/company/barbour-brand/">Official LinkedIn</a></footer>')
        legal = page('<p>If you are based in Washington, please review the terms below.</p>'
                     '<p>We are Barbour, a trading name of J Barbour &amp; Sons Ltd. Our main office is at '
                     'Simonside Industrial Estate, South Shields, Tyne and Wear, NE34 9PD.</p>')
        def run(title, snippet, person='Jane Smith', role='Buyer'):
            hit = dict(url='https://uk.linkedin.com/in/jane-smith',title=title,snippet=snippet)
            row = dict(kind='profile',source=url,company='Barbour',person=person,role=role,
                       researchTarget={'company':'Barbour','industry':'footwear'},profileHit=hit)
            return verifier.verify(row,lambda link:(link,legal if link==legal_url else brand))
        examples = [('Jane Smith - Barbour | LinkedIn','Buyer Barbour, South Shields, England, United Kingdom','location'),
                    ('Jane Smith - Buyer at J Barbour & Sons Ltd | LinkedIn','','legal_name'),
                    ('Jane Smith - Barbour | LinkedIn','Buyer at Barbour (barbour.com)','domain'),
                    ('Jane Smith - Barbour | LinkedIn','Buyer at Barbour https://www.linkedin.com/company/barbour-brand/','company_url')]
        for title, snippet, kind in examples:
            with self.subTest(kind=kind):
                result=run(title,snippet)
                self.assertEqual(result['status'],'verified',result)
                proof=result['lead']['companyVerification']
                self.assertEqual(proof['matchType'],kind)
                self.assertEqual(proof['identitySource'],legal_url if kind in ('legal_name','location') else url)
        for title,snippet in [('Jane Smith - Barbour | LinkedIn','Buyer Barbour, England, United Kingdom'),
                              ('Jane Smith - Barbour | LinkedIn','Buyer at Barbour, Washington, England'),
                              ('Jane Smith - Barbour EHS | LinkedIn','Buyer at Barbour EHS, South Shields'),
                              ('Jane Smith - Barbour | LinkedIn','Buyer at barbour ehs, South Shields'),
                              ('Jane Smith - Barbour EHS | LinkedIn','Buyer at Barbour, South Shields'),
                              ('Jane Smith - Barbour | LinkedIn','Buyer at Barbour https://www.linkedin.com/company/barbour-brand-ehs/'),
                              ('Jane Smith - HR Director at Barbour | LinkedIn','Buyer at Barbour, South Shields'),
                              ('Jane Smith - Buyer at Acme | LinkedIn','Buyer at Barbour, South Shields')]:
            self.assertEqual(run(title,snippet)['status'],'unsupported')

    def test_repeated_employer_anchor_fetch_is_shared(self):
        with patch.object(verifier, 'fetch', return_value=(URL, 'one page')) as request:
            shared = verifier.coalesced_fetch()
            with verifier.concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                results = list(pool.map(shared, [URL] * 40))
            self.assertEqual(results, [(URL, 'one page')] * 40)
            request.assert_called_once_with(URL)

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
