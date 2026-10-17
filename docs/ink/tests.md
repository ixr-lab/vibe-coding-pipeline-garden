# 수묵·담채 시험과 확인 범위

실제 기록 환경은 Windows·Chrome 155.0.8059.84 headless·Playwright·Canvas 2D다. 앱은 `file://`로 열었다. 수치와 통과 여부는 연결한 JSON 원본을 우선하며, 자동 검증과 실제 그림의 시각 판단을 분리한다.

## 현재 확인된 실행

| 증거 | 실제 결과 | 입증 범위 |
|---|---|---|
| [레퍼런스 선행 확인](../../evidence/ink/reference-before-implementation.json) | 전체14카드·새 수묵/담채3카드·검토대기 표기3개 | 앱 구현 전 보드 갱신, 커밋 `b2db131`. 작품의 권위가 구현 적합성을 보장하지 않음 |
| [v12 캡처](../../evidence/ink/v12-capture.json) | 3/3, JS 오류0 | 수묵/담채·선택색 출력 구별, 모바일 가로 넘침 없음, 실제 화면 저장 |
| [v12 재캡처](../../evidence/ink/v12-r2-capture.json), [v13 캡처](../../evidence/ink/v13-capture.json) | 각3/3, JS 오류0 | 단독 표본의 재료 seed 교정. v12 전체 정원의 모드/색3개 해시가 최초 기록과 일치 |
| [v12 기능 회귀](../../evidence/ink/v12-qa-checks.json) | 127/127, JS 오류0 | 전체 장면의 색·제어 왕복·3종×5재료×2모드·PNG·기존 입력/모션 회귀 |
| [v12 접근 동작 재검사](../../evidence/ink/v12-qa-r2-accessibility.json) | 17/17 | 새 제어의 이름·활성 상태, 키보드, 모바일 대상 크기·가로 넘침, 정지/동작감소 RAF |
| [색 어댑터 검사](../../evidence/ink/palette-checks.json) | 163/163, 오류0 | 고립 꽃머리의 기존 v11 픽셀 보존·무채색 수묵·선택색 담채·결정성·Canvas 상태 복원 |

위 v12 기록을 보존하고 v14 `ff638fa`에서 다음을 다시 확인했다.

| v14 실제 증거 | 결과와 확인 범위 |
|---|---|
| [최종 기능 회귀](../../evidence/ink/v14-final-checks.json) | 127/127, JS 오류0. 모드/색·기본색 복원·결정성·3종×5재료×2모드·PNG·심기/키보드/터치·모션·resize·DPR 경계 |
| [최종 접근 동작](../../evidence/ink/v14-final-accessibility.json) | 17/17. 새 제어 이름·활성·키보드, 19개 모바일 대상 높이44px, 390/320px 넘침·정지/동작감소/고정 frame의 RAF |
| [전체 식물과 원배율 근접](../../evidence/ink/v14-materials.json) | 52/52, 오류0. 실제15조합의 결정성·기하 보존·서로 다른 픽셀, 동일 Canvas에서 꽃/꽃목·하부 잎군 crop |
| [단위 실행](../../evidence/ink/unit.tap) | Node23/23. 기존 엔진/재료와 새 모델·색·성장 연결 검사 |
| [성장 연결 계산](../../evidence/ink/growth-connection.json) | 5/5. 실제 렌더 타이밍 함수로 v13 분리 재현·v14 잎 노출 지연·성숙 확인. 곡선 샘플 계산이며 raster 픽셀 거리 측정 아님 |
| [실제 성장 전후](../../evidence/ink/growth-raster.json) | v13 태그와 v14 `ff638fa`, age2.125 한 포기 실제 Canvas·원배율 crop, JS 오류0. [PNG](../../evidence/ink/growth-before-after.png) |
| [v14 고정 화면](../../evidence/ink/v14-capture.json) | 3/3, JS 오류0. 수묵/장미/청색 구별·모바일 넘침 없음 |
| [최종 설명 페이지](../../evidence/ink/final-r2-site-checks.json), [최신 별칭](../../evidence/ink/site-checks.json) | 132/132. HTML5개×데스크톱/모바일의 이미지·로컬 연결·넘침·오류·외부 요청과 보이는 제어/펼침 대상44px, 레퍼런스 필터. 일반 본문 링크는 대상 크기 감사에서 제외 |

v14 PNG 내보내기는 `996×798`이며 저장 파일을 디코딩해 현재 Canvas 픽셀과 대조했다. 전체 식물15조합은 [원본 크기 도판](../../evidence/ink/v14-materials.png)·[근접](../../evidence/ink/v14-materials-closeups.png)에 있다. crop은 같은 `300×580` Canvas를 그대로 잘라 붙였으며 확대하거나 다시 그리지 않았다. 픽셀 차이가 재료 충실도를 입증하지는 않는다. 실제 재료 시각 판정 I3은 [부분 채택](visual-review.md)이다.

