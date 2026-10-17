# 꽃과 브러시 확장 — 실행 전 기준

2026-10-17 UTC. 사용자 요청: 이전 v0~v2 보존, 식물 형태에 근거한 꽃3종·서로 구분되는 브러시5종·독립 선택·유의미한 조절·레퍼런스 별도 페이지·실제 시각 개선2회·private 원격 업로드. 별도 미적 승인은 여전히 확인 대기다.

## 범위와 선택
코스모스(Cosmos bipinnatus), 데이지(Leucanthemum vulgare), 개양귀비(Papaver rhoeas). 균일 펜, 압력 잉크, 연필, 드라이 브러시, 수채. Canvas로 식물 특징을 묘사하는 삽화이며 실제 종의 생장 시뮬레이션·사진급 물리 재현은 목표로 하지 않는다. 기존 재귀 가지는 양식화된 틀로 남긴다.

## 고정 기준
- 꽃: 코스모스의 넓은 ray 약8장/끝 갈래, 데이지의 좁고 긴 다수 ray/황색 원반, 양귀비의 넓은 겹침4장/기부·중심 대비. 실제 사진 관찰 후 세부 기준을 source JSON에 보충한다.
- 모든 꽃: 길이 차이·곡률·겹침, 꽃술/원반, 꽃받침·줄기 연결, 국소 명암을 closeup에서 확인한다. 자동 시험은 형태 유사성 판정을 대신하지 않는다.
- 브러시: 동일 quadratic 경로/색/폭에서 균일 외곽, 폭 변화, 연필 결, 마른 간극, 수채 농도·겹침이 구분되어야 한다.
- 독립선택3×5, 두께·질감·농도 조절, 반복 왕복 결정론, 기존기능 회귀, 밀도12/32식물 실행을 시험한다.
- 외부 의존성 없는 file:// 유지. 질감/꽃 sprite cache에 상한을 둔다. 실기기와 타 브라우저는 검증 범위를 분리한다.

## 비교 프로토콜
전체 정원 seed271828/density7/wind35/frame360/1440×1000/DPR1. 추가 flower=cosmos/brush=ink/width=1/texture=60/opacity=85. UI 추가로 Canvas 높이가 달라질 수 있어 fullpage 구성과 형태만의 효과는 분리해 설명한다. 별도 study.html의 고정크기 꽃3종 closeup/동일경로5brush/3×5조합 contact는 버전마다 같은크기로 캡처한다.

## 파일과 실행 순서
flower-art.js 꽃형태, brush-art.js 스트로크, garden.js 통합/캐시, study.html+study.js 자체 제작 분석·출력 도판. reference-source/*.json이 출처·관찰·구현·미달사항의 원본이고 scripts/build_references.py가 reference-data.js/docs/references.md를 생성·검증한다. reference.html이 같은 데이터를 탐색한다.

v3 최초 확장 실행 → 실제 도판/레퍼런스 비교 후 가설 기록 → v4 실제 수정 → 재관찰 후 v5 실제 수정. 버전태그/실행PNG/시험JSON과 의도→가설→수정→관찰→채택·미달을 작업 중 기록한다. 실패를 만들거나 사용자의 승인을 지어내지 않는다.
