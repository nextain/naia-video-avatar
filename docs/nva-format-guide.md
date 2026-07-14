# NVA 0.3 제작 가이드 — 상태별 비디오 아바타 리소스

> 대상: Windows에서 캐릭터 리소스를 만드는 제작자와 원격 Cascade를 연결하는 운영자.
> 정본: `src/main/nva-schema.json`, `src/main/nva-core.js`.

## 1. NVA 0.3의 단위

NVA는 비디오 생성 엔진과 무관한 교환 번들이다. 최상위 단위는 `character_state`이며,
각 상태가 아래 리소스를 함께 소유한다.

- `idle`: 해당 상태의 전신 대기 루프
- `talking_body`: 해당 상태의 말하기 전신 베이스
- `talking_head`: Cascade가 해석하는 헤드토킹 소스와 버전된 descriptor
- `face_bbox`: 전신 영상 위에 헤드를 배치할 관측 영역

말하기 전후에는 **같은 상태의 idle로 복귀**한다. 감정이나 자세를 바꾸지 않는 동작은
gesture로 다루며, 다른 상태로 암묵 전환하지 않는다.

## 2. 번들 구조

```text
character.nva/
  manifest.json
  clips/
    neutral-idle.webm
    neutral-talking-body.webm
  heads/
    neutral-source.png
```

핵심 manifest 예시:

```json
{
  "nva_version": "0.3",
  "contract": "nva-state-resource",
  "default_character_state_id": "neutral",
  "character_states": {
    "neutral": {
      "revision": "neutral-r1",
      "idle": { "path": "clips/neutral-idle.webm", "revision": "idle-r1" },
      "talking_body": { "path": "clips/neutral-talking-body.webm", "revision": "body-r1" },
      "talking_head": {
        "revision": "head-r1",
        "source": "heads/neutral-source.png",
        "descriptor": {
          "schema_version": "1.0",
          "kind": "cascade-profile",
          "profile_ref": "demo-windows-default"
        }
      },
      "face_bbox": { "x": 0.36, "y": 0.08, "width": 0.28, "height": 0.32 }
    }
  }
}
```

`talking_head.descriptor.kind`와 metadata는 확장 가능하다. 여섯 viseme 클립,
방향별 전이, 보간, 코덱과 합성 위치는 RTX 3090 실험 전에는 포맷이 강제하지 않는다.

## 3. Windows 제작과 원격 Cascade

프로파일은 Windows 에디터에서 만든다. `profile_ref`는 번들에 저장하지만 원격 Cascade
주소는 로컬 에디터 설정에만 저장하며 `.nva`에 포함하지 않는다.

에디터 작업 순서:

1. 기존 `.nva`를 열거나 데모를 불러온다.
2. 상태별 idle, talking-body, talking-head source와 revision을 지정한다.
3. 기존 자산이 미리보기와 원격 Cascade에서 인식되는지 먼저 확인한다.
4. 관측한 `face_bbox`를 기록한다.
5. 원격 Cascade health, 업로드, 상태별 말하기, idle 복귀를 시험한다.
6. export한 번들을 다시 열어 manifest와 파일이 보존되는지 확인한다.

얼굴 검출 점수, 입 동기화 점수, 경계 품질의 제품 합격 임계치는 아직 정하지 않았다.
에디터는 관측값을 보여줄 수 있지만 임의의 합격/불합격 기준을 만들지 않는다.

## 4. 안전성과 호환성

- 자산 경로는 번들 내부의 상대 경로만 허용한다. 절대 경로, URL, 역슬래시,
  `..` traversal은 거부한다.
- 각 상태와 리소스는 독립 revision을 가진다. 한 상태를 교체해도 다른 상태는 보존된다.
- 0.1/0.2 manifest는 0.3으로 명시적으로 이행한다.
- 0.2의 `sil/a/i/u/e/o` 데이터는 `legacy-v0.2-prototype` descriptor 아래에만 보존한다.
- 미래 버전은 묵시적으로 읽지 않고 명시적 오류로 거부한다.

## 5. 검증

```bash
pnpm install
pnpm test
pnpm test:browser
```

브라우저 검증은 상태 추가/교체 격리, Windows 프로파일 참조, 원격 Cascade 요청,
export/reopen 동등성, traversal과 미래 버전 거부를 포함한다.

## 6. 권리

포맷 명세와 코어/에디터는 naia(nextain) 자산이다. 번들 안 캐릭터·영상·음성 자산의
권리는 각 번들의 provenance와 license 필드가 정한다.
