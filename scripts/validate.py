#!/usr/bin/env python3
"""전체 데이터 무결성 검증. 사용: python3 scripts/validate.py
빌드·수정 후 커밋 전에 반드시 실행한다. 이슈 0이어야 통과."""
import json, glob, re, sys
from collections import Counter

STRUCT_CHIPS = ("구성", "줄거리", "구조", "갈래·구성", "구조·태도")
BANNED_IN_TRUE = ["계절순환", "계절의 순환", "자연예찬", "자연 예찬", "색채대비", "색채 대비"]

def main():
    files = sorted(glob.glob("data/passages/*.json"))
    idx = json.load(open("data/index.json"))
    idx_ids = {p["id"] for p in idx["passages"]}
    cats = set(idx["categories"].keys())
    orders = [p["order"] for p in idx["passages"]]
    issues, ox_total, trapc = [], 0, Counter()
    seen_ids = set()

    for f in files:
        d = json.load(open(f)); pid = d["id"]; seen_ids.add(pid)
        e = lambda m: issues.append(f"{pid}: {m}")
        if d.get("schemaVersion") != 2: e("schemaVersion != 2")
        if d["category"] not in cats: e(f"미정의 category {d['category']}")
        if pid not in idx_ids: e("index.json에 없음")
        for k in ("title", "author", "oneLine", "focusPoints", "gichul", "judgments"):
            if not d.get(k): e(f"빈 필드: {k}")
        if len(d.get("crux", [])) < 3: e(f"crux 3축 미만({len(d.get('crux', []))})")
        for c in d.get("crux", []):
            if not c.get("axis") or not c.get("point"): e("crux 항목 불완전")
        if not any(fp.get("chip") in STRUCT_CHIPS for fp in d["focusPoints"]):
            e("구성/줄거리(구조) 칩 없음")
        for g in d["gichul"]:
            if not g.get("bogi"): e(f"bogi 없음({g.get('exam','')[:24]})")
            if not g.get("items"): e("gichul items 비어 있음")
            if "일부 변형" in g.get("exam", ""): e("가짜 기출('일부 변형') 잔존")
        allox = [it for g in d["gichul"] for it in g["items"]] + d["judgments"]
        o = sum(1 for x in allox if x.get("correct"))
        if o == 0 or o == len(allox): e(f"O/X 편중 (O{o}/X{len(allox)-o})")
        for it in allox:
            ox_total += 1
            if "statement" not in it or "correct" not in it: e("O/X 필드 누락")
            if not it.get("why"): e("why 없음")
            if it.get("correct") is False:
                if not it.get("trap"): e("X인데 trap 없음")
                trapc[it.get("trap")] += 1
            if it.get("correct") is True:
                for b in BANNED_IN_TRUE:
                    if b in it.get("statement", ""): e(f"옳은 선지에 금지 일반론 '{b}'")

    if len(orders) != len(set(orders)): issues.append("index: order 중복")
    for m in idx_ids - seen_ids: issues.append(f"index에만 있는 id: {m}")
    try:
        json.load(open("data/changelog.json"))
    except Exception as ex:
        issues.append(f"changelog.json 오류: {ex}")

    print(f"작품 {len(files)} | O/X {ox_total} | 이슈 {len(issues)}")
    for i in issues: print("  -", i)
    print("함정 분포:", dict(trapc.most_common(10)))
    print("✅ 통과" if not issues else "⚠ 실패 — 커밋 전 수정 필요")
    sys.exit(0 if not issues else 1)

if __name__ == "__main__":
    main()
