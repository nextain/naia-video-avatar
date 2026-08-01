# Issue 13 타당성 CONFIRM 프로토콜

이 문서는 실행 전에 고정하는 H1의 측정 계약이다. 결과를 본 뒤 분석기·표본·문턱을 바꾸면 해당 실행은 증거가 아니다. 연구 헌장의 정본은 alpha-adk 루트 `.agents/research/nva-multilingual-precomputed-viseme/charter.yaml`이고 리뷰 입력은 NVA `.agents/work/issue13-charter.yaml`의 바이트 동일 사본이다. 두 SHA-256이 `a16478184e9f344eb8db3308fe92b3bb2df65ceebf764c76aa03336cba6f7154`와 모두 일치하지 않으면 실행하지 않는다.

## 질문과 후보

H1은 인간형 Jina 512×512 헤드로 아래 후보를 만든다. Jina에서 F가 통과한 뒤 큰 고양이 머리 Naia는 별도 H2로 같은 계약의 비인간형 일반화를 검사한다. H1과 H2 결과를 합쳐 보고하거나 Jina 성공을 Naia 성공으로 간주하지 않는다.

고정 Jina 자산은 `naia-adk/naia-settings/nva-files/jina`의 manifest SHA-256 `84027da29e093549fbf64013f959e0d13d45ee2463b69ec119b544177d66d7d7`, 말하기 몸 영상 SHA-256 `9e8365063dbc18868e16ed9e63fdb498afcb037dc55159f58429a094a9fcefe3`, `ditto_region=[104,0,512,512]`이다. 몸 영상은 720×1280, 24fps, 4초이며 디코드한 96프레임의 raw MD5가 모두 `3a01da9462ee3a9e33020e2513e7395b`로 같다. 첫 프레임에서 자른 512×512 헤드 SHA-256은 `aa126c6fb814feb501d47b89d9879c5c24926fd42bb574ab096fcacbf265daf9`다. 후보와 R은 이 해시들을 evidence manifest에서 다시 검증한다.

- A: `sil/a/i/u/e/o` 6개 고립 상태. 보류 브랜치 기준선. A도 아래 W/F/L 방식으로 각각 `A-W`, `A-F`, `A-L`을 만들어 B/C의 방식별 개선량 기준으로 사용한다.
- B: 13개 공통 조음 단위의 방향성 이전→현재 전이. 최대 169개.
- C: B + FLEURS train split에서 빈도가 높은 이전/현재/다음 문맥 단위 최대 64개. 미등록 문맥은 B로 되돌아간다.
- R: 같은 held-out 오디오를 문장 전체로 실행한 Ditto 품질 참고값. 정답 시간선이나 유일한 자연스러움 판정기는 아니다.

B와 C는 아래 세 방식을 모두 만든다. F가 제품 후보이고 W는 전체 머리 품질 기준선, L은 랜드마크 적응형 하안면 대조군이다. 세 방식은 동일한 Ditto 입 동작열과 동일한 재렌더 프레임을 입력으로 사용한다.

- W `motion-normalized-whole-head`: 현재 NVA의 몸 영상 위 512×512 전체 헤드 합성을 유지한다. 생성 서버가 아래 고정 규칙으로 Ditto 동작열의 비발화 움직임을 공통 상태로 정규화한 뒤 Ditto decoder/stitch network로 전체 머리를 다시 렌더링한다. 런타임은 재렌더된 조각만 복호화·합성하며 모델 추론이나 프레임 보간 모델을 실행하지 않는다.
- F `factorized-difference-layer`: 같은 입 전용 재렌더와 중립 재렌더의 픽셀 차이에서 프레임별 알파 마스크를 만들고, 중립 프레임에서 한 번 고정한 하안면 support 안의 변화 픽셀만 VP9 알파 발화 레이어로 저장한다. 런타임은 연속 중립 머리 위에 발화 레이어만 합성한다. support 밖 머리·머리카락·눈·조명은 알파 0 불변이라 발화 조각 교체 대상이 아니다.
- L `adaptive-lower-face`: W와 같은 재렌더 프레임에서 아래 고정 마스크의 하안면만 중립 기본 헤드에 알파 합성한다. 고정 사각형 입 패치와 결과를 본 뒤 마스크를 수정하는 행위는 금지한다. 얼굴 내부 접합선과 턱·볼 동작 손실을 별도 결함으로 측정한다.

### 고정 생성·접합 알고리즘

Ditto 소스는 commit `5c1863ca7f69ec5d38021913644c349a133381a9`로 고정한다. 작업 트리가 이 commit과 다르거나 모델/config 해시가 evidence manifest에 없으면 생성하지 않는다. 265차원 동작열은 Ditto `_cvt_LP_motion_info`의 `scale(1), pitch(66), yaw(66), roll(66), t(3), exp(63)` 순서로 해석한다. `kp(63)`는 소스 고유값이라 오디오 동작열에 포함되지 않는다.

