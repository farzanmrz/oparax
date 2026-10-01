#!/usr/bin/env python3
"""Check the latest independent integration PASS against the exact shipping commit."""
import argparse
import json
import re
import sys


def proves(comments, commit):
    markers = [comment.get('body', '') for comment in comments if re.search(r'^## QC done\b', comment.get('body', ''), re.M)]
    if not markers:
        return False
    latest = markers[-1]
    return bool(re.search(r'^## QC done: integration\s*$', latest, re.M)
                and re.search(r'^Result:\s*PASS\s*$', latest, re.M)
                and re.search(r'^Reviewed-Commit:\s*' + re.escape(commit) + r'\s*$', latest, re.M))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', required=True)
    args = parser.parse_args()
    data = json.load(sys.stdin)
    if not proves(data.get('comments', []), args.commit):
        print('ship: latest integration QC PASS does not prove this exact commit; run /qc again.', file=sys.stderr)
        raise SystemExit(1)
