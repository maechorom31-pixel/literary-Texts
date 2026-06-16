#!/usr/bin/env python3
"""참고문헌(최서희) PDF 추출 텍스트 → 작품별 해설 인덱스 통합 빌더.

입력: /tmp/ikim/<갈래>.txt  (각 PDF를 pymupdf 또는 read_file_content로 추출한 텍스트)
출력: data/_source/choi_index.json  (gitignore — 저작권상 공개 커밋 제외)

- 출처/브랜드(교재명·저자·워터마크) 라인은 제거(debrand)한다.
- ❏ 앵커로 작품 헤더(작가/작품/수능특강쪽)를 잡고, 블록을 작품명 기준 병합한다.
- 알려진 한계: 갈래복합처럼 (가)(나)가 한 줄에 묶인 헤더는 (가) 블록이 비고
  내용이 (나)로 몰릴 수 있어 후처리 보정이 필요하다.
"""
import re, json, os, sys

BRAND = re.compile(
    r'(최서희|한병훈|익힘책|수특익힘|E지컬|퀀텀|한판에담판|한 판에 담판|'
    r'국어 영역 최선의 선택|2027\s*최서희|hwp|\.hwp|©|ⓒ|♥|❉)')

def debrand(s):
    return '\n'.join(l for l in s.split('\n') if not BRAND.search(l)).strip()

def norm(s):
    return re.sub(r'\s+', '', s or '')

def parse(text, galae):
    out = []
    pos = [m.start() for m in re.finditer('❏', text)]
    for i, p in enumerate(pos):
        end = pos[i+1] if i+1 < len(pos) else min(len(text), p+2600)
        seg = text[p:end]
        win = text[p:p+120].replace('\n', ' ')
        tm = re.search(r'「\s*([^」]{1,30}?)\s*」', win)
        if not tm:
            continue
        title = norm(tm.group(1))
        pm = re.search(r'」\s*\\?_?\s*([\d]{2,3}(?:\s*[-~]\s*[\d]{2,3})?)', win)
        page = norm(pm.group(1)) if pm else None
        between = win[1:tm.start()]
        amid = re.search(r'(?:\(\s*[가-힣]\s*\))?\s*([가-힣]{2,10}|작자\s*미상)\s*[,，]?\s*$', between.strip())
        before = text[max(0, p-20):p].replace('\n', ' ')
        abef = re.search(r'([가-힣]{2,10}|작자\s*미상)\s*$', before.strip())
        author = norm(amid.group(1)) if amid else (norm(abef.group(1)) if abef else None)
        out.append(dict(title=title, author=author, page=page, galae=galae,
                        block=debrand(seg)[:1400]))
    return out

SOURCES = ["고전시가", "현대시", "고전산문", "현대소설", "극수필",
           "갈래복합", "실전", "교과서개념", "한판총정리"]

def main(srcdir="/tmp/ikim", outpath="data/_source/choi_index.json"):
    raw = []
    for g in SOURCES:
        f = os.path.join(srcdir, f"{g}.txt")
        if not os.path.exists(f):
            print(f"  (skip, 없음) {g}")
            continue
        es = parse(open(f, encoding="utf-8").read(), g)
        raw += es
        print(f"  [{g}] {len(es)}작품")
    merged = {}
    for e in raw:
        k = e['title']
        m = merged.setdefault(k, dict(title=k, author=e['author'], page=e['page'],
                                      galae=set(), sources={}))
        m['galae'].add(e['galae'])
        if e['author'] and not m['author']:
            m['author'] = e['author']
        if e['page'] and not m['page']:
            m['page'] = e['page']
        m['sources'][e['galae']] = e['block']
    for k in merged:
        merged[k]['galae'] = sorted(merged[k]['galae'])
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    json.dump(list(merged.values()), open(outpath, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"\n원시 {len(raw)} → 고유 작품 {len(merged)} · 저장: {outpath}")

if __name__ == "__main__":
    main(*sys.argv[1:])