1. 각 13개 단위의 원자 WAV는 아래 고정 eSpeak 출력에서 만든다. 대표 IPA는 `sil=<break time="400ms"/>`, `closed=m`, `labiodental=f`, `dental=θ`, `alveolar=s`, `postalveolar=ʃ`, `palatal=ç`, `velar=x`, `glottal=h`, `vowel-open=a`, `vowel-mid=ə`, `vowel-spread=i`, `vowel-round=u`다. 비무음 출력의 mono s16 PCM을 float64로 바꾸고 10ms 비중첩 RMS를 계산한다. activity threshold는 `max(0.02, 0.10*max_rms)`이며 첫 active block 시작 sample부터 마지막 active block 끝 sample까지 자른다. active span이 200ms 미만이면 생성 실패다. NumPy `1.26.4`의 `np.interp`로 이 span의 sample index `[0,n-1]`을 `np.linspace(0,n-1,6400)`에 선형 보간하고 `np.rint(clip(x,-1,1)*32767).astype('<i2')`로 정확히 6,400 sample, mono s16le 16kHz 원자 WAV를 만든다. `sil`은 6,400개의 0 sample이다. 기준 표현 `E_u`는 원자 WAV를 단독 Ditto 렌더한 25fps 프레임 index `3,4,5,6,7`의 `exp` 중앙값이고, `sil` 표현은 소스 이미지 `exp`다. 모든 생성은 Ditto `sampling_timesteps=50`, seed `130013`, 25fps를 쓴다.
2. 전이 오디오는 원자 WAV `p`와 `c`를 sample 단위로 이어 붙인 정확히 12,800 sample 파형이다. 경계는 sample `6400`, 즉 오디오 시작 후 정확히 400,000µs다. Ditto frame `f`의 시각은 `f*40,000µs`로 고정하며, `R_k`는 경계의 `-80,-40,0,+40,+80ms`에 해당하는 frame index `8,9,10,11,12`의 표현이다. C의 `p,c,n`은 원자 WAV 세 개를 이어 붙인 19,200 sample 파형이고 같은 첫 경계 frame `8..12`를 쓰며, 세 번째 원자가 Ditto 시간 문맥에만 영향을 준다. 별도 강제 정렬이나 에너지 재탐색으로 이 frame index를 바꾸지 않는다. 입 표현점은 Ditto가 공개 코드에서 쓰는 `[6,12,14,17,19,20]`의 xyz 18차원으로 고정한다. `k=0..4`, `t=k/4`, `S(t)=3t²-2t³`, `W(t)=4t(1-t)`이고, 입 표현은 `E_k=(1-S(t))E_p+S(t)E_c+W(t)(R_k-((1-t)R_0+tR_4))`로 만든 뒤 고정 Ditto `v_min_max_for_clip`에 자른다. 따라서 이웃 조각의 공유 단위 경계 표현은 수치상 같다.
3. 입 18차원을 제외한 `exp`에는 눈 표현점 `[11,13,15,16,18]`의 xyz도 포함하며 모두 소스 이미지 값으로 고정한다. 별도 눈 상태 필드를 가정하지 않는다. Ditto MotionStitch는 `drive_eye=False`, `delta_eye_arr=None`로 실행하고 `pitch/yaw/roll`, `t`, `scale`도 전 프레임에서 소스 값으로 고정한다. C의 문맥 조각도 동일한 식을 쓰되 `R_k`만 선등록된 이전/현재/다음 문맥 오디오에서 얻는다. 별도 RIFE/광학 흐름/수작업 프레임은 H1에 넣지 않는다.
4. W는 위 동작열을 Ditto warp/decoder/stitch network로 512×512 전체 머리 프레임으로 렌더링하고 그대로 몸 위 `ditto_region`에 합성한다. Ditto는 `use_d_keys=("exp",)`, `drive_eye=False`, `delta_eye_arr=None`, `relative_d=True`로 실행한다.
5. F의 중립 기준은 같은 source/seed/설정과 4초 PCM16 mono 16kHz 무음으로 렌더한 영상의 정확히 2.000초 프레임이다. 이 중립 프레임에서만 MediaPipe 478 랜드마크를 한 번 검출한다. support는 L과 같은 위쪽 경계 `[50,187,205,36,142,126,217,174,236,3,456,399,437,355,371,266,425,411,280]`와 아래 얼굴 윤곽 `[234,93,132,58,172,136,150,149,176,148,152,377,400,378,379,365,397,288,361,323,454]`의 단순 다각형을 채우고 4px 팽창한 뒤, MediaPipe 눈 랜드마크 `[33,133,159,145,362,263,386,374]` 각각의 8px 원 합집합을 뺀 이진 마스크다. 각 W 프레임과 중립 프레임을 RGB8 sRGB로 디코드하고 채널별 절대차의 최댓값 `d=max(|R-R0|,|G-G0|,|B-B0|)`를 계산한다. `d>12`를 255, 나머지를 0으로 만든 뒤 3×3 erosion 1회, 3×3 dilation 3회, radius 3 box blur 1회로 만든 값에 support를 곱해 최종 알파를 얻는다. W 프레임 RGB와 이 알파를 `yuva420p` VP9 레이어로 저장하고 런타임에서 중립 기준 위에 source-over 합성한다. clip 프레임 랜드마크·고정 입 사각형·사후 연결성분 선택은 쓰지 않는다. 디코드한 모든 알파 프레임에서 support 밖 값은 정확히 0이어야 하고 눈 원 합집합과 support 교집합은 비어 있어야 한다. Ditto 표현점 `[11,13,15,16,18]`과 MediaPipe 인덱스를 혼용하지 않는다. 하나라도 어기면 F 후보 생성 실패다.
6. L은 W 프레임과 중립 Ditto 기본 헤드를 MediaPipe 478 랜드마크로 검출한다. 매 프레임 W를 중립 헤드에 눈 바깥 모서리 `33,263`과 코끝 `1`의 최소제곱 유사변환으로 정렬하고, 위쪽 경계 `[50,187,205,36,142,126,217,174,236,3,456,399,437,355,371,266,425,411,280]`와 아래 얼굴 윤곽 `[234,93,132,58,172,136,150,149,176,148,152,377,400,378,379,365,397,288,361,323,454]`을 이은 단순 다각형을 채운다. 4px 팽창 후 안팎 12px signed-distance raised-cosine feather로 알파 합성한다. 랜드마크가 없으면 해당 프레임과 후보는 실패이며 이전 마스크를 재사용하지 않는다.
7. A-W/A-F/A-L은 같은 생성·접합 알고리즘을 쓰되 13단위 전이 대신 최근접 `sil/a/i/u/e/o` 기준 표현을 유지하고 2프레임 raised-cosine 교차 혼합한다. B/C는 각각 같은 방식의 A와 비교한다.

