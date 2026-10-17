# 전달·증거 색인

[GitHub 저장소](https://github.com/ixr-lab/vibe-coding-pipeline-garden) — **private**. 공개 배포/공개 전환 없음. 기존 인증의 ixr-lab 개인 계정으로 새 저장소를 만들었다. 조직 소속은 없으며 권한 확대나 새 토큰 발급 없이 업로드했다.

2026-10-17T02:09:48Z에 원격 main이 v2 커밋과 일치하고, 주요 소스·문서·PNG8개를 contents API로 다시 읽어 로컬 Git 바이트와 대조했다. 모두 일치. [원본 검증 JSON](../evidence/remote-initial.json). 이 기록은 v2 소스 스냅샷을 대상으로 하며 이후 전달 문서 커밋이 main 위에 추가될 수 있다.

## 재현 가능한 소스 스냅샷

| 태그 | 커밋 | 실행 증거 | 변경 비교 |
|---|---|---|---|
| v0 | [95283a8](https://github.com/ixr-lab/vibe-coding-pipeline-garden/commit/95283a8a251f7aea096b9dc9be23658575899da0) | [실행](../evidence/v0-run.json) / [화면](../evidence/v0-desktop.png) | 최소 기능 |
| v1 | [e87cbf8](https://github.com/ixr-lab/vibe-coding-pipeline-garden/commit/e87cbf82616e6f6fb4b5cfd685276197e344cfa9) | [실행](../evidence/v1-run.json) / [화면](../evidence/v1-desktop.png) | [v0→v1](https://github.com/ixr-lab/vibe-coding-pipeline-garden/compare/v0...v1) |
| v2 | [90a835b](https://github.com/ixr-lab/vibe-coding-pipeline-garden/commit/90a835bb1499723045e55aac464965d29e19aa7a) | [실행](../evidence/v2-run.json) / [화면](../evidence/v2-desktop.png) | [v1→v2](https://github.com/ixr-lab/vibe-coding-pipeline-garden/compare/v1...v2) |

처음 로컬에서 만든 커밋을 출판하기 전에 시험 스택의 개인 경로만 [PROJECT]로 치환했다. 따라서 출판 SHA는 초기 로컬 SHA와 다르다. 소스의 버전 구분·원래 커밋 시각·메시지·실제 실패와 수치는 보존했다. 인증정보/대화전문/다른 프로젝트 자산은 저장소에 포함하지 않았다.

## 8단계 증거

| 단계 | 전달 파일 |
|---|---|
| 1 목표·맥락 | [요구·기준](requirements.md), [AI와 사람의 경계](ai-boundary.md) |
| 2 레퍼런스·비교 | [공식 자료4개 보드](references.md), [고정 비교 조건](requirements.md) |
| 3 설계·범위 | [파일 책임·실행 계획](plan.md) |
| 4 최소 기능 | v0 태그, [v0 실행 JSON](../evidence/v0-run.json), v0 PNG |
| 5 실행·비교 | [실험 관찰](experiments.md), [3버전 비교 그림](../evidence/comparison.png) |
| 6 수정·발전 | v1/v2 태그, [의도→가설→변경→실행→관찰→판정](experiments.md), [수정 전 접근 감사](../evidence/v1-before-v2-accessibility.json), [수정 후](../evidence/v2-accessibility.json) |
| 7 통합·판정 | [시험·한계](tests.md), [26개 브라우저 검사](../evidence/final-checks.json), [Node4개](../evidence/engine-final.txt), [링크·전환](../evidence/delivery-checks.json), [HTTP](../evidence/http-smoke.json) |
| 8 전달·재사용 | [빠른 시작](../README.md), [재현 지침](reproduce.md), [변경 기록](../CHANGELOG.md), 이 색인과 원격 검증 |

전체 작업 시점 기록은 [log.md](log.md), 실제 비교 화면 탐색은 [process.html](../process.html). Canvas 원본 PNG, desktop/mobile 캡처와 실패 진단 원본은 evidence/에 있다. 비교 그림은 원본을 축소 배열했고 형태를 보정하지 않았다.

## 사용자가 판단할 것

분위기·색감·움직임의 미적 만족과 활용 가치는 **확인 대기**다. 자동 시험 통과와 AI의 육안 채택을 사용자 승인으로 기록하지 않았다. 모바일은 에뮬레이션이며 Safari/Firefox/실기기/스크린리더는 미검증. 공개 전환·공개 배포는 이번 범위 밖이다.

ZIP과 대표/비교 화면은 별도 Library 파일로 전달하며, 실제 Library 식별자는 최종 전달 보고에서 확인한다. ZIP은 .git·인증파일 없이 추적된 소스/문서/증거를 포함한다.


후속 꽃·브러시 확장: [extension/delivery.md](extension/delivery.md)에서 v3~v5 실제 수정·레퍼런스·시험·전달을 확인하세요. 위 v0~v2 기록은 초기 사례로 보존합니다.
