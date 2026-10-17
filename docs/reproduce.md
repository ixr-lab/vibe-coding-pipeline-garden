# 실행과 증거 재현

## 앱만 실행하기

`index.html`을 브라우저로 직접 엽니다. 패키지·Node·Python·API 키는 앱 실행에 필요하지 않습니다. Python이 있는 경우 저장소 루트에서 `python -m http.server 8000`을 실행하고 `http://localhost:8000/`에 접속할 수도 있습니다. 비교 보드는 `process.html`입니다.

## 화면 비교 조건

세 버전의 저장된 [실행 JSON](../evidence/v2-run.json)은 다음 공통 조건을 사용했습니다.

| 항목 | 값 |
| --- | --- |
| seed / 밀도 / 바람 | `271828` / `7` / `35` |
| 성장 시간 | `frame=360` — 60Hz 환산 6초의 고정 보기 |
| 데스크톱 viewport / deviceScaleFactor | 1440×1000 / 1 |
| 모바일 보조 viewport | 390×844 |
| 초기 식물 | 같은 정규화 위치의 5개 |
| 실행 | Windows Chrome 155.0.8059.84, Playwright Chromium API, `file://` |

서버를 사용한다면 `http://localhost:8000/index.html?seed=271828&density=7&wind=35&frame=360`으로 고정 보기를 엽니다. 직접 파일을 열 때도 파일 URL 뒤에 같은 쿼리를 붙일 수 있습니다. 이 화면은 자동 시간 진행을 고정한 기록용이며 일반 사용은 쿼리 없는 `index.html`에서 시작합니다.

v1에서 작품 영역 높이와 배치도 바뀌었습니다. viewport는 같지만 Canvas 높이가 v0 550px에서 v1 630px로 달라져, 형태 개선만 따로 통제한 실험은 아닙니다. 같은 seed도 브라우저·OS·폰트·크기·DPR이 달라지면 동일 이미지 바이트까지 보장하지 않습니다. 픽셀 일치 검사는 같은 실행 환경·설정·입력 순서·시간을 비교합니다.

## 버전 태그

`v0`는 최소 구현, `v1`은 렌더 개선, `v2`는 입력·모션·모바일 개선과 최종 교정 버전입니다. SHA 대신 이 태그를 사용합니다. 과거 소스를 확인하려면 작업을 저장한 깨끗한 복제본에서 실행하세요.

```powershell
git tag --list "v*"
git switch --detach v0
```

원하는 버전으로 `v0` 자리를 `v1` 또는 `v2`로 바꾸고 `index.html`을 다시 여세요. 최신 문서와 통합 검사로 돌아올 때는 `git switch --detach v2`를 사용합니다. 태그가 없는 전달본에서는 `evidence/v0-*`, `v1-*`, `v2-*` 원본과 [비교 보드](../process.html)를 확인할 수 있습니다.

## 개발용 시험 도구

아래 도구는 **개발·검증용 선택 사항**입니다. Node의 내장 시험 외에 Python `playwright`와, 최종 PNG 비교를 위한 `Pillow`를 사용합니다. 저장소 루트에서 실행합니다.

```powershell
node --test tests/engine.test.cjs
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install playwright Pillow
```

아래 세 Python 검증 스크립트는 Windows에 설치된 Chrome을 아래 경로로 지정합니다.

```text
C:\Program Files\Google\Chrome\Application\chrome.exe
```

해당 Chrome이 설치되어 있어야 합니다. 경로가 다르면 각 스크립트의 `executable_path`를 실제 설치 경로로 고친 뒤 실행하세요. 현재 스크립트는 Playwright가 별도로 내려받은 Chromium을 자동 선택하지 않습니다. Node·Python·Chrome의 설치와 네트워크 패키지 다운로드는 앱을 보는 데 필요하지 않습니다.

```powershell
.\.venv\Scripts\python.exe scripts/verify.py v2
.\.venv\Scripts\python.exe scripts/accessibility_audit.py v2
.\.venv\Scripts\python.exe scripts/final_checks.py
```

| 스크립트 | 실제 수행·저장 |
| --- | --- |
| `verify.py v2` | 고정 desktop/mobile/Canvas/PNG 캡처, 기본 smoke 검사, `evidence/v2-run.json` |
| `accessibility_audit.py v2` | 키보드 심기, 정지·동작 줄이기 RAF, 측정 대상 높이, `evidence/v2-accessibility.json` |
| `final_checks.py` | 26개 통합 검사, PNG 픽셀 비교, 120개 RAF 간격, 비교 페이지 캡처, `evidence/final-checks.json` |

**재실행은 같은 이름의 증거 파일을 덮어씁니다.** 원본 보존이 필요하면 별도 복제본에서 실행하세요. `verify.py`의 버전 인수는 출력 파일 이름일 뿐 코드를 전환하지 않습니다. 과거 버전 캡처는 먼저 해당 태그로 이동한 뒤 그 태그의 스크립트를 사용해야 합니다. 최종 접근 감사와 26개 통합 검사는 v2용입니다.

현재 기록은 [v0](../evidence/v0-run.json), [v1](../evidence/v1-run.json), [v2](../evidence/v2-run.json), [최종 통합](../evidence/final-checks.json), [Node v2](../evidence/engine-v2.txt)에서 확인하세요. 새 실행의 시각·브라우저 버전·성능 수치는 달라질 수 있으며 **JSON 원본이 문서에 옮긴 값보다 우선**합니다. 실패 파일이 남았다는 이유만으로 최신 성공 기록을 무시하거나, 성공 기록으로 과거 실패를 지우지 않습니다.

390px 결과는 모바일 에뮬레이션이며 실기기·Firefox·Safari·스크린리더 재현은 아직 수행하지 않았습니다.