후보 생성 전 Ditto preflight는 소스 상태에서 7프레임 합성 동작열을 만들고 입 18차원만 `sil→vowel-open→sil`로 바꿔 재렌더한다. MediaPipe 기준 가운데 프레임의 입 랜드마크 중앙 이동이 2px를 초과하고, 눈 랜드마크 최대 이동이 0.25px 이하이며, `pitch/yaw/roll/t/scale`의 입력·출력 최대 절대차가 `1e-6` 이하여야 한다. 첫/끝 렌더의 RGBA SHA-256이 서로 같아야 한다. F를 중립 위에 재합성한 영상과 W의 15.6초 고정 탐색 fixture는 SSIM 0.995 이상, PSNR 40dB 이상이어야 한다. 이 유사도는 support 내부 표현 보존만 확인하며, 별도로 모든 디코드 프레임의 support 밖 alpha 최대값이 0이고 support 밖 합성 RGB가 중립 RGB와 바이트 동일해야 한다. 이 조건 또는 Ditto 내부 동작열 추출·재렌더 호출이 실패하면 W/F/L 축 전체를 `INCONCLUSIVE`로 종료한다.

2026-08-01 탐색 실행은 Jina 전체 발화 R을 720×1280/25fps로 생성했고 SHA-256은 `35a3593e9c056ad4afc34d47dfbd8b1a849c11e2594c8fd506883f6508e744b1`이다. 같은 오디오의 입 전용 렌더 SHA-256은 `9e0181ca85e4f5211725e026d2ab2e678b2c24ff41ca393531bdfb84edaaa361`다. 최초 무제한 차분층은 SSIM `0.998390`, PSNR `45.310448dB`였지만 support 밖 재구성 잡음을 허용하므로 제품 preflight 증거에서 제외한다. 위 고정 support를 적용한 390프레임 재실행은 support `5,313px`(512²의 `2.0267%`), 눈 교집합 `0px`이었고 lossless VP9를 다시 디코드한 390프레임 모두 support 밖 alpha 최대값과 비영 픽셀 수가 각각 `0`, `0`이었다. 레이어 SHA-256은 `a72df43b8e7542492a2595fb958850a470031be77002e1e442fb8d36f8ec521f`(19,914,799 bytes), 재합성 SHA-256은 `fb8e35219f5b0f5d8d78682dbb1e2ef7ae4a5ae6a536852c444b1142f8ee6a94`였고 입 전용 W 대비 SSIM `0.996632`, PSNR `47.023535dB`였다. 이는 support 제한 분리 preflight 증거일 뿐 조각 전환·다국어 H1 PASS 증거로 사용하지 않는다.

13개 단위는 `sil`, `closed`, `labiodental`, `dental`, `alveolar`, `postalveolar`, `palatal`, `velar`, `glottal`, `vowel-open`, `vowel-mid`, `vowel-spread`, `vowel-round`로 고정한다. 음소 정규화와 음소→단위 표는 `issue-13-phone-map.json`으로 고정한다. 네 개 고정 MFA 사전의 고유 음소 100%가 정확히 한 단위로 정규화되는지 후보 생성 전에 검사하고, 미등록/중복 음소가 하나라도 있으면 H1은 `INCONCLUSIVE`로 멈춘다. 중국어 성조와 모든 언어의 억양은 오디오 운율에 남기고 별도 입모양 단위를 늘리지 않는다.

