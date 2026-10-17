# 꽃·브러시 확장 검증 기록

2026-10-17 UTC. 이 문서는 `evidence/extension/`에 실제로 생성된 파일과 현재 코드를 근거로 한다. 기존 `evidence/`의 v0~v2 실행·실패·교정 기록을 덮어쓰지 않는다. v0, v1, v2 태그도 유지한다. 확장판의 자동 검사 통과와 사용자의 미적 승인은 별개이며, 미적 승인은 확인 대기다.

## 실행 환경과 비교 조건

Windows의 Chrome/Chromium 155.0.8059.84를 Playwright로 headless 실행했다. 확장 비교는 seed `271828`, density `7`, wind `35`, frame `360`(6초), desktop `1440×1000`, DPR `1`을 사용한다. 초기 재료는 cosmos/ink, width `1`, texture `60`, opacity `85`다. 모바일은 `390×844` CSS viewport이며 실제 휴대전화가 아닌 브라우저 에뮬레이션이다.

`study.html`은 앱의 실제 `FlowerArt`·`BrushArt`를 호출한다. 꽃 클로즈업과 브러시 스와치, 3×5 접촉시트는 직접 제작한 코드의 실제 렌더 결과다. 외부 꽃 사진이나 Krita 샘플 스트로크를 출력으로 대신 쓰지 않는다. 전체 정원은 제어판 추가로 Canvas 크기가 달라질 수 있어, 형태·재료 비교에는 고정 크기의 관찰실 도판을 함께 사용한다.

## 실제 결과

| 검증 | 확인한 증거 | 결과와 범위 |
| --- | --- | --- |
| 최초 확장 v3 | [v3-checks.json](../../evidence/extension/v3-checks.json), 02:22:46 UTC | 26/26. 독립 선택, 15조합, 조절 왕복, 모바일 넘침, 페이지 오류 검사. |
| 첫 개선 v4 | [v4-checks.json](../../evidence/extension/v4-checks.json), 02:26:51 UTC | 26/26. 꽃 형태·잎 개선 뒤 같은 검사를 재실행. |
| 두 번째 개선 v5 | [v5-checks.json](../../evidence/extension/v5-checks.json), 02:33:15 UTC | 26/26. 브러시 3종·꽃 아래 접합 보정과 trial 교정 뒤 재실행. |
| Node 단위 검사 | [v5-tests.txt](../../evidence/extension/v5-tests.txt), 최종 파일 기준 | 6/6, 실패 0. 난수 반복성, 가장자리·고밀도·등방 레이아웃, 곡선 표본의 유한한 접선, 3꽃·5브러시 카탈로그. |
| 기존 동작 최종 회귀 | [final-checks.json](../../evidence/extension/final-checks.json), 02:33:57 UTC | 26/26, JS 오류 0. seed/설정/시점 픽셀 재현, seed·밀도·바람 변화, 성장/정지/재개, reduced motion, 32식물 제한, 입력 정규화, 키보드·터치 심기, PNG 픽셀 일치, DPR 상한, 390px 넘침, 과정 8단계, 외부 요청 없음. |
| 접근성 보조 검사 | [v5-accessibility.json](../../evidence/extension/v5-accessibility.json), 02:34:00 UTC | 키보드 방향 이동 후 Enter로 5→6식물. 정지 중 픽셀 동일·추가 RAF 0, reduced motion 중 추가 RAF 0. 모바일에서 펼친 재료 패널을 포함해 대상 12개 높이 모두 44px. |
| 최대 밀도 실행 | [stress.json](../../evidence/extension/stress.json), [max-density.png](../../evidence/extension/max-density.png), 02:34:12 UTC | 32식물, density 12, 15조합 실행, JS 오류 0. 선택 변경 시간과 warm RAF 간격은 아래에 분리 기록. |
| 레퍼런스 생성·탐색 검사 | [reference-checks.json](../../evidence/extension/reference-checks.json), 02:36:12 UTC | 12/12, JS 오류 0. JSON/생성물 일치, stale 생성물 거부, 8개 현재 출력 이미지 로드, 외부 이미지 미삽입, 꽃 3/브러시 5 필터, 출처 상세 펼침·권리·관찰일, 모바일 넘침·필터 높이 44px. |

확장 26개 검사는 꽃별 5브러시 선택이 꽃 값을 보존하는지 확인하고, 15개 Canvas 서명이 서로 다른지 비교한다. 두께·질감·농도 변경은 출력이 바뀌는지, 원래 값과 선택으로 왕복했을 때 같은 픽셀로 돌아오는지 검사한다. 이 결과가 꽃의 생물학적 정확성이나 브러시의 실제 재료 유사성을 보증하지는 않는다. 시각 판정은 [comparison.md](comparison.md)와 [log.md](log.md)에 따로 남겼다.

