# 데이터 스키마 (문학 v2)

수능특강 **문학** 자율학습 앱의 데이터 명세. 작업 절차·품질 규칙·과거 실수 예방책은 [`CLAUDE.md`](CLAUDE.md)를 먼저 읽을 것. 커밋 전 `python3 scripts/validate.py` 필수.

## 1. `data/index.json`

```jsonc
{
  "version": "...", "updatedAt": "YYYY-MM-DD",
  "categories": {            // 5갈래 고정 (bokhap 없음 — 갈래복합 세트는 갈래별로 분할 수록)
    "hyeondaesi":   { "label": "현대시",   "color": "#5e548e", "order": 1 },
    "gojeonsiga":   { "label": "고전 시가", "color": "#2a6f6f", "order": 2 },
    "hyeondaeso":   { "label": "현대 소설", "color": "#1f5582", "order": 3 },
    "gojeonsanmun": { "label": "고전 산문", "color": "#8b6f47", "order": 4 },
    "geuksupil":    { "label": "극·수필",  "color": "#a83a4a", "order": 5 }
  },
  "passages": [ { "id", "order"(유일), "category", "title",
                  "subtitle": "작가 · 한줄 소개", "tags": ["시험범위", ...], "estMinutes" } ]
}
```

- `tags`의 `"시험범위"` = 기말고사 범위. 홈 '기말고사 범위' 필터·우측 패널 '기말고사' 칩에 반영.
- 출처성 태그(`기출 YYYY…`)는 **실제 기출 gichul 블록이 있는 작품에만** 허용.

## 2. `data/passages/{id}.json`

```jsonc
{
  "id": "NNN-slug", "schemaVersion": 2,
  "category": "...",                    // index categories 키
  "title": "...", "author": "...",     // 미상은 "작자 미상"
  "subtitle": "한 줄 성격 규정",
  "source": { "book": "EBS 2027 수능특강 문학", "section": "...", "page": N }, // 쪽 미상이면 0
  "examScope": true|false,             // 시험범위(기말고사) 여부
  "oneLine": "작품 전체를 요약하는 한 문장(짧은 '구절' 인용 가능)",

  "crux": [                            // 🎯 정확히 3축 — 작품 이해를 가르는 '급소'
    { "axis": "짧은 축 이름", "point": "왜 급소인지 한두 문장" }
  ],

  "focusPoints": [                     // Ⅰ. 작품 안내·이해 카드(탭하여 body 공개)
    { "chip": "주제|상징|표현|인물|구성|줄거리|작가 연계|기출 이력|…",
      "head": "카드 제목", "body": "설명" }
  ],

  "gichul": [                          // 🔎 기출의 시선 — 우선순위: 실제 기출 > 작가 연계 > EBS 시선
    { "exam": "2022학년도 6월 모의평가"
             |"작가 연계 · ○○○ 「작품」 (시험명)"
             |"EBS 수능특강의 시선",
      "bogi": "〈보기〉 전문 + ' — 출처 한 줄.'",
      "items": [ { "statement", "correct", "why", "trap"(X일 때 필수) } ] }
  ],

  "judgments": [                       // Ⅱ. 선지 판단 O/X — crux에서 출제
    { "statement": "수능식 선지", "correct": true|false,
      "why": "근거(크럭스 출제면 '[크럭스: 축명]' 접두)", "trap": "함정 유형(X만)" }
  ],

  "selfEval": { "intervals": { "mastered": 7, "studying": 2, "review": 0 } }
}
```

### 필수 규칙
- **crux 3축**: 서로 변별될 것(주제 재진술 금지). 시점·초점화·상징·구조·전고·표현 급소 중심.
- **구조 표지**: 시·가사 = `구성` 칩(연/장 전개), 소설·산문·극 = `줄거리` 칩. 변형 칩(`구조`, `갈래·구성`, `구조·태도`)도 인정.
- **X 선지**: `trap`(유형)+`why`(근거) 필수. 실제 구절·요소에 걸린 '매력적 오답'일 것.
- **금지 일반론**: 계절순환·자연예찬·은둔·사회고발·색채대비 — 옳은 선지 근거로 금지, 비매력 오답으로도 지양.
- **O/X 항목 순서 불변**: 학습 기록이 qid(`jb-N`, `gi{G}-N`)로 저장된다. **기존 항목 순서 변경·중간 삽입 금지, 추가는 끝에만.**

## 3. `data/changelog.json`

```jsonc
{ "entries": [ { "date": "YYYY-MM-DD", "title": "요약", "items": ["..."] } ] } // 최신이 맨 앞
```
데이터·기능 수정 시마다 항목을 맨 앞에 추가. 앱 상단 '📝 업데이트 내역'에서 열람.

## 4. localStorage (변경 금지)

`suneung_munhak_progress_v1` — 작품별 `{ lastStep, eval, evalAt, history, examScore{qid}, userStatus, bookmarks{qid} }` / 테마 `suneung_munhak_theme`.