C의 문맥 목록은 FLEURS revision `70bb2e84b976b7e960aa89f1c648e09c59f894dd`의 네 언어 train split 전체에서 `transcription` 필드만 사용해 만든다. 행은 dataset row index 오름차순으로 읽고, 문자열을 Unicode NFC로 바꾼 뒤 모든 Unicode whitespace 연속을 U+0020 하나로 바꾸고 양끝을 자른다. 빈 문자열은 실패다. 각 언어를 `en-us`, `ko`, `ja`, `cmn` voice에 고정해 eSpeak NG `1.52.0`을 `-D -q --ipa --sep=_ -v {voice}`로 실행한다. stdout의 `(...)` 언어 전환 표식과 whitespace를 제거하고 `_`로 나눈 토큰을 phone-map의 NFD·결합부호/강세/길이/성조/modifier 제거 규칙과 longest-token-first로 변환한다. 미등록 토큰은 행 제외가 아니라 C 생성 실패다. 행 양끝에 `sil`을 하나씩 붙여 연속 3단위 빈도를 센다. 언어별 행 index·정규화 transcript SHA-256·raw IPA stdout SHA-256·단위열 SHA-256과 전체 빈도표를 evidence manifest에 기록한다. 빈도 내림차순, 동률은 `previous\0current\0next` UTF-8 바이트 오름차순으로 정렬한 첫 64개의 JSON 배열 SHA-256을 어떤 후보도 렌더하기 전에 잠근다. test split, train 오디오, 정렬 confidence, 후보 영상/점수는 선택에 쓰지 않는다.

## 입력과 분리

- 생성 자산: eSpeak NG `1.52.0`, binary SHA-256 `81e03505a9f6643bb59ad1163eda297f5b6a1f38e64f8f39e49bf6c34aaa7086`, data-tree aggregate SHA-256 `97042e9a34140a7c6c3961873bab2f2a6125c09dbf5e40480cb123380ff5f11d`를 쓴다. SSML IPA 입력은 `-D -m -v en-us -s 120 -p 50 -a 100 -g 0 --ssml-break=100 -z`로 고정한다. 단일 단위는 `<speak><phoneme alphabet="ipa" ph="{ipa}">{ipa}</phoneme></speak>`이고 `sil`은 400ms break로 치환한다. 전이/문맥 오디오는 eSpeak에 다시 넣지 않고 위 정규화 원자 WAV를 sample 연결한다. 생성 manifest에는 정렬된 unit key, UTF-8 SSML 전체, 명령 인자 배열, eSpeak 원본 WAV/active-span/정규화 원자 WAV의 sample 수와 SHA-256, 연결 WAV SHA-256, PCM 형식, 고정 frame index와 표적 sample 경계를 기록한다. manifest 생성기는 모든 key를 만든 뒤 파일 자체 SHA-256을 잠그며 누락·중복 key나 sample 수 불일치가 하나라도 있으면 렌더하지 않는다. Ditto에는 기록된 연결 WAV만 넣는다.
- 평가 음성: `google/fleurs` revision `70bb2e84b976b7e960aa89f1c648e09c59f894dd`의 CC BY 4.0 test split에서 `en_us`, `ko_kr`, `ja_jp`, `cmn_hans_cn`을 dataset row index 오름차순으로 읽는다. 각 행 키를 `SHA256("130013\\0"+language+"\\0"+row_index+"\\0"+id)`로 계산해 digest 바이트 오름차순, 동률은 row index 오름차순으로 정렬하고 첫 30개(정렬 교정 10 + 최종 20)를 고른다. 선택 row index/id/audio SHA-256 manifest를 후보 생성 전에 고정한다. 성별은 진단만 보고하고 선택에 쓰지 않는다.
- 최종 평가는 위 seed 순서에서 고정된 20문장/언어, 총 80문장과 그 안의 유효 음소 이벤트 전체만 사용하며 행을 추가·교체하지 않는다. 언어별 유효 이벤트가 200개 미만이면 그 언어와 H1은 `INCONCLUSIVE`다. 13단위별 이벤트 수는 대표성 진단으로 보고하되 표본을 결과에 맞춰 바꾸는 근거로 쓰지 않는다.
- 모든 입력에는 텍스트, 오디오 SHA-256, 언어, 음소/조음 타임라인, 생성기/정렬기 revision을 기록한다. 음성·영상 원본은 Git 밖 증거 디렉터리에 둔다.

## SpeechPlan과 정렬

Player의 품질 보장 입력은 `text + audio + SpeechPlan`이다. SpeechPlan의 시간은 오디오 시작 기준 정수 마이크로초이며 단조 증가해야 한다. cascade가 VoxCPM2 오디오를 만들 때 같은 요청 안에서 정렬 어댑터를 호출해 함께 반환한다. 외부 오디오는 같은 공급자 비종속 정렬 작업으로 SpeechPlan을 먼저 만든다.

