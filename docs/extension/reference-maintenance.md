# 레퍼런스 데이터 관리

꽃과 브러시의 조사 기록은 `reference-source/flowers.json`, `reference-source/brushes.json`에서 관리한다. `reference-source/foundation.md`는 기존 Canvas 레퍼런스 보드의 원문이다. 생성기는 이 파일의 모든 바이트를 `docs/references.md` 앞부분에 보존한 뒤 확장 기록을 붙인다.

`reference-data.js`와 `docs/references.md`는 생성 결과다. 이 두 파일에 직접 입력하면 다음 생성 때 사라지므로 원본을 수정한다. 외부 이미지는 원문과 이미지 URL로만 연결하고 다운로드하거나 저장소에 복사하지 않는다. 현재 결과 crop은 프로젝트 출력물이며 `evidence/extension/current-<id>.png`에 따로 만든다. 생성기는 이미지를 읽거나 만들지 않는다.

## 생성·확인

저장소 루트에서 Python 3으로 실행한다. 외부 패키지나 네트워크 연결은 필요 없다.

```powershell
python scripts/build_references.py
python scripts/build_references.py --check
```

첫 명령은 브라우저용 데이터와 문서를 UTF-8로 생성한다. 두 번째 명령은 예상 결과와 현재 파일을 바이트 단위로 비교하며 어떤 파일도 수정하지 않는다. 출력 파일이 없거나 다르면 `STALE`과 파일 경로를 표시하고 종료 코드 `1`을 반환한다. 일치하면 종료 코드 `0`, 입력 오류가 있으면 `2`를 반환한다. 입력 오류는 결과 파일을 쓰기 전에 검사한다.

생성은 원본 파일 순서와 각 배열의 순서를 유지한다. 실행 시각이나 임의 값이 없으므로 같은 입력은 같은 바이트를 만든다. 조사 기록이나 결과 검토를 수정한 뒤 생성하고, 커밋·배포 전 `--check`를 실행한다. 현재 crop을 바꾸어도 JSON과 문서의 관찰·미달 기록을 실제 결과에 맞추어 검토한다.

## 입력 구조

두 JSON 파일의 최상위 값은 배열이다. 항목마다 다음 필드를 기록한다.

| 필드 | 형식·관리 규칙 |
| --- | --- |
| `id` | 소문자 영문·숫자와 단일 하이픈으로 연결한 고유 ID. 꽃과 브러시 전체에서 중복할 수 없다. crop 이름과 UI 연결에 사용하므로 기존 ID 변경 시 관련 출력도 갱신한다. |
| `name` | 비어 있지 않은 표시 이름. 꽃은 `latin`에 학명을 추가할 수 있다. |
| `sources` | 출처 객체의 비어 있지 않은 배열. 같은 URL도 다른 사진·관찰 역할이면 별도 출처로 유지한다. |
| `observations` | 직접 본 특징과 문헌 설명을 구별한 문자열 배열. |
| `avoid` | 회피할 특징을 적은 문자열 배열. |
| `targets` | 구현 결과에서 확인할 구체적인 목표의 문자열 배열. |
| `implementation` | 출처 사실과 구별하여 적은 구현 판단·방법의 문자열 배열. |
| `gaps` | 확인하지 못한 구조, 구현의 미달, 일반화할 수 없는 범위를 적은 문자열 배열. |
| `review` | 선택적 객체. `stage`, `observed`, `adopted`, `remaining`으로 결과 검토를 기록한다. |

각 출처는 절대 `http` 또는 `https` 주소인 `url`을 갖는다. 선택적인 `imageUrl`에도 같은 주소 규칙을 적용한다. `title`, `creator`, `rights`, `accessed`, `visualObserved`도 함께 기록한다. `accessed`는 실제 확인일, `visualObserved`는 이미지를 직접 보았는지 나타내는 불리언이다. 권리가 불명확하면 그 사실과 링크 인용 범위를 명시한다. 출처를 읽었다는 사실만으로 이미지 관찰을 `true`로 바꾸지 않는다.

`review.stage`는 검토 단계 문자열이고 `observed`, `adopted`, `remaining`은 UI에서 목록으로 표시할 문자열 배열로 기록한다. 예시는 다음과 같다.

```json
{
  "review": {
    "stage": "결과 검토 완료",
    "observed": ["현재 crop에서 보이는 특징"],
    "adopted": ["관찰 목표 중 구현에서 확인한 특징"],
    "remaining": ["아직 남은 차이 또는 미확인 항목"]
  }
}
```

`review`가 없거나 검토 하위 필드가 비어 있으면 문서는 `결과 검토 진행`으로 표시한다. 누락된 검토를 완료로 추정하지 않는다. 출처의 `observations`와 현재 결과의 `review.observed`를 구별한다.

생성기는 원본의 `review`와 추가 키를 브라우저 데이터에 보존한다. 다음 세 필드는 생성기가 계산하는 예약 필드이므로 원본에서 편집하지 않는다.

| 생성 필드 | 값 |
| --- | --- |
| `category` | 꽃은 `flower`, 브러시는 `brush` |
| `categoryLabel` | 꽃은 `꽃`, 브러시는 `브러시` |
| `currentImage` | `evidence/extension/current-<id>.png` |

브라우저에서는 두 배열이 합쳐진 `window.GARDEN_REFERENCES` 하나를 사용한다. 생성 문서는 출처·저작자·권리·접근일·이미지 직접 관찰 여부·외부 이미지 링크와 관찰·회피·목표·구현·미달·결과 검토를 함께 표시한다. 외부 이미지 embed는 만들지 않으며 Markdown 특수 문자가 있는 원본 텍스트는 일반 텍스트로 표시한다.
