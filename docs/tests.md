# 시험 기록과 해석 범위

기준일: 2026-10-17 UTC. 이 문서는 실행 증거를 요약합니다. 재실행은 원본을 갱신하므로 **최신 JSON의 시각·항목·수치가 우선**합니다. 계획한 항목을 실행한 것으로 세지 않습니다.

## 엔진 시험: 4개

[engine-v2.txt](../evidence/engine-v2.txt)와 최종 재검사 [engine-final.txt](../evidence/engine-final.txt)에 Node 내장 시험 **4/4 통과, 실패 0**이 기록되어 있습니다.

| 실제 시험 이름 | 확인 범위 |
| --- | --- |
| same seed repeats 20 random samples | 같은 seed의 20개 난수 일치, 다른 seed의 차이, 값 범위 |
| edge planting keeps the full canopy above ground and inside top margin | 정해진 화면 크기·20개 seed에서 가장자리 식물의 위·지면 경계 |
| plant geometry is deterministic, finite, bounded at high density | 형상 재현, 유한 좌표, 입력 제한, 가지 수 범위, 최대 32개 상수 |
| isotropic layout preserves branch proportions and keeps canopy inside view | 같은 축 배율과 지정 화면에서의 가로 경계 |

이는 시험에 사용한 입력의 결과이며 모든 가능한 seed·화면의 수학적 증명은 아닙니다.

## 브라우저 통합 검사: 26개

[final-checks.json](../evidence/final-checks.json)의 2026-10-17 02:04:53 UTC 기록은 Windows, Chrome 155.0.8059.84를 Playwright Chromium API로 실행한 결과입니다. 아래 **26/26 통과**, 기록된 JavaScript 예외는 0개입니다.

| 번호 | JSON에 기록된 통과 항목 |
| --- | --- |
| 1 | 같은 seed·설정·시간의 Canvas 픽셀 재현 |
| 2 | 다른 seed에서 이미지 변화 |
| 3 | 밀도 변경 시 이미지 변화 |
| 4 | 밀도 값을 원래대로 돌리면 원래 이미지 복원 |
| 5 | 고정 시간에서 바람 값에 따른 자세 변화 |
| 6 | 일반 모드에서 실제 성장 |
| 7 | 일시정지 중 Canvas 픽셀 고정 |
| 8 | 크기 변경 뒤에도 일시정지 유지·픽셀 정지 |
| 9 | 재개 뒤 픽셀 변화 |
| 10 | 시스템 동작 줄이기 체크 상태·정적 화면 |
| 11 | 시스템 동작 선호 변경의 체크박스 반영 |
| 12 | 수동 동작 줄이기의 정적 모드 선택 |
| 13 | 식물 수 32개 상한 |
| 14 | 상한 도달 시 복구 방법 안내 |
| 15 | 빈 seed의 기본값 정규화 |
| 16 | 긴 seed의 80자 제한 |
| 17 | 입력칸에서 Space를 입력해도 심기 없음 |
| 18 | 정원에서 키보드 Space로 씨앗 1개 심기 |
| 19 | 내보낸 PNG와 현재 Canvas의 크기·픽셀 일치 |
| 20 | 모바일 터치로 씨앗 1개 심기 |
| 21 | 모바일 Canvas 버퍼의 DPR 배율 상한 2 |
| 22 | 390px 화면에서 가로 넘침 없음 |
| 23 | 비교 페이지 로드와 8단계 존재 |
| 24 | 비교 페이지의 모바일 가로 넘침 없음 |
| 25 | 시험 중 JavaScript 페이지 예외 없음 |
| 26 | 관찰한 앱 세션의 외부 HTTP/HTTPS 요청 없음 |

마지막 두 항목은 수집한 페이지 이벤트의 범위입니다. 보안 보증이나 모든 브라우저 동작 검증을 뜻하지 않습니다.

## v1 → v2 접근·모션 감사

