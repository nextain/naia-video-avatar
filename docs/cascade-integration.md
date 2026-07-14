# NVA 0.3 ↔ output_cascade 연결 계약

> 이 저장소는 Windows 제작 에디터와 NVA 포맷을 책임진다. GPU 렌더와 원격 서비스는
> `naia-omni-cascade`가 책임진다. Cascade 주소는 로컬 설정이며 번들에 넣지 않는다.

## 1. 배선

```text
[Windows NVA editor]
      │  NVA 0.3 bundle + character_state_id
      ▼
[remote output_cascade :8910]
      ├─ TTS
      ├─ Ditto talking-head renderer
      └─ CharacterBundle state map
```

## 2. HTTP 계약

| 목적 | 요청 | 기대 결과 |
|---|---|---|
| 연결 확인 | `GET /health` | JSON health |
| 번들 등록 | `POST /upload_nva` (raw zip body) | default 상태와 상태 목록 |
| 상태별 말하기 | `POST /stream_text` `{text, character_state_id}` | 선택 상태의 fMP4 |
| 같은 상태 idle 복귀 | `GET /idle?character_state_id=<id>` | 선택 상태 idle 영상 |

말하기 완료, 취소, 오류, barge-in 뒤에는 요청에 사용한 같은 상태의 idle로 돌아간다.
상태 ID가 없으면 manifest의 `default_character_state_id`를 사용하고, 모르는 상태 ID는
다른 상태로 조용히 대체하지 않고 오류로 거부한다.

## 3. manifest 매핑

| NVA 0.3 | Cascade 상태 리소스 |
|---|---|
| `character_states.<id>.idle.path` | idle clip |
| `character_states.<id>.talking_body.path` | talking-body clip |
| `character_states.<id>.talking_head.source` | Ditto source |
| `character_states.<id>.talking_head.descriptor` | renderer profile/adapter descriptor |
| `character_states.<id>.face_bbox` | head composition placement |
| 각 `revision` | 캐시 무효화와 교체 추적 |

Cascade loader는 상태 map을 보존해야 한다. 로드 시 한 상태로 평탄화하거나
`sil/a/i/u/e/o` 같은 실험 표현을 제품 포맷으로 고정하면 안 된다.

## 4. 에디터 검증 범위

에디터는 원격 Cascade를 mock 또는 실제 3090 서비스로 호출해 아래를 검증한다.

- health 성공과 실패 표시
- 현재 `.nva` 원문 업로드
- 선택 상태 ID가 말하기와 idle 요청에 전달됨
- 상태별 프로파일과 bbox가 export/reopen 뒤 보존됨
- Cascade 주소가 export manifest에 유출되지 않음

얼굴 검출·입 동기화·경계 품질의 제품 임계치는 아직 미정이다. 먼저 기존 자산이
검출·로드·렌더되는지 증거를 수집하고, 점수는 관측치로만 기록한다.

## 5. 현재 구현 상태

| 구성 | 상태 |
|---|---|
| NVA 0.3 schema/core/migration | 구현됨 |
| Windows 제작 에디터 | 구현됨 |
| 에디터 원격 Cascade 호출 | 구현됨 |
| Cascade 상태 map loader/API | `naia-omni-cascade`에서 구현·검증 대상 |
| 기존 3090 자산 인식 증거 | Cascade 단계에서 생성 대상 |