레퍼런스의 초기 검사는 lazy 이미지의 로드 완료 전에 읽고, 필터가 카드를 DOM에서 삭제한다고 가정해 실패했다. 실제 구현을 확인한 뒤 테스트를 이미지 완료 대기와 보이는 카드 수 기준으로 고쳤다. 이 과정은 제품의 형태 개선 횟수로 세지 않으며, 교정 이유는 [log.md](log.md)에 보존했다. 독립 리뷰어의 시각·정적 코드 검토도 별도로 진행했지만 런타임 테스트를 독립 재실행한 결과로 중복 집계하지 않았다.

## 성능 수치와 코드에서 확인한 상한

| 장면 | 측정 | 결과 |
| --- | --- | --- |
| 기존 회귀 장면: 32 mature plants, density 12, 1200×900, DPR 1 | 120개 RAF 간격 | 평균 16.667ms, p95 16.9ms. |
| 확장 스트레스: 32식물, density 12, 1440×1000, DPR 1, 15조합 | 각 조합에서 꽃·브러시 두 제어의 동기 변경 및 readback | 188.8~680.3ms. 최대는 daisy/watercolor 680.3ms. |
| 스트레스 마지막 상태: poppy/watercolor, width 2.5, texture 100, opacity 100 | 캐시 생성 뒤 120개 RAF 간격 | 평균 16.667ms, p95 16.9ms. |

RAF 간격은 독립적인 draw 함수 실행시간이나 모든 장치의 FPS 보장이 아니다. 한 Windows headless 환경의 결과이며, cold 선택 변경은 CPU 렌더와 readback을 포함한다. 최초 재료 전환에서는 수백 ms의 동기 지연이 관찰되었으므로 warm 결과만으로 즉각적인 조작 반응을 주장하지 않는다.

현재 [plant-renderer.js](../../plant-renderer.js)를 확인하면 식물 sprite는 최근 사용 순서로 최대 64개, 합계 12,000,000픽셀까지 캐시한다. 더 큰 단일 sprite는 캐시하지 않는다. 이는 sprite 캐시의 상한이며 탭 전체 메모리 상한은 아니다. 성장 나이는 1/8초 간격(8Hz)으로 표본화하고 6초에서 제한한다. 바람 자세는 [garden.js](../../garden.js)의 RAF마다 별도 shear로 적용한다. 정지·reduced motion·숨긴 문서·빈 정원은 연속 루프 조건에서 제외한다. 두께·질감·농도·꽃·브러시 변경 시 sprite 캐시를 비우고 다시 그린다.

## 재실행

저장소 루트에서 아래 명령을 사용한다. Python 스크립트에는 Playwright, Pillow와 현재 Windows Chrome 경로가 필요하다. 다른 환경에서는 스크립트의 브라우저 실행 경로를 해당 환경에 맞춰야 한다.

```powershell
node --test tests/*.cjs
python scripts/extension_checks.py v5
python scripts/extension_regression.py
python scripts/extension_accessibility.py v5
python scripts/extension_stress.py
python scripts/build_references.py --check
python scripts/reference_checks.py
```

세 기능 검증 스크립트는 `extension_checks.py`, `extension_regression.py`, `extension_accessibility.py`이며 최대 밀도 측정은 `extension_stress.py`로 추가한다. `extension_checks.py v5`는 v5 캡처·JSON을 다시 쓰므로 비교 중인 이전 v3/v4/trial 파일을 같은 라벨로 덮어쓰지 않는다. `reference_checks.py`는 생성물 불일치 탐지를 위해 `reference-data.js`에 잠시 개행을 추가했다가 `finally`에서 원문을 복원한다. 독립 실행 중 생성기를 동시에 돌리지 않는다.

출처 변경은 `reference-source/*.json`에서 한 뒤 `python scripts/build_references.py`로 생성물을 갱신하고, `--check`로 정합성을 검사한다. 외부 사진·브러시 원본은 저장소 밖 참고 폴더에만 있고 배포물에는 포함하지 않는다. 레퍼런스 페이지의 이미지는 현재 코드 렌더이며 외부 원본은 제작자·권리·관찰 여부와 링크로만 표시한다.

## 남은 확인

실제 스크린리더의 읽기 순서·발음·상태 알림, Firefox/Safari, 실제 휴대전화·태블릿·저성능 장치·필압 펜 입력은 검증하지 않았다. DOM/키보드/크기/움직임 검사는 전체 접근성 인증이 아니다. 꽃 뒤 총포와 3차원 접합, 실제 흑연 마찰·강모 접촉·수채 확산/건조는 단순화되어 있다. 자동 검사 통과를 사용자의 미적 승인으로 기록하지 않으며, 그 승인은 확인 대기다.
