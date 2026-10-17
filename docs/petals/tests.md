# 꽃잎 재료 시험과 한계

실제 기록 환경은 Windows, Chrome 155.0.8059.84 headless, Playwright, Canvas 2D다. 앱 실행은 file://로 검사했다. 자동 검증과 시각 판단을 구분하며, 미실행 플랫폼에 결과를 일반화하지 않는다.

## 보존된 단계별 실행

| 증거 | 결과 | 입증 범위 |
|---|---|---|
| `v5-checks.json` | 7/13, 6개 실패 | 브러시를 바꾸어도 꽃머리 동일한 기준 상태. 의도한 RED |
| `v6-checks.json` | 22/22 | 첫 꽃잎 적용과 결정성·조절 왕복. 시각 P5/P6는 미충족 |
| `v7-checks.json` | 62/62 | 40개 고립 꽃머리 재료 조절 효과/왕복 추가. 기본 미적 구별은 미충족 |
| `v8-checks.json` | 62/62 | 바탕/종이 노출 개선. 시각 P6 미충족 |
| `v9-checks.json`, `v9-scene-checks.json` | 62/62, 2/2 | 확대/기본과 실제 정원 15조합. 표면 재료성은 계속 미달 |
| `v10-checks.json`, `v10-scene-checks.json` | 62/62, 2/2 | 큰 인공 무늬 해소, 기본 드라이 빈틈은 보류 |
| `v11-checks.json`, `v11-scene-checks.json` | 62/62, 2/2 | 픽셀 폭 보정 후 실제 확대/기본/정원15조합 |

모든 경로는 [evidence/petals](../../evidence/petals/) 아래다. 같은 환경의 SHA 차이는 다른 픽셀이 생성됐다는 증거이며, 사람이 재료를 충분히 읽는다는 증거가 아니다.

## 최종 재실행

03:04 UTC의 개발 중 검사와 스트레스는 별도 브라우저가 동시에 돌아 성능 수치를 최종 비교에 사용하지 않았다. v11의 마지막 스트레스는 다른 QA 브라우저 종료 후 단독 실행했다.

| 실제 증거 | 최종 결과 |
|---|---|
| [재료 검사](../../evidence/petals/v11-checks.json) | 62/62. 고립된 꽃머리 5재료, 두 배율, 모든 재료×4제어 효과/왕복, 고정 결 안정 |
| [정원 검사](../../evidence/petals/v11-scene-checks.json) | 2/2. 전체15조합 실행/서로다른 출력, 예외0. 원배율 crop은 resize하지 않음 |
| [통합 회귀](../../evidence/petals/final-checks.json) | 26/26. seed/밀도/바람/성장/정지/resize/PNG 픽셀/32개상한/키보드·터치/모션감소/DPR2/모바일/외부요청0 |
| [접근성 동작](../../evidence/petals/v11-accessibility.json) | 키보드5→6개, pause/reduced RAF요청0, 정지픽셀동일, 13개 button/select/range 높이44px 이상 |
| [레퍼런스 보드](../../evidence/petals/reference-checks.json) | 13/13. 정규데이터 일치/오래된 생성물 거부/11이미지/3필터/권리정보/모바일 |
| [단위 검사](../../evidence/petals/unit.tap) | Node6/6 |
| [재료 경계](../../evidence/petals/material-bounds.json) | 실제 Canvas720개. r11/23/105, 3종×5재료×4제어양끝에서 예외/잘못된 알파0. 알파 guard 전후 비교30개 해시 동일 |
| [최대 밀도](../../evidence/petals/stress.json) | 32개·density12·15조합 오류0. cold201.8~1019.2ms. warm120 RAF 평균16.667ms/p9516.9ms |
| [설명 페이지](../../evidence/petals/pages-checks.json) | 21/21. 5개 HTML의1440/390px 이미지 로드·로컬 연결·넘침·예외 검사 |

최대 밀도에서 cold 재료 변경이 약1초까지 걸린다는 한계가 있다. warm 장면은 poppy/watercolor, 두께2.5/질감100/농도100/표현100이다. cold는 두 제어 change+draw/readback이고 warm은 콜백 간격이므로 서로 다른 측정값이다. 시각 판정의 충족/부분충족은 [비교 문서](comparison.md)에 있다.

## 시험의 한계

- 390×844의 모바일·터치는 에뮬레이션이며 실제 휴대전화, iOS Safari, Firefox는 실행하지 않았다.
- 44px 대상 높이·Tab/화살표/Enter/Space·모션 설정을 확인하지만 전체 스크린리더/전문 WCAG 감사를 대신하지 않는다.
- 최대 밀도는 32개 식물, density12의 15조합을 검사한다. cold 수치는 두 제어의 동기 change와 CPU 렌더링/픽셀 readback을 포함한다. 단일 draw 시간·사용자 입력 지연과 동일하지 않다.
- warm RAF 간격은 브라우저 콜백 사이 시간이다. GPU 처리시간이나 모든 기기의 60FPS를 보장하지 않는다.
- 11px 안팎의 아주 작은 꽃은 재료의 미세한 결이 축약된다. radius23의 기본 표본과 확대105를 따로 검토하며, 사진 동일성·젖은 종이의 물리 시뮬레이션은 주장하지 않는다.
- PNG는 현재 Canvas 픽셀과 일치하는지 디코딩하여 비교한다. 다른 브라우저·DPR에서 같은 PNG 해시를 약속하지 않는다.
- 정적 코드 리뷰는 결정성/숫자 정규화/clip/state/cache key/모듈 순서에서 차단 결함을 발견하지 못했다. 이것은 미적 적합 판정과 별개다.
