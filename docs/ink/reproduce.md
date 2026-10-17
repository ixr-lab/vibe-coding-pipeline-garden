# 수묵·담채 정원 재현

저장소를 복제하거나 ZIP을 풀고 `index.html`을 브라우저로 연다. 설치·서버·API 키 없이 `file://`로 실행한다. `reference.html`은 공식 출처와 관찰 기록, `process.html`은 단계별 실제 실행 증거를 보여준다. 외부 회화 이미지는 앱 실행 중 내려받지 않는다.

## 조작과 색

‘화면의 색’에서 수묵 또는 담채를 고른다. 기본은 담채다. ‘꽃잎 색’을 바꾸면 담채의 꽃잎에 반영되고, 줄기·잎·꽃의 중심은 중성 먹으로 묶는다. 수묵에서도 색 선택기를 사용할 수 있으며 선택값을 보관하므로 담채로 돌아오면 그 색을 사용한다. ‘꽃의 기본색 복원’은 현재 고른 종의 기본색으로 되돌린다.

| 종 | 기본색 |
|---|---|
| 코스모스 | `#9b6773` |
| 데이지 | `#9e8c64` |
| 개양귀비 | `#a05e50` |

심기·seed·밀도·바람·정지·비우기·PNG 저장·동작 줄이기와 키보드 조작은 같은 화면에서 사용한다. PNG는 현재 Canvas의 색과 구성을 저장한다.

## 동일 조건

`index.html` 뒤에 다음 쿼리를 붙인다.

```text
?seed=271828&density=7&wind=35&frame=360&flower=cosmos&brush=ink&width=1&texture=60&opacity=85&petals=65&mode=tint&color=9b6773
```

`mode=ink|tint`, `color=RRGGBB` 형식의 6자리 16진수를 사용한다. 색을 생략하면 선택한 꽃의 기본색을 쓴다. 기록 조건은 Windows·Chrome 155.0.8059.84, 뷰포트 `1440×1000`, DPR1이다. `frame=360`은 6초 성장 상태로 시간을 고정한다. 모바일은 `390×844`·터치 에뮬레이션으로 별도 확인했다. 한 포기 도판은 실제 렌더러의 `420×700` Canvas, 식물 index2·size1.2이며 확대된 꽃머리 crop이 아니다. [캡처 JSON](../../evidence/ink/v12-capture.json)을 우선한다.

첫 v12의 전체 정원은 위 seed와 설정으로 실행했으나, 별도 한 포기/5브러시 캡처 harness가 재료 상태의 `seed`를 빠뜨렸다. 모델 seed는271828이지만 재료는 `undefined` 문자열에서 결정됐다. 이 원본을 보존하고, 수정 harness로 v12 소스 태그를 다시 실행한 [v12-r2](../../evidence/ink/v12-r2-capture.json)와 후속 버전을 비교한다. v12와 v12-r2의 수묵·장미색·청색 전체 정원 해시3개는 모두 일치했다. 첫 단독 표본을 후속 표본과 동일한 재료 조건이라고 주장하지 않는다.

브라우저·OS·DPR이 다르면 글꼴·안티앨리어싱이 달라질 수 있다. 같은 실행 환경의 픽셀 왕복·결정성과 서로 다른 플랫폼의 파일 해시 일치는 다른 조건이다.

## 소스와 개발 검증

레퍼런스 선행 커밋은 `b2db131`, v12 최초 구현은 `d63b83b`, v13 구조 개선은 `6dfb850`, v14 농담·성장 연결 개선은 `ff638fa`이다. 각 `v12`·`v13`·`v14` 태그로 구분한다. v14 태그 뒤 최종 main에서 설명 문서와 데스크톱 펼침 대상44px 보정을 추가했으므로 현재 전달본 전체는 최신 main/HEAD를 사용한다. 과거 실행에는 현재 작업 폴더를 직접 되돌리기보다 별도 폴더에 태그를 추출한다. v0~v11의 과거 재현법은 [원래 문서](../reproduce.md)와 [꽃잎 문서](../petals/reproduce.md)에 남아 있다.

```powershell
git archive HEAD --output garden-final.zip
```

앱은 의존성이 없고 아래 개발 검증에만 Node와 Python 3·Playwright·Pillow를 사용한다. Chrome 실행 경로와 한글 폰트는 기록한 Windows 환경에 맞추어져 있다. 다른 환경에서는 경로 변경과 실행 환경을 함께 기록한다.

```powershell
node --test tests/engine.test.cjs tests/materials.test.cjs tests/ink-model.test.cjs tests/ink-palette.test.cjs
python scripts/build_references.py --check
python scripts/ink_capture.py replay
python scripts/ink_checks.py replay
python scripts/ink_accessibility.py replay
python scripts/ink_site_checks.py replay
```

`ink_capture.py`, `ink_checks.py`, `ink_accessibility.py`의 두 번째 인수에는 추출한 런타임 폴더를 지정할 수 있다. 생략하면 현재 저장소의 앱을 실행한다. 새 결과에는 `replay` 같은 별도 라벨을 써서 기존 실패와 성공 증거를 덮어쓰지 않는다. 색 어댑터의 고립 표본 검사는 별도 [시험 기록](tests.md)에 설명한다.

`ink_site_checks.py`도 같은 라벨/런타임 인수를 사용한다. 버전별 결과와 함께 `site-checks.json` 최신 별칭을 갱신하며 이전 별칭을 별도 파일로 보존한다. `ink_stress.py`는 고정 `stress.json`을 쓰므로 복사본에서 다른 QA 브라우저를 닫고 단독 실행한다.

`python scripts/ink_palette_checks.py`는 고정 경로 `palette-checks.json`과 `v12-palette.png`를 쓰므로 새 clone 또는 복사본에서 실행한다. 선택 인수 `--chrome`으로 Chrome 경로를 지정할 수 있다. 나머지 위치 인수 스크립트에 `--help`를 주면 라벨로 해석되어 실제 검사가 실행되므로, 위 사용 형식을 따른다.

전체 식물15조합과 꽃/꽃목·하부 잎군의 원배율 crop은 `python scripts/ink_materials.py`로 재실행한다. `--chrome` 인수 외에는 고정 경로 `v14-materials*`를 쓰므로 복사본에서 실행한다. [도판](../../evidence/ink/v14-materials.png)·[근접](../../evidence/ink/v14-materials-closeups.png)은 같은 `300×580` 실제 Canvas에서 추출했으며 재그림·리사이즈하지 않는다. 픽셀 차이를 재료 충실도 점수로 해석하지 않는다.

성장 연결의 실제 전후 이미지는 v13을 별도 폴더에 추출한 뒤 `python scripts/ink_growth_capture.py <v13-runtime-directory>`로 만든다. 고정 경로를 쓰므로 복사본에서 실행한다. age2.125의 한 포기 데이지·펜·바람0·농도100 조건이며 기본 다섯 포기 정원과 구분한다. [실제 PNG](../../evidence/ink/growth-before-after.png)와 [래스터 캡처 조건](../../evidence/ink/growth-raster.json), [기하·실사용 타이밍 함수 검사](../../evidence/ink/growth-connection.json)를 따로 보존한다.

모델은 `engine.js`의 `createInkPlant`, 전체 식물 렌더와 캐시는 `plant-renderer.js`, 꽃잎 색 변환은 `ink-palette.js`, 화면 제어는 `garden.js`에서 담당한다. 기존 `createPlant`는 과거 버전과 비교를 위해 보존한다. 새 레퍼런스의 관찰·권리·미달은 [관찰 기록](reference-observations.md)과 정규 JSON에 남긴다.