eSpeak NG는 생성용 음소 후보 생성기일 뿐 실제 평가 오디오 경계를 정하지 않는다. 정렬 공급자는 MFA `v3.3.9` tag `ec8770ef7e247434f1e870a94ef6ca82df5d8341`과 아래 v3.0.0 자산으로 고정한다. 각 다운로드가 해시와 다르면 실행하지 않는다. MFA가 내는 음소 경계와 log-likelihood/confidence만 SpeechPlan에 사용하며 휴리스틱 시간으로 대체하지 않는다.

| 언어 | acoustic SHA-256 | dictionary SHA-256 |
|---|---|---|
| en `english_mfa` | `a5c26c360b741e9a8e692416d942dae1fb2a8957dccc0826c4d6a87c98945f73` | `30da2ad9168290da124369edb8011ebca5e9a6f0d4b0ad5e0fc33fa0fe12ca77` |
| ko `korean_mfa` | `46f7a73ab46828c679562b160e0577beecfb4a9a827efe5ab392aee947451a4d` | `75683f4dc2a7dd95295a068206d248a30bd2f4f2231fd4449210c91d1e78150b` |
| ja `japanese_mfa` | `85928ffb1024486872a677a92e1fa94d2f997462d0b84c73a58aa9bb0e35179a` | `4a0c66760576e4b7f3748f3169e7d5217c0135f857f0b5d34637c93a85fd1c91` |
| cmn `mandarin_mfa` + `mandarin_china_mfa` | `c4c91c499ada0de35346481d4af69c7328075ddb0ce16a8cfb19fc74d0401199` | `0881d4e338e26509d022992cb5b897ead24a176448f534481238cb3a7fe949f0` |

교정 10문장/언어에서 단어 coverage 100%, 정렬 실패 0이어야 한다. 교정 10개의 utterance 평균 log-likelihood 중앙값 `L`과 MAD `M`을 후보 영상 생성 전에 잠근다. `M=0`이면 해당 언어는 `INCONCLUSIVE`다. 최종 20개 각 문장의 coverage가 100%, 정렬 실패가 0이고 평균 log-likelihood가 `L-3M` 이상이어야 그 언어를 평가한다. 하나라도 못 넘으면 행을 교체하지 않고 해당 언어와 H1을 `INCONCLUSIVE`로 기록한다.

## 분석기 사전 검증

### 오디오-입술 오프셋

SyncNet 원 구현 commit `907c0b579c2e2d83f0eae1b2ac9e720cde4e5623`과 `syncnet_v2.model` SHA-256 `961e8696f888fce4f3f3a6c3d5b3267cf5b343100b238e79b2659bff2c605442`를 사용한다. 입력은 FFmpeg 8.1.1로 최종 영상의 `ditto_region`을 자르고 BGR 224×224, 25fps CFR, 오디오는 mono PCM s16le 16kHz로 변환한다. 원 구현의 5영상프레임/20 MFCC프레임, `vshift=15`, batch 20을 바꾸지 않는다. 이 체크포인트는 본 실험에서 학습하거나 후보에 맞춰 조정하지 않는다. 각 MFA phone event의 midpoint를 중심으로 정확히 1,000ms 창을 만들고, 영상은 범위 밖에서 첫/끝 프레임 반복, 오디오는 0 sample로 채운다. SyncNet을 이 25프레임/1초 창에 독립 실행해 원 구현의 최소 distance가 되는 정수 frame offset을 고르고, 동률은 절대값이 작은 offset, 다시 동률이면 음수 offset을 택한다. event offset은 그 값×40ms이고 confidence는 원 구현의 median distance-minus-minimum-distance다.

- 실제 후보를 보기 전에 R 영상 8개에서 MFA 기준을 통과하고 앞뒤 500ms가 존재하는 모든 phone event 창에 오디오를 `-160,-120,-80,-40,0,40,80,120,160ms` 이동한 교정 표본을 만든다. 분석기가 비영 주입의 부호를 모든 event 창에서 맞히고 전체 오프셋 MAE 20ms 이하이면 사용한다.
- 하나라도 실패하면 후보 점수를 만들지 않고 `INCONCLUSIVE`로 종료한다.
- confidence 하한은 교정 표본 중 0ms event 창 confidence의 5 percentile로 후보 실행 전에 manifest에 고정한다. 유효 이벤트는 MFA 최종 기준 통과, 이 confidence 이상, phone midpoint 앞뒤 500ms가 원문 안에 존재하는 경우로 고정한다. 최종 p95는 이 독립 창의 event offset 절대값에서 언어별로 계산한다. 신뢰구간은 문장을 cluster 단위로 복원추출하고 선택된 문장의 모든 이벤트를 함께 넣는 percentile bootstrap 10,000회, seed `130013`, `[2.5%,97.5%]`로 고정한다.

### 경계 연속성

