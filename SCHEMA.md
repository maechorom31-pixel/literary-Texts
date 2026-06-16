# 데이터 스키마 (문학 v1)

수능특강 **문학** 자율학습 앱의 데이터 명세입니다. 로직/디자인(JS·CSS)은 독서 앱(`Non-literary-Texts`)을 그대로 재사용하고, **데이터(`data/`)와 도식(`diagrams/`)만** 갈아끼웁니다. 독서 스키마에서 문학에 맞게 바뀐 점은 §0에 모았습니다.

## 0. 독서 → 문학 변경 요약

| 항목 | 독서 | 문학 |
|---|---|---|
| `categories` | 독서 4영역(방법·인문·사회·과학) | **갈래 6분류**: `hyeondaesi`·`gojeonsiga`·`hyeondaeso`·`gojeonsanmun`·`geuksupil`·`bokhap` |
| `passage.paragraphs[].text` | 지문 원문 정독 | **작품 해설(분석)**. 저작권상 원문은 싣지 않고 짧은 인용 구절만 '따옴표'로 표시 |
| Step 3 문항 | `examPoints[]` 5지선다 객관식 | **`judgments[]` O/X 선지 판단**(새 문항 X). 옳은/틀린 선지를 스스로 판단 후 근거 확인 |
| `concepts[]` | k/v | k/v + **`tier`(1·2·3)**, **`src`**(출처 배지: 수능특강 원해설 / 보충 해석 / 더 알아두기) |
| 진도 키 | `suneung_dokseo_*` | `suneung_munhak_*` |

> **저작권** · 본 자료는 학습 보조용 해설입니다. EBS 교재 원문은 복제하지 않으며, 분석에 필요한 최소한의 구절만 인용합니다. 원문은 수능특강 해당 쪽을 펴고 함께 학습합니다.

## 1. id 명명 규칙

`숫자세자리-슬러그`. 숫자 prefix가 출현 순서를 결정합니다. 같은 id로 `data/passages/{id}.json`과 `diagrams/{id}.svg`가 짝을 이룹니다. 예: `001-gyeonyeoga-sangron`.

## 2. data/index.json (매니페스트)

허브 카드용 최소 메타만 담습니다. 본문·도식은 포함하지 않습니다.

```json
{
  "version": 1,
  "updatedAt": "2026-06-16",
  "categories": {
    "hyeondaesi":   { "label": "현대시",   "color": "#5e548e", "order": 1 },
    "gojeonsiga":   { "label": "고전 시가", "color": "#2a6f6f", "order": 2 },
    "hyeondaeso":   { "label": "현대 소설", "color": "#1f5582", "order": 3 },
    "gojeonsanmun": { "label": "고전 산문", "color": "#8b6f47", "order": 4 },
    "geuksupil":    { "label": "극·수필",   "color": "#a83a4a", "order": 5 },
    "bokhap":       { "label": "갈래 복합", "color": "#50643c", "order": 6 }
  },
  "passages": [
    { "id": "001-gyeonyeoga-sangron", "order": 1, "category": "bokhap",
      "title": "계녀가 · 상론", "subtitle": "…", "structure": "compare",
      "tags": ["갈래복합","가사","한문 산문"], "estMinutes": 18 }
  ]
}
```

## 3. data/passages/{id}.json (작품 상세)

블록 구성: `source` · `predict` · `passage` · `diagram` · `concepts[]` · `judgments[]` · `selfEval`.

### source (필수)
`book` / `section`(갈래) / `page`. 학습 헤더에 "EBS 2027 수능특강 · 갈래 복합 · 253쪽"처럼 노출.

### predict (필수)
`question`(큰 글씨) / `hint`(선택) / `tip`(선택). 작품명·갈래만 보고 가설 세우기.

### passage (필수)
`structure`(아래 enum) + `paragraphs[]`. 각 단락은 작품 **해설**이며:
- `id`(필수), `role`(부분 라벨, 예 "(가) 본사1 — 며느리의 도리")
- `text`(필수, 해설 본문 — 원문이 아님. 짧은 인용은 '따옴표')
- `summaryPrompt`/`summaryAnswer`(능동 회상용 한 줄 요약 문답)
- `vocab[]`(시어·어휘 풀이), `revealsDiagram[]`(연결 SVG 그룹 id)

