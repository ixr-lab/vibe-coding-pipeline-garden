# 꽃과 브러시 확장 전달

기존 [private GitHub 저장소](https://github.com/ixr-lab/vibe-coding-pipeline-garden)에 업로드했다. 공개 전환·배포·권한 확대는 하지 않았다. 원격 소스·레퍼런스·시험·PNG23개 내용을 다시 읽어 Git 바이트와 일치함을 확인했다([원격 원본 검증](../../evidence/extension/remote-v5.json)).

## 실제 버전

| 버전 | 커밋 | 실행·화면 |
|---|---|---|
| v3 최초 확장 | [fe2a481](https://github.com/ixr-lab/vibe-coding-pipeline-garden/commit/fe2a481dcda6e23e1b9024a89c144e2bce703def) | [검사](../../evidence/extension/v3-checks.json), [꽃](../../evidence/extension/v3-flowers.png), [브러시](../../evidence/extension/v3-brushes.png) |
| v4 첫 시각 개선 | [c68c96d](https://github.com/ixr-lab/vibe-coding-pipeline-garden/commit/c68c96d633f5597a82480247de33ee0e3f6b809f) | [검사](../../evidence/extension/v4-checks.json), [꽃](../../evidence/extension/v4-flowers.png), [브러시](../../evidence/extension/v4-brushes.png) |
| v5 두 번째 시각 개선 | [6f1d1e8](https://github.com/ixr-lab/vibe-coding-pipeline-garden/commit/6f1d1e8a468d77b74040315ff13a04873e583db4) | [검사](../../evidence/extension/v5-checks.json), [꽃](../../evidence/extension/v5-flowers.png), [브러시](../../evidence/extension/v5-brushes.png), [15조합](../../evidence/extension/v5-combinations.png) |

최종 main에는 전달 문서 커밋이 추가된다. 원격의 정확한 최종 commit은 `python scripts/verify_remote.py`로 조회·파일 대조할 수 있다. 새 ZIP은 마지막 main 커밋에서 .git·인증자료 없이 생성한다.

## 탐색과 재사용

- `index.html`: 설치 없이 정원 실행. 재료 패널에서 꽃3종·줄기브러시5종·두께/질감/농도 독립 조절.
- [reference.html](../../reference.html): 출처·제작자·권리·확인일·시각 관찰·목표·구현·현재 결과·미달 탐색.
- [study.html](../../study.html): 동일 크기의 꽃 클로즈업·동일 경로 스와치·15조합 실제 출력.
- [process.html](../../process.html): 최초 8단계와 이번 확장 비교.
- [실시간 로그](log.md), [항목별 시각 비교](comparison.md), [실제 시험/한계](tests.md).
- [관리 지침](reference-maintenance.md): JSON 원본 수정 뒤 페이지/문서 동시 생성과 stale 검사.

원본 사진·공식 샘플은 출처로만 링크하고 자체 출력만 저장소에 넣었다. 임시 시각 검토용 원본은 검토 종료 후 제거했다. 실제 이미지 관찰과 문서 확인을 구별하며, 후면 기관처럼 직접 보지 못한 부분은 미확인으로 남겼다.

## 보존과 한계

이전 v0/v1/v2 태그 및 evidence/는 보존했다. 최초 ZIP은 3,863,975bytes, SHA256 `0539777576ad5ee313a0845ea832aa7462071cb7dffd65d313d41f6b662b8cc9`이며 기존 Library ID `libfile_d619472311a0819196da14fb5a3642d4`도 유지했다. 확장 ZIP/비교 PNG는 새 Library 파일로 전달한다.

검증: Node6개, 확장26개, 기존 기능 회귀26개, 레퍼런스12개, 32식물·밀도12의15조합, 키보드·모션 감소·모바일44px 확인. 자동 시험을 형태 유사성 판정으로 세지 않았다. 독립 리뷰어가 실제 꽃/브러시 원본과 v3/v4/v5 이미지를 열어 검토했다. Firefox/Safari/실기기/스크린리더는 미검증.

꽃 형태·드라이 개선은 AI가 채택했고 연필/수채는 부분 채택이다. 수채의 구름상 안료·과립 목표는 아직 미달이며, 실제 식물/화구의 물리 재현을 주장하지 않는다. 사용자 미적 승인은 **확인 대기**다.