색 어댑터 기록은 반지름23/105의 기존 꽃머리 36개 픽셀 해시가 실제 v11 사전 캡처와 같음을 포함한다. 이는 과거 렌더 경로를 보존했다는 근거이며, 새 전체 식물 구도나 사람의 재료 식별을 입증하지 않는다. 새 제어 3개는 모두 비활성화되지 않았고, 모바일에서 감사한19개 대상의 높이는44px이다. 접근 동작은 수묵 중 색값을 보관하는 조작도 확인한다.

v12 PNG 내보내기는 `996×798`이며 저장 파일을 디코딩해 현재 Canvas 픽셀과 비교한다. 뷰포트 크기와 Canvas의 실제 출력 크기는 다르다. [전체 정원](../../evidence/ink/v12-garden.png), [한 포기3종](../../evidence/ink/v12-plants.png), [5브러시](../../evidence/ink/v12-brushes.png), [모바일](../../evidence/ink/v12-mobile.png)을 자동 결과와 함께 관찰했다.

첫 v12 한 포기/5브러시 harness는 모델 seed만 전달하고 재료 상태의 seed를 생략했다. 전체 정원 캡처는 올바른 설정이었다. 비교 조건의 문제를 QA에서 분리했으며, 과거 PNG를 남기고 v12 소스 태그를 수정 harness로 재실행한 `v12-r2` 표본을 후속 버전의 비교 기준으로 쓴다. 이 수정은 v12 제품 코드를 바꾼 것이 아니다.

## 실제 성능 관찰

04:06:41 UTC에 다른 QA 브라우저가 닫힌 상태에서 [최대 장면](../../evidence/ink/stress.json)을 단독 측정했다. 32개 성숙 식물·밀도12·3종×5브러시15조합의 두 제어 변경+draw/readback은232.9~965.7ms였다. 최댓값은 코스모스/수채로, 캐시를 다시 만드는 선택 변경에 약0.97초가 걸릴 수 있다.

캐시가 준비된 poppy/watercolor·담채 청색·두께2.5·질감100·농도100·꽃잎 표현100 장면의120개 RAF 간격은 평균16.669ms, p9516.9ms였다. cold 변경과 warm RAF는 서로 다른 값이다. 단일 draw 시간·입력 지연·GPU 처리시간이나 모든 기기의60FPS를 보장하지 않는다. 한 headless Windows/Chrome 환경의 관찰이며 오류는0이었다.

출처/전체 이력은 [공개 전 감사](publication-audit.md)와 [재감사 JSON](../../evidence/ink/publication-local.json)에서 findings0/errors0을 확인했다. 처음 찾은 로컬 경로 메타데이터와 공개 전 정리도 기록했다. [원격 재조회](../../evidence/ink/remote.json)는 커밋 `89172d8`의 주요 파일29개·태그15개·비인증 파일3개 바이트 일치를 확인했다. 첫 TCP 읽기 시간 초과 뒤 읽기만 재시도했으며 push/가시성 변경을 반복하지 않았다.

설명 페이지 첫 실행은 [131/132](../../evidence/ink/final-site-checks.json)였다. 유일한 실패는 `index.html` 데스크톱의 재료 펼침 대상 높이가32px였던 것이다. 최종 main에서44px로 보정한 뒤 [132/132 재검사](../../evidence/ink/final-r2-site-checks.json)를 통과했다. v14 태그의 모델·렌더와 이 후속 UI 보정을 구분하며 첫 실패 원본은 남긴다. [전달 화면](../../evidence/ink/delivery-desktop.png)·[모바일](../../evidence/ink/delivery-mobile.png)은 보정 후 다시 캡처했다.

## 한계

- 390×844의 모바일·터치는 에뮬레이션이다. 실제 휴대전화·iOS Safari·Firefox·스크린리더는 미검증이다.
- 이름·키보드·44px 대상·모션 동작 검사는 전체 WCAG 준수 감사가 아니다.
- 이미지 해시 차이는 출력 픽셀이 달라졌음을 말한다. 다섯 재료가 사람에게 충분히 구별되는지는 전체/근접 이미지와 별도 시각 리뷰로 판단한다.
- 수묵과 담채는 Canvas의 생성 표현이다. 종이 흡수·물·안료의 유체 물리, 실제 화구나 원작의 완벽한 복원은 주장하지 않는다.
- watercolor의 국소 `destination-out` 마스크는 같은 sprite의 기존 밑그림 알파도 일부 줄인다. [독립 코드 검토](code-review.md)에서 구조를 깨는 차단 결함으로 확인되지는 않았으며, 실제 안료 물리를 주장하지 않는 합성 한계로 남긴다.
- 기술 통과와 AI의 시각 채택은 사용자 미적 승인을 대신하지 않는다. 사용자 직접 승인은 **확인 대기**다.
