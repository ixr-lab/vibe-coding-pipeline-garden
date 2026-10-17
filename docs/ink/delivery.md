# 수묵·담채 후속 전달 상태

모델·렌더 비교의 소스는 v14 `ff638fa`이다. 색 선택과 기본색 복원, 전체 식물 비율과 수묵·담채의 새 목표를 [계획](plan.md)에 고정하고 기존 v0~v11 이력을 보존했다. 레퍼런스 선행 커밋은 `b2db131`, 첫 구현 v12는 `d63b83b`, 첫 구조 개선 v13은 `6dfb850`이며 v12·v13·v14 태그를 남겼다. 최종 기능127/127·접근 동작17/17·전체 식물/근접52/52·Node23/23·설명 페이지132/132와 실제 성능 관찰을 확인했다. [출처/이력 재감사](publication-audit.md)는 findings0/errors0을 확인했고 새 원격 전달은 진행 중이다.

최종 main에는 v14 이후의 한국어 설명과 데스크톱 펼침 대상32→44px QA 보정을 추가했다. 모델·렌더 비교는 v14 태그를 기준으로, 현재 전달 UI는 [데스크톱](../../evidence/ink/delivery-desktop.png)·[모바일](../../evidence/ink/delivery-mobile.png) 캡처로 구분한다. 새 main의 원격 SHA는 실제 전달 검증 뒤 기록한다.

제작자와 [독립 AI 시각 리뷰](visual-review.md)는 I1/I2/I4를 채택했고 I3은 부분 채택했다. 넓은 잎의 평평한 디지털 면과 제한된 실제 먹 번짐이 남는다. [독립 코드 리뷰](code-review.md)는 성장 중 잎 분리를 찾아 v14 수정 경로를 확인했으며 남은 차단 결함은 발견하지 못했다. 기술 결과·AI 판단과 사용자의 직접 미적 승인은 구분한다.

[GitHub 저장소](https://github.com/ixr-lab/vibe-coding-pipeline-garden)는 이번 요청 전에 이미 public이었다. v11 최종 문서 커밋 `cd38356430bcffd8ae80212641b31bf7ad594a20`의 주요 파일29개 바이트 일치, v0~v11 태그12개 일치, 비인증 README·코드·PNG3개 조회는 [기존 원격 검증](../../evidence/petals/publication-remote.json)으로 확인했다. 이 기존 결과를 새 버전 업로드 성공으로 대신하지 않는다. 공개 상태를 다시 전환하거나 Pages·다른 저장소를 변경하지 않는다.

## 지금 열 수 있는 근거

| 항목 | 경로 |
|---|---|
| 고정 기준과 실제 작업 순서 | [계획](plan.md), [작업 로그](log.md), [8단계](eight-stages.md) |
| 구현 전에 갱신한 공식 출처 | [레퍼런스 보드](../../reference.html), [관찰·귀속·권리 기록](reference-observations.md), [선행 화면](../../evidence/ink/reference-before-implementation.png)·[JSON](../../evidence/ink/reference-before-implementation.json) |
| 실제 전후와 v14 | [정원 변화](../../evidence/ink/evolution.png), [전체 식물 변화](../../evidence/ink/plant-evolution.png), [v14 정원 원본](../../evidence/ink/v14-garden.png), [색 비교](../../evidence/ink/color-modes.png), [모바일](../../evidence/ink/v14-mobile.png) |
| 현재 통합 시험과 한계 | [시험](tests.md), [기능127/127](../../evidence/ink/v14-final-checks.json), [접근17/17](../../evidence/ink/v14-final-accessibility.json), [전체 식물52/52](../../evidence/ink/v14-materials.json), [Node23/23](../../evidence/ink/unit.tap), [색163/163](../../evidence/ink/palette-checks.json) |
| 성장 수정과 성능 | [실제 전후 PNG](../../evidence/ink/growth-before-after.png), [기하 계산5/5](../../evidence/ink/growth-connection.json), [실제 캡처 조건](../../evidence/ink/growth-raster.json), [최대 장면 관찰](../../evidence/ink/stress.json) |
| 설명 페이지와 QA 교정 | [첫 실패131/132](../../evidence/ink/final-site-checks.json), [44px 보정 후132/132](../../evidence/ink/final-r2-site-checks.json), [전달 UI](../../evidence/ink/delivery-desktop.png) |
| 비교·재현·판단 경계 | [전후 판단](comparison.md), [파일로 실행하기](reproduce.md), [AI와 사람의 경계](ai-boundary.md) |

최종 전달 파일은 코드·한국어 문서·자체 생성 PNG와 새 ZIP/대표 PNG로 준비한다. 최종 산출물의 파일 ID·해시·원격 SHA는 실제 확인 후 기록한다. 기존 Library 파일과 과거 증거를 덮어쓰지 않는다. `.git`, 계정 정보, 외부 회화·사진 원본, 다른 프로젝트의 비공개 자산은 전달 ZIP에 넣지 않는다.

기술 검증·AI 시각 채택·공개 업로드와 사용자의 미적 만족은 서로 다른 상태다. 사용자의 직접 미적 승인은 **확인 대기**다.