MediaPipe Tasks Python `0.10.21`, `face_landmarker.task` SHA-256 `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`로 전이 경계 전후 2프레임을 측정한다. LPIPS는 wheel `lpips==0.1.4` SHA-256 `fd537af5828b69d2e6ffc0a397bd506dbc28ca183543617690844c08e102ec5e`, v0.1 Alex linear weight SHA-256 `df73285e35b22355a2df87cdb6b70b343713b667eddbda73e1977e0c860835c0`, AlexNet weight SHA-256 `7be5be791159472b1fbf3c69796f7cb30dca7ad8466c2df70058c37116cdee02`로 고정한다.

경계 프레임을 `-2,-1,0,+1,+2`라 할 때 각 랜드마크 영역의 불연속은 원본 512 좌표에서 `||((p+2-p+1)-(p+1-p0))-((p0-p-1)-(p-1-p-2))||₂`의 점별 중앙값이다. 입 랜드마크는 `[61,146,91,181,84,17,314,405,321,375,291,308,324,318,402,317,14,87,178,88,95,78]`, 입 밖 얼굴 랜드마크는 `0..467`에서 이 집합을 뺀 값으로 고정한다. 머리 자세는 Face Landmarker의 facial transformation matrix 회전/이동에 같은 식을 적용한다. 픽셀 입 마스크는 각 프레임의 위 입 랜드마크 convex hull을 8px 팽창한 영역, 입 밖 얼굴 마스크는 얼굴 윤곽 `[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]`의 convex hull에서 입 마스크를 뺀 영역이다. 전체 헤드는 512×512 전부, 헤드 테두리는 그 사각형 안쪽 16px 띠다. 헤드-어깨 영역은 최종 720×1280 프레임의 `x=104..615,y=496..527` 512×32 띠다. 각 마스크의 RGB 절대차는 마스크 안 채널 절대차 평균이고, LPIPS 입력은 마스크 밖 RGB를 각 채널 127로 바꾼 전체 고정 사각형이다. 인접 프레임 LPIPS와 RGB 절대차의 경계 전후 차이를 기록한다. 좌표를 눈 거리로 정규화하거나 전체 머리 이동을 제거하지 않는다. 검출 실패 프레임은 제외하지 않고 해당 영상 실패로 센다.

각 랜드마크 영역 jerk, 자세 회전/이동 jerk, 픽셀 영역 LPIPS/RGB를 하나의 성분으로 본다. 합성법별 A의 전체 최종 경계에서 각 성분 중앙값 `M_j`를 먼저 계산하고, 경계별 `D=max_j(value_j/max(M_j,1e-6))`로 고정 집계한다. 후보의 `median(D)`가 대응 A의 `median(D)`보다 30% 이상 낮아야 한다. R 회귀는 모든 성분에서 `median(candidate_j) <= median(R_j)+0.10*M_j`와 `p95(candidate_j) <= p95(R_j)+0.20*p95(A_j)`를 동시에 만족해야 한다. 한 성분이라도 실패하면 자동 연속성 게이트 실패이며 유리한 영역만 고를 수 없다.

### 전체 영상 자연스러움 비교

최상위 품질 판정은 조각 점수 자체가 아니라 완성된 조합 영상과 R 전체 문장 Ditto 영상의 눈가림 쌍 비교다. ITU-T P.910의 통제된 시청 원칙을 따르는 아래 절차를 결과 생성 전에 고정한다.

