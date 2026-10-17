# 꽃잎 재료 실험 재현

실행에는 설치가 필요 없다. ZIP을 풀거나 저장소를 복제하고 `index.html`을 브라우저로 연다. `petal-study.html`은 확대/기본 크기의 15개 꽃머리, `reference.html`은 출처와 관찰, `process.html`은 작업 증거를 보여준다. 외부 참조 이미지를 자동으로 다운로드하지 않는다.

## 동일 조건

정원 URL 뒤에 다음을 붙인다.

```text
?seed=271828&density=7&wind=35&frame=360&flower=cosmos&brush=ink&width=1&texture=60&opacity=85&petals=65
```

뷰포트 1440×1000, DPR1에서 기록했다. 고정 frame은 6초가 자란 상태이며 애니메이션을 진행하지 않는다. 꽃잎 표본은 기하 seed `271828`, tilt −0.1, radius105/23, 두께1/질감60/농도85/표현65다. 각 열은 같은 꽃 기하를 사용하며 재료만 달라진다. 브라우저·OS·DPR이 바뀌면 안티앨리어싱과 글꼴 때문에 파일 해시는 같다고 보장하지 않는다. 같은 실행 환경 안의 픽셀 왕복·재현성을 시험한다.

## 소스 스냅샷

`v5`는 꽃잎 재료가 없는 기준, `v6`는 첫 적용, `v7`~`v11`은 실제 화면을 보고 고친 개선이다. 각 태그의 앱 소스를 별도 폴더에 풀어 실행한다. 현재 작업 폴더를 과거 태그로 바꾸면 미커밋 파일을 혼합할 수 있으므로 별도 추출을 권한다. 비교 harness와 crop 조립 스크립트는 최종 main/v11을 사용한다. 내부 rescue trial1/2는 PNG/JSON만 보존하며 별도 소스 태그를 만들지 않았다.

```powershell
git archive v11 --output garden-v11.zip
```

v5에는 새 `petal-study.html/js`가 없으므로 baseline 생성 때만 v5 추출 폴더에 현재 비교 harness 두 파일과 빈 `petal-paint.js`를 추가했다. FlowerArt v5는 추가 옵션을 무시하므로 원래 꽃머리를 유지한다. 실행 코드 v5 자체는 고치지 않았다. 이 절차를 자동화하려면 저장소 루트에서 아래 명령 전 v5 런타임 폴더를 준비한다.

```powershell
python scripts/petal_checks.py v5-replay ../petal-baseline-runtime
```

기준 버전은 꽃머리 5열이 같다는 6개 실패가 정상이다. 새 결과를 기존 증거 파일에 덮어쓰지 말고 `-replay` 라벨을 사용한다.

## 개발 검증

앱에는 의존성이 없고, 검증 스크립트에만 Python 3·Playwright·Pillow, 단위 검사에는 Node가 필요하다. 스크립트의 Chrome 실행 경로는 기록한 Windows 환경에 맞추어져 있다. 다른 환경은 실행 파일 경로를 바꾸고 변경을 기록한다.

```powershell
node --test tests/engine.test.cjs tests/materials.test.cjs
python scripts/build_references.py --check
python scripts/petal_checks.py v11-replay
python scripts/petal_regression.py
python scripts/petal_accessibility.py v11-replay
python scripts/petal_stress.py
python scripts/petal_reference_checks.py
python scripts/petal_scene_checks.py v11-replay
python scripts/petal_bounds.py
```

`petal_regression.py`, stress, reference 검사는 고정 결과 경로를 쓰므로 새 clone 또는 복사본에서 재실행한다. 이 스크립트들은 파일·브라우저 검증이며 사람의 미적 승인이나 실제 모바일 하드웨어 측정을 대신하지 않는다. `scripts/petal_figures.py`는 자신의 캡처만 조립하고 외부 그림을 읽지 않는다.

## 유지·확장

꽃잎 기하/가림은 `flower-art.js`, 로컬 재료 획은 `petal-paint.js`, 정원 연결/캐시는 `plant-renderer.js`, 제어는 `garden.js`에 둔다. 새 재료는 같은 실루엣·seed로 먼저 비교하고, 기본 크기의 구별과 과잉 장식을 따로 검토한다. `reference-source/petals.json`을 수정한 뒤 `python scripts/build_references.py`로 문서와 브라우저 데이터를 함께 생성한다. 외부 작품을 프로젝트 산출물로 바꾸어 표시하지 않는다.