시는 **연/행** 단위, 소설·극은 **장면/사건** 단위로 단락을 나눕니다.

### diagram (필수)
`file` / `structure` / `caption` / `reveal.steps[]`(그룹 id+라벨) / `altText`(=SVG `<desc>`).

### concepts[] (필수, 3~8개) — 회상 카드 + 1·2·3차 블렌딩
```json
{ "k": "키워드", "v": "설명", "tier": 1, "src": "수능특강 <보기>" }
```
- `tier 1` = EBS 문제·해설·<보기>에서 실제로 다룬 개념 (배지 파랑)
- `tier 2` = 보충 해석 — 내가 더한 분석 (배지 빨강)
- `tier 3` = 더 알아두기 — 줄거리·작가·시대 배경 등 (배지 회색)
- `src` 문자열이 카드에 배지로 표시되어 출처가 한눈에 보입니다.

### judgments[] (필수) — O/X 선지 판단
새 문항을 만들지 않고, **이 작품 대상 선지의 정오를 스스로 판단**하게 합니다.
```json
{ "id": "j1", "target": "(가)(나) 비교", "correct": true,
  "statement": "이 작품에 대한 한 진술(=선지)",
  "why": "「수능특강」 원해설 근거 + [보충] 내 해석" }
```
- `correct`: 이 선지가 작품에 대해 옳으면 `true`, 틀리면 `false`
- `statement`: 옳은 선지·틀린 선지를 섞어 제시
- `why`: 근거. `「수능특강」`(원해설)과 `[보충]`(내 해석)을 함께 적어 블렌딩
- `target`: 어떤 관점/문항에서 나온 선지인지 라벨(선택)

### selfEval (선택)
`intervals { mastered, studying, review }` 자기평가별 복습 간격(일).

## 4. enum

- `category`: `hyeondaesi | gojeonsiga | hyeondaeso | gojeonsanmun | geuksupil | bokhap`
- `passage.structure`(도식 메타포): 잠정적으로 독서의 `compare`를 재사용 중. 문학 분석축
  (`시상전개`·`화자대상`·`정서변화`·`대비`·`인물관계`·`사건전개`·`갈등`·`서술시점` 등)으로
  확장 예정 — 확정 시 본 절을 갱신하고 `schemaVersion`을 올립니다.

## 4-1. 갈래 복합 처리 — 쪼개서 넣기

갈래 복합 세트는 사용자 합의에 따라 **(가)/(나)/(다)를 각자의 갈래 유닛으로 분리**한다(예: 계녀가→`gojeonsiga`, 상론→`gojeonsanmun`). 세트 연계는 `linkedSet`으로 표시한다(선택).

```json
"linkedSet": { "label": "갈래 복합", "withId": "002-sangron", "note": "…" }
```

(가)↔(나) **비교 O/X**는 별도 작업으로, 양쪽 유닛에 `[갈래복합 연계]` 태그로 공유 예정.

## 4-2. 참고문헌 해설 블렌딩 — 출처 표기 삭제

EBS 외 참고문헌(타사 교재)의 해설을 블렌딩할 때는 **브랜드/저자 출처를 표기하지 않는다**(요청 사항). `concepts[].src` 배지는 EBS는 `수능특강`, 그 외는 `보충`/`더 알아두기` 같은 일반 라벨만 쓴다. 참고문헌 원문 텍스트·인덱스는 `data/_source/`(gitignore)에만 두고 공개 커밋하지 않는다.

## 5. 변경 이력
- 문학 v1 (2026-06-16) — 독서 앱 구조 복제. 갈래 6분류, 해설 정독(원문 비복제), O/X 선지 판단(`judgments`),
  개념 1·2·3차 블렌딩(`tier`/`src`) 도입.
- 문학 v1.1 (2026-06-16) — 갈래 복합 세트를 갈래별 유닛으로 분리(`linkedSet`). 참고문헌 해설 블렌딩(출처 표기 삭제).
  샘플: `001-gyeonyeoga`(고전 시가) · `002-sangron`(고전 산문).