- 정상 또는 교정 정상 시력·청력을 자기 확인하고 구현에 직접 참여하지 않은 성인 12명을 모집한다. 각 후보-문장 쌍은 서로 다른 평가자 5명이 본다. 탈락 평가자는 같은 조건의 새 평가자로 교체한다.
- A-W/A-F/A-L/B-W/B-F/B-L/C-W/C-F/C-L 9개 후보 × 80문장 = 720쌍을 R과 평가한다. 후보 이름, 기준 영상 여부와 좌우/선후 순서를 감추고 seed `130013`으로 균형 무작위 배정한다. 평가자별 배정의 10%를 동일한 숨은 반복 문항으로 넣는다. B/C의 사람 평가 결과에는 대응 A 대비 자연스러움 중앙값·선호·결함 차이도 함께 보고하지만, A보다 좋다는 사실만으로 절대 R 게이트를 대신할 수 없다.
- 1920×1080 이상 sRGB 화면, 50~70cm 거리, 이어폰/헤드폰, 브라우저 100% 배율에서 같은 얼굴, 몸 영상, 오디오, 720×1280, 25fps와 표시 크기를 사용한다. 두 영상을 각각 한 번 전체 재생한 뒤 필요하면 각 1회 재생할 수 있고 프레임 탐색은 금지한다.
- 입 크롭만 보여주지 않고 머리 전체와 어깨 접합부가 보이는 최종 합성 프레임을 재생한다.
- 각 영상의 전체 자연스러움과 음성-입술 일치를 각각 1(사용 불가)~5(구별하기 어려울 만큼 자연스러움)로 매기고, 더 자연스러운 영상 `왼쪽/차이 없음/오른쪽`을 고른다. 각 영상에 대해 `컷`, `머리 자세`, `시선/눈꺼풀`, `얼굴 내부 접합선`, `밝기`, `헤드-어깨 미끄러짐`, `기타` 결함을 복수 선택한다.
- 숨은 반복 문항의 3지선다 일치율이 70% 미만이거나 자연스러움 점수의 quadratic weighted kappa가 0.5 미만인 평가자는 전 행을 제외하고 교체한다. 한 세션은 교정·반복을 포함해 최대 60문항 또는 45분으로 제한하고 세션 사이 10분 이상 쉰다.
- 후보별·언어별 자연스러움 중앙값이 4 이상이어야 한다. `후보 선호 또는 차이 없음`은 성공 1, 각 결함 범주는 선택 1, 결함 합집합은 평가 행당 최대 1로 계산한다. 해당 후보·언어의 20개 clip ID와 실제 retained rater ID를 각각 복원추출하는 crossed cluster bootstrap 10,000회(seed `130013`)를 사용한다. 각 원시 행의 가중치는 그 행의 clip 복원 multiplicity × rater 복원 multiplicity이며 가중치가 0인 행은 제외한다. 선호 비율의 2.5 percentile이 0.70 이상, 각 결함 범주와 합집합 비율의 97.5 percentile이 0.10 이하, 자연스러움 가중 중앙값의 2.5 percentile이 4 이상이어야 한다. 같은 문장·같은 결함을 5명 중 2명 이상 선택하면 후보는 실패한다.
- W/F/L을 모두 R과 비교하되 H1의 제품 PASS는 F만 낼 수 있다. W는 F의 품질 손실을 보여주는 전체 머리 기준선이고 L은 접합 대조군이다.

### 자기복사 방지

- R 대비 점수는 품질 하한 비교일 뿐 성공의 단독 근거가 아니다.
- 알려진 시간 이동을 복원한 독립 오프셋 분석기, 랜드마크 경계 연속성, GPU 없는 실제 브라우저 재생을 모두 통과해야 한다.
- 최종 시각 증거는 후보 이름과 순서를 가린 전체 문장 영상 쌍으로 독립 적대 리뷰에 제공한다. 접촉 시트와 입 크롭만으로 판정하지 않는다. 자동 지표와 전체 영상 판정이 충돌하면 PASS가 아니라 `INCONCLUSIVE`다.

## 고정 재봉 규칙

방향성 단위는 정렬된 음소 경계의 `-80,-40,0,+40,+80ms` 5프레임으로 생성한다. 얼굴 유사변환으로 출력 픽셀을 정렬하지 않는다. 대신 앞 절의 동작 공간 규칙으로 머리 자세·이동·크기·눈·비입 표현을 소스 상태에 고정하고 첫/끝 입 표현을 해당 조음 기준 표현에 수치상 맞춘다. F는 이 재렌더와 단일 중립 프레임의 support 제한 차분 마스크만 저장한다. Player는 경계를 중심으로 5프레임을 놓고, 인접 경계의 창이 겹치면 두 경계 중간에서 잘라 정확히 2프레임 raised-cosine 교차 혼합한다. 남는 음소 구간은 현재 단위의 중앙 프레임을 유지한다. 할당 구간이 80ms보다 짧으면 playback rate를 최대 2배로 올린다. 그래도 40ms 미만이면 현재 전체 SpeechPlan에서 duration이 가장 짧은 이벤트를 하나 제거하고, 앞/뒤 이웃 중 duration이 긴 쪽의 단위로 합친다. 이벤트 duration 동률은 시간상 앞 이벤트를 먼저 제거하고, 이웃 duration도 동률이면 뒤 이웃으로 합친다. 문장 첫/끝 이벤트에 이웃이 하나뿐이면 그 이웃으로 합친다. 매 병합 뒤 경계를 다시 계산하고 모든 구간이 40ms 이상일 때 멈춘다. 정렬 confidence는 이 병합 순서에 사용하지 않으며 누락 confidence도 렌더 결과를 바꾸지 않는다. 이 규칙과 상수는 후보 결과를 본 뒤 조정하지 않는다.

## 브라우저와 성능

