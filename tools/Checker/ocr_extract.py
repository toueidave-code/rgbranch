#!/usr/bin/env python3
# Server-side OCR + compact parser for Checker
# ponytail: single-pass regex map; no layout parser. Add layout parsing only if accuracy demands it.

import sys
import json
import re
from pdf2image import convert_from_path
import pytesseract


def ocr_pdf(path, page=1):
    """Render a single PDF page to image and OCR it."""
    imgs = convert_from_path(path, first_page=page, last_page=page, dpi=220)
    img = imgs[0]
    try:
        return pytesseract.image_to_string(img, lang='jpn+eng')
    except Exception:
        return pytesseract.image_to_string(img)


# compact parse: try a few robust regexes over the full text
_PATTERNS = {
    'project_no': [r'現場番号[:：\s]*([A-Za-z0-9\-\u3000\u4e00-\u9fff\w]+)',
                   r'東栄住宅\s*現場番号[:：\s]*([A-Za-z0-9\-\u3000\u4e00-\u9fff\w]+)'],
    'building_no': [r'号棟[:：\s]*([\dA-Za-z\-ー一二三四五六七八九十]+)',
                    r'号[:：\s]*([\dA-Za-z\-ー一二三四五六七八九十]+)'],
    'project_name': [r'現場名[:：\s]*([^\n\r]+)']
}


def _normalize(text: str) -> str:
    t = text.replace('\u3000', ' ').replace('\t', ' ')
    return re.sub(r'[ \f\v]+', ' ', t).strip()


def parse(text: str) -> dict:
    """Return a dict: branch, project_no, building_no, project_name, raw.

    Strategy: normalize text, search for label-driven patterns. Branch prefers a line containing 東栄住宅.
    """
    t = _normalize(text)
    res = {'branch': '', 'project_no': '', 'building_no': '', 'project_name': '', 'raw': t}

    # Branch: prefer line containing 東栄住宅
    m = re.search(r'(^.*東栄住宅.*$)', t, re.M)
    if m:
        res['branch'] = m.group(1).strip()
    else:
        # fallback: first non-empty line
        first_line = next((ln.strip() for ln in t.splitlines() if ln.strip()), '')
        res['branch'] = first_line if first_line else ''

    # other fields: try each pattern list in order
    for key, patterns in _PATTERNS.items():
        for pat in patterns:
            m = re.search(pat, t)
            if m:
                res[key] = m.group(1).strip()
                break

    return res


# small self-check that isn't run by default; run with --self-test to exercise parsing logic
def _self_test():
    sample = '''\n東栄住宅 東京支店\n現場番号: ABC-123\n号棟: 2号棟\n現場名: サンプルプロジェクト\n'''
    out = parse(sample)
    assert out['branch'].startswith('東栄住宅')
    assert out['project_no'] == 'ABC-123'
    assert '2' in out['building_no']
    assert 'サンプル' in out['project_name']
    print('self-test OK')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: ocr_extract.py <pdfpath>')
        print('  or: ocr_extract.py --self-test')
        sys.exit(1)

    if sys.argv[1] == '--self-test':
        _self_test()
        sys.exit(0)

    path = sys.argv[1]
    try:
        text = ocr_pdf(path, page=1)
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(2)
    out = parse(text)
    print(json.dumps(out, ensure_ascii=False, indent=2))
