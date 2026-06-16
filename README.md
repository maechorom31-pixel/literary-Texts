# 수능특강 문학 도식 자율학습

EBS 2027 수능특강 국어영역 **문학** 작품을, **능동 회상 + 분산 반복(SRS)** 원칙으로 스스로 공부하는 정적 웹앱입니다. 독서 앱([Non-literary-Texts](https://github.com/maechorom31-pixel/Non-literary-Texts))의 로직·디자인을 그대로 재사용하고, 데이터와 도식만 문학으로 갈아끼웠습니다.

## 학습 4단계
1. **사전 예측** — 작품명·갈래만 보고 "무엇을 말할까" 가설 세우기
2. **해설 정독 + 구조도** — 좌측 부분별 해설, 우측 개념구조도(SVG)를 함께 보며 한 줄 요약 회상
3. **핵심 개념 회상 + O/X 선지 판단** — 키워드 카드로 능동 회상 → 이 작품 대상 선지를 옳다/틀리다 판단하고 근거 확인
4. **자기평가** — 이해도에 따라 다음 복습 시점(7일/2일/즉시) 자동 결정

## 특징 (문학판에서 더한 것)
- **갈래 6분류**: 현대시 · 고전 시가 · 현대 소설 · 고전 산문 · 극·수필 · 갈래 복합
- **O/X 선지 판단**: 새 문항을 풀게 하지 않고, 옳은·틀린 선지를 스스로 판별하게 함
- **해설 1·2·3차 블렌딩**: 각 개념에 출처 배지 — `수능특강 원해설` / `보충 해석` / `더 알아두기`
- **저작권 배려**: 원문은 싣지 않고 해설 중심. 분석에 필요한 짧은 인용만 사용

## 로컬에서 보기
`file://`로 직접 열면 데이터 로드가 막힙니다. 저장소 폴더에서:
```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000/
```
또는 macOS는 `serve.command` 더블클릭.

## 새 작품 추가법 (JS는 건드리지 않음)
1. `data/passages/{id}.json` 작성 (스키마는 [`SCHEMA.md`](SCHEMA.md))
2. `diagrams/{id}.svg` 도식 제작 (규칙은 SCHEMA·기존 도식 참고)
3. `data/index.json`의 `passages[]`에 카드 메타 한 줄 추가

## 폴더 구조
```
index.html              앱 셸
assets/css/style.css    디자인 시스템(종이-잉크 + 다크모드)
assets/js/app.js        라우팅·렌더링
assets/js/store.js      진도 저장 + SRS (localStorage)
assets/js/diagram.js    SVG 주입
data/index.json         작품 매니페스트
data/passages/{id}.json 작품 상세 ×N
diagrams/{id}.svg       개념구조도 ×N
data/_source/           원본 파싱 자료(앱에서 미사용)
scripts/parse_ebs.py    수능특강 PDF→문항 파서
```

## 데이터 출처
EBS 2027학년도 수능특강 국어영역 문학. 본 저장소는 학습 보조용 해설·도식이며 교재 원문을 복제하지 않습니다.