[v1 감사](../evidence/v1-before-v2-accessibility.json)와 [v2 감사](../evidence/v2-accessibility.json)는 같은 개발용 스크립트로 DOM 입력과 RAF 예약을 관찰했습니다.

| 항목 | v1에서 관찰 | v2에서 관찰 |
| --- | --- | --- |
| 방향키 후 Enter 심기 | 5 → 5개, 실패 | 5 → 6개, 통과 |
| 일시정지 관찰 구간의 RAF 예약 | 15회 | 0회 |
| 일시정지 전후 픽셀 | 동일 | 동일 |
| 동작 줄이기 관찰 구간의 RAF 예약 | 10회, ‘자라는 중’ | 0회, ‘고요한 정원’ |
| 감사 대상 버튼·range 높이 | 버튼 40px, range 16px | 측정한 7개 대상 모두 44px |

RAF 수는 해당 짧은 관찰 구간의 예약 횟수입니다. 모든 조작 요소의 감사나 WCAG 준수 판정은 아닙니다.

## 실제 실패와 교정

- v1 배치 시험은 `119.70000000000005`와 `119.7`의 완전 일치 비교로 처음 실패했습니다. 부동소수점 비교 허용오차를 적용했습니다. 원본은 [engine-v1-initial.txt](../evidence/engine-v1-initial.txt)에 남겼습니다.
- v2 통합 과정에서 밀도를 바꿨다가 복원해도 하단 픽셀이 달라지는 **실제 렌더 결함**이 발견됐습니다. 소수점 Canvas 높이의 하단 알파 누적이 원인이었고, `garden.js`의 배경을 버퍼 전체에 불투명하게 채우도록 고쳤습니다. [진단 원본 출력](../evidence/density-diagnosis.txt), [변경 전](../evidence/density-before.png), [변경 후](../evidence/density-after.png), [차이](../evidence/density-diff.png)를 보존했습니다. 교정 뒤 통합 검사의 밀도 왕복 픽셀 복원 항목이 통과했습니다.
- 시스템 동작 설정 변경 직후 체크박스를 즉시 읽은 초기 검사는 이벤트 반영을 기다리지 않아 실패했습니다. 시험에 상태 대기를 추가했고 재실행에서 통과했습니다. 이 실패는 앱 결함과 구분합니다. [final-checks-last-failure.json](../evidence/final-checks-last-failure.json)은 마지막 실패의 원본이며, 전체 실패 이력을 모두 담는 파일은 아닙니다.

## 성능 관찰

02:04:53 UTC의 통합 기록에서, 성숙한 식물 32개·밀도 12·1200×900 뷰포트·DPR 1을 대상으로 **120개 RAF 간격**을 수집했습니다. 평균 **18.609ms**, p95 **33.3ms**입니다. 이는 한 Windows 기기의 headless 실행에서 측정한 **콜백 사이 간격**이며, 독립적인 렌더 시간이나 보편적인 FPS 보증이 아닙니다. 최신 결과는 [JSON의 performance](../evidence/final-checks.json)를 확인하세요. 이전 측정값은 [시점별 로그](log.md)에 보존합니다.

## 아직 확인하지 않은 범위

모바일 결과는 390×844 뷰포트와 터치·DPR 에뮬레이션입니다. 실기기, Firefox, Safari, 스크린리더 사용성은 미검증입니다. 자동 검사와 AI의 화면 비교는 사용자의 미적 만족을 대신하지 않습니다. 수록 브라우저 시험은 `file://`를 사용했으며 로컬 HTTP 실행법은 별도 사용 안내입니다.

추가로 02:05:50 UTC에 Python localhost HTTP 서버에서 200 응답과 가운데 심기 5→6을 확인했습니다([http-smoke.json](../evidence/http-smoke.json)). 26개 전체 시험은 file://에서 수행한 결과입니다. 비교페이지의 로컬 연결과 CSS 버전전환3개도 [delivery-checks.json](../evidence/delivery-checks.json)에 기록했습니다.