- 실행기: Google Chrome `151.0.7922.71-1`, Flatpak commit `6d2a1ec87367c1c5742f0dc129fe588d1f982abe2c50274d996f0031fc174662`, 하드웨어 가속 비활성화, 4 CPU 코어 제한, cold/warm 각 3회.
- 묶음 자산: `speech/atlas.bin`은 각 5프레임 VP9 WebM(`libvpx-vp9 -lossless 1 -pix_fmt yuva420p -g 1 -auto-alt-ref 0 -threads 1 -row-mt 0 -an`, 25fps, 모든 프레임 keyframe)을 unit-key UTF-8 오름차순으로 이어 붙인 바이트 파일이다. `speech/atlas-index.json` v1은 unit-key별 `{offset,length,sha256,frames:5,fps:25,codec:"vp09.00.10.08",lossless:true}`를 갖고 겹침/틈 없이 전체 atlas를 덮는다. `.nva` ZIP의 atlas entry는 STORE 방식이며 중앙 디렉터리와 entry data offset을 range로 먼저 읽는다. HTTP는 `Accept-Ranges: bytes`, 로컬 File은 `Blob.slice`; 각 WebM slice는 독립 Blob URL로 두 개의 미리 읽기 video element에서 번갈아 디코드한다. range 미지원 fallback은 전체 atlas를 받되 cold gate 예외를 주지 않는다.
- 첫 프레임: 완전한 SpeechPlan과 오디오/manifest가 Player API에 전달된 시각부터 합성된 첫 프레임 `requestVideoFrameCallback`까지. HTTP cache와 service worker를 비운 cold p95와 warm p95가 모두 250ms 이하여야 한다. atlas 전체를 먼저 받지 않고 첫 두 단위의 range만 읽는다. 네트워크 정렬 시간은 별도 서버 지표이며 이 값에서 숨기지 않고 함께 보고한다.
- RTF: 오디오 길이 대비 Player의 스케줄·디코드·합성 CPU wall time. warm p95가 0.5 이하여야 한다.
- 상태: 정상 완료, 명시 취소, 잘못된 unit, 자산 해시 오류, 120/240/480/720/960ms 끼어들기 뒤 시작 전 상태와 동일해야 한다.
- Jina의 4초 몸 영상은 디코드 프레임이 모두 동일하지만 런타임 정책은 일반 NVA와 같이 끝 프레임을 고정 유지한다. 발화가 4초를 넘더라도 몸 영상을 되감거나 반복 재생하지 않는다.

후보 생성 전 브라우저 preflight는 알파 0/128/255 픽셀을 가진 두 개의 5프레임 VP9 조각으로 실제 `atlas.bin/index`와 STORE ZIP fixture를 만든다. HTTP 206 range와 `File→Blob.slice` 양쪽에서 각 조각이 독립 Blob URL로 열리고, `requestVideoFrameCallback`이 250ms 안에 오며, canvas에서 세 알파 값의 절대 오차가 각각 8 이하이고, 두 video element로 100회 교대해 누락·decode error가 0이어야 한다. range 미지원 200 응답의 전체 다운로드 경로도 내용 해시 일치와 재생을 통과해야 한다. 하나라도 실패하면 후보를 만들지 않고 `INCONCLUSIVE`로 종료한다.

## 용량 모델

후보 실행 전에 각 단위의 프레임 수·해상도·코덱·키프레임 간격을 기록한다. B는 169개, C는 233개를 넘으면 방법 계약 위반이다. F는 중립 머리 1개와 알파 발화 atlas를 모두 합산한다. manifest·atlas·index를 합한 한 감정 상태 발화 자산의 실제 파일 합계가 100 MiB를 넘으면 실패다. W/L 용량도 비교 보고하지만 F PASS를 대신하지 않는다.

## 판정

H1 PASS는 `B-F` 또는 `C-F`가 아래 조건을 **후보별로 독립적으로** 모두 만족할 때만 가능하다. W/L 통과로 F 실패를 상쇄할 수 없다.

1. 교정된 분석기로 **각 언어**의 유효 이벤트 오프셋 p95와 bootstrap 95% 신뢰구간 상한이 모두 80ms 이하이다.
2. 고정 집계 `D`의 중앙값이 A-F보다 30% 이상 낮고, 모든 개별 성분의 R 대비 median/p95 회귀 상한을 지킨다.
3. 고정 SyncNet 분석기의 언어별 confidence 중앙값 `C`에 대해 `(C_R-C_candidate)/max(abs(C_R),1e-6) <= 0.10`이다. `C_R<=0`이거나 유효 confidence가 언어별 200개 미만이면 `INCONCLUSIVE`다. 오프셋 부호는 video가 audio보다 늦으면 양수로 고정한다.
4. 완전한 SpeechPlan 수신 뒤 cold와 warm 첫 프레임 p95가 각각 250ms 이하이고 warm p95 RTF가 0.5 이하이다.
5. 80개 최종 정상 종료와 모든 오류/취소/끼어들기 행에서 상태 복원이 100%다.
6. 한 상태 자산이 100 MiB 이하이고 B/C 단위 상한을 지킨다.
7. 출처·분석기·환경·원시 행이 완전하고, 위 눈가림 평가의 후보별·언어별 crossed cluster bootstrap 구간과 평가자 일관성 기준을 모두 통과하며 반복 가능한 차단 결함이 없다.

B-F가 실패하고 C-F가 통과하면 C-F를 선택한다. 둘 다 실패하면 F를 제품 엔진으로 구현하지 않는다. H1이 통과하면 같은 표현·문턱을 유지한 Naia 비인간형 H2를 별도 선등록한다. 분석기나 정렬이 준비되지 않으면 `INCONCLUSIVE`로 기록한다.
