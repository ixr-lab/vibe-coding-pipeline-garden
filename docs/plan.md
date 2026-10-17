# 인터랙티브 생성형 정원 구현 계획

작성: 2026-10-17 UTC. writing-plans 스킬을 적용해 실행 항목을 정리했다. 사용자 지시가 제작·반복·업로드까지 명시하므로 추가 승인으로 중단하지 않는다. 이는 AI 구현 계획이며 사용자와의 별도 합의로 표시하지 않는다.

**Goal:** 설치 없는 Canvas 정원과 실제 v0→v1→v2 개선 증거를 전달한다.
**Architecture:** engine.js는 결정론적 식물 데이터, garden.js는 렌더·입력·상태, HTML/CSS는 반응형 UI. Node 내장 시험과 Python Playwright로 검증.
**Spec:** requirements.md

## 파일 책임
- index.html / styles.css: 작품과 제어 UI
- engine.js: seed 난수·가지 생성·식물 수/좌표 상한
- garden.js: 렌더링·성장·입력·정지·내보내기
- tests/engine.test.cjs: 결정론·경계값
- scripts/verify.py: 실제 브라우저 캡처·통합 시험
- process.html: 8단계와 실제 전후 이미지를 탐색하는 설명 페이지
- docs/: 레퍼런스, 기준, 시점별 로그, 실험, 시험, 재현 지침
- evidence/: 원본 PNG와 실행 JSON/텍스트

## 실행 순서
1. 기준/레퍼런스 고정, 난수·형상 재현 시험 먼저 작성하고 실패 확인.
2. v0 최소 기능 구현 → Node 시험/Chromium 고정 캡처 → 실제 부족점 기록 → Git 커밋/태그.
3. 실제 관찰에서 v1 가설 작성 → 수정 → 동일 조건 캡처·회귀 시험 → 채택 판단 → 커밋/태그.
4. v1 관찰에서 v2 가설 작성 → 모바일/접근/효율 개선 → 동일 조건과 모바일 캡처 → 회귀 시험 → 커밋/태그.
5. 독립 리뷰, 필요한 수정, 최종 시험. 한국어 설명 페이지와 README, ZIP 작성.
6. 새 private GitHub 저장소(이름 충돌 시 새 이름), push 후 원격 SHA/주요 파일 재조회. ZIP/이미지 Library 전달.

## 반드시 검토할 입력/실패 조건
빈/긴 seed, 가장자리 심기, 최대 식물 수, resize 후 정지 상태 유지, 시스템 동작 줄이기 변경, 조작 중 form 입력과 단축키 충돌, PNG가 현재 작품과 일치하는지.

## 공유 인터페이스
engine.js → GardenEngine: random(seed), createPlant(seed,index,x,y,density), clamp(value,min,max), MAX_PLANTS. garden.js가 소비. CommonJS export와 browser global을 함께 제공해 file:// 실행과 Node 시험을 지원.
