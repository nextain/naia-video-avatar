# 이슈 13: Naia 14개 언어 발화 커버리지 계획

## 1. 목표와 완료선

Naia Shell의 공식 로케일 `ko`, `en`, `ja`, `zh`, `fr`, `de`, `ru`, `es`, `ar`,
`hi`, `bn`, `pt`, `id`, `vi`를 하나의 언어 중립 NVA 발화 계약으로 재생할 수 있는지
측정한다. VoxCPM2는 30개 언어 음성을 생성하는 서버 공급자이며, NVA Player의 내부
식별자는 언어명이 아니라 `issue-13-phone-map.json`의 13개 공통 조음 단위다.

이번 실행의 완료선은 다음 두 질문을 분리해 답하는 것이다.

1. 14개 언어의 문장이 현재 Ditto W(문장 전체)와 C(광학 흐름 창 조합) 경로에서 실제로
   생성·재생되는가?
2. 한국어와 영어에서 확보한 13개 공통 조음 단위가 각 언어의 IPA(국제음성기호) 열을
   얼마나 빠짐없이 표현하는가?

W/C 창은 아직 재사용 가능한 NVA 발화 아틀라스가 아니다. 따라서 W/C 성공을 “Ditto 없이
14개 언어가 완성됐다”는 증거로 사용하지 않는다. 이번 결과는 다국어 입력 상한과 추가 단위
후보를 정하는 선행 실험이다.

## 2. 고정 언어 행렬

### 제품 집합과 VoxCPM2 상한

언어 수는 공급자와 제품을 섞어 세지 않는다.

| 집합 | 수 | 언어 |
|---|---:|---|
| Naia 공식 로케일 | 14 | Korean, English, Japanese, Chinese, French, German, Russian, Spanish, Arabic, Hindi, Bengali, Portuguese, Indonesian, Vietnamese |
| VoxCPM2 공식 지원 | 30 | Arabic, Burmese, Chinese, Danish, Dutch, English, Finnish, French, German, Greek, Hebrew, Hindi, Indonesian, Italian, Japanese, Khmer, Korean, Lao, Malay, Norwegian, Polish, Portuguese, Russian, Spanish, Swahili, Swedish, Tagalog, Thai, Turkish, Vietnamese |
| 현재 제품·공급자 교집합 | 13 | Naia 14개 언어 중 Bengali 제외 |
| Naia에만 있음 | 1 | Bengali |
| VoxCPM2에만 있음 | 17 | Burmese, Danish, Dutch, Finnish, Greek, Hebrew, Italian, Khmer, Lao, Malay, Norwegian, Polish, Swahili, Swedish, Tagalog, Thai, Turkish |
| 두 집합의 합집합 | 31 | 향후 공급자 폴백까지 포함한 NVA 엔진의 최대 검토 집합 |

이번 실행은 실제 제품 계약인 Naia 14개 언어를 우선한다. 다음 확장 실행은 VoxCPM2 전용
17개 언어를 같은 방식으로 추가해 30개 공급자 언어 전체를 측정한다. Bengali는 별도 TTS
공급자를 결합해 합집합 31개 언어까지 검토할 수 있지만, 이를 Naia 공식 지원 언어로 자동
승격하지 않는다.

확장 순서는 다음과 같다.

1. 17개 추가 언어의 고정 문장·IPA 규칙 커버율을 측정한다.
2. 미등록 음소를 기존 단위와 임의로 합치지 않고 사람 입 모양 차이를 검토한다.
3. 민호 W/C 영상으로 17개 언어의 영상 경로를 확인한다.
4. 30개 전체에서 통과한 뒤에만 VoxCPM2 공급자 상한을 NVA 검증 상한으로 확장한다.
5. Bengali 폴백을 사람 청취로 승인하면 별도 31번째 공급자 조합으로 기록한다.

기계 실행 정본은 `issue-13-fourteen-language-fixture.json`이다. 아래 표는 같은 내용을 사람이
검토하기 위한 미러다.

| 로케일 | eSpeak NG 음성 | 시험 문장 |
|---|---|---|
| ko | ko | 안녕하세요. 빠르게 변하는 바람과 밝은 표정을 자연스럽게 이어서 보여 드리겠습니다. |
| en | en-us | Hello. Five brave travelers quickly viewed the bright world and spoke with warm voices. |
| ja | ja | こんにちは。静かな朝に、明るい表情で素早く言葉をつないで話します。 |
| zh | cmn | 你好。清晨的微风轻轻吹过，我们用自然的表情快速说完这句话。 |
| fr | fr-fr | Bonjour. Cinq voyageurs parlent clairement avec des voix vives et des expressions naturelles. |
| de | de | Guten Tag. Fünf Reisende sprechen zügig mit klarer Stimme und natürlichem Ausdruck. |
| ru | ru | Здравствуйте. Пять путешественников говорят быстро, ясно и с естественным выражением. |
| es | es | Hola. Cinco viajeros hablan rápido y con claridad, usando voces y gestos naturales. |
| ar | ar | مرحبًا. يتحدث خمسة مسافرين بسرعة ووضوح مع أصوات دافئة وتعابير طبيعية. |
| hi | hi | नमस्ते। पाँच यात्री तेज़ और स्पष्ट आवाज़ में स्वाभाविक भाव के साथ बोलते हैं। |
| bn | bn | নমস্কার। পাঁচজন যাত্রী দ্রুত ও স্পষ্ট কণ্ঠে স্বাভাবিক অভিব্যক্তিতে কথা বলেন। |
| pt | pt | Olá. Cinco viajantes falam depressa e com clareza, usando vozes e expressões naturais. |
| id | id | Halo. Lima pelancong berbicara cepat dan jelas dengan suara serta ekspresi yang alami. |
| vi | vi | Xin chào. Năm du khách nói nhanh và rõ ràng với giọng ấm cùng biểu cảm tự nhiên. |

문장은 번역 품질 평가용 말뭉치가 아니다. 입 벌림, 원순, 폐쇄, 치·입술 마찰과 빠른 전환을
한 번에 포함시키기 위한 고정 스모크 입력이다. 텍스트는 결과를 본 뒤 바꾸지 않는다.

## 3. 실행과 증거

대표 입력은 현재 사람형 기준을 통과한 민호 NVA다. 모든 언어에 같은 NVA, 같은 VoxCPM2
참조 음성, Ditto 서비스 revision, 25fps, 240ms 전환, C `flow_tween`, 문장 전역 눈 깜빡임
주기 90프레임·위상 35프레임을 사용한다.

각 언어에 대해 다음 증거를 남긴다.

- 원문, eSpeak 원본 IPA, 정규화된 13단위 열과 알 수 없는 음소
- VoxCPM2 응답 성공, 생성 시간, 오디오 길이와 SHA-256
- W 영상, C 영상, W/C 정상 속도 비교 영상과 SHA-256
- 경계 추가 변화 평균·최대, 발화 영역과 머리/몸 영역 SSIM
- 영상 전체 디코딩 성공 여부

## 4. 커버리지와 품질 판정

**조음 단위 커버율**은 `매핑된 IPA 토큰 수 / 전체 IPA 토큰 수`다. 토큰과 고유 토큰을
각각 보고한다. 알 수 없는 음소를 다른 단위에 임의로 넣지 않는다.

**영상 경로 통과**는 아래 조건을 모두 만족해야 한다.

- VoxCPM2·W·C 생성과 전체 디코딩 성공
- `body_outside_head` SSIM 0.995 이상
- 경계 추가 변화 평균 0.05 이하: 자동 통과
- 0.05 초과 0.10 이하: 사람 확대 확인
- 0.10 초과: 승인 보류

경계 문턱은 민호 한국어 기준값 0.0331을 바탕으로 한 선행 실험용 값이다. 최종 제품 문턱은
사람 눈가림 평가와 실제 재사용 아틀라스 결과로 다시 잠근다. SSIM과 전환 수치는 자연스러움의
대체물이 아니므로 자동 통과 뒤에도 정상 속도 사람 확인을 거친다.

### 실행 중 추가한 진단

영상 생성 성공만으로 TTS 발음 정확도를 알 수 없어 생성 완료 뒤 Whisper large-v3 역전사를
추가했다. 이 검사는 위 원계획에 사전 등록된 합격 기준이 아니며, 공급자 결함을 영상 엔진
결함과 구분하는 보조 진단으로만 사용한다. 결과를 본 뒤 최종 제품 문턱으로 승격하지 않는다.

## 5. 결정 규칙과 다음 단계

- 14개 언어 모두 13단위 토큰 커버율 100%: 공통 단위 목록을 유지한다.
- 일부 언어에 미등록 IPA가 있으나 기존 단위와 시각적으로 동등: phone-map만 근거와 함께 확장한다.
- 입술·치아·혀 모양이 기존 단위와 시각적으로 다름: 언어 분기가 아니라 공통 조음 단위를 추가한다.
- VoxCPM2만 실패: NVA 결함이 아니라 TTS 공급자 결함으로 분리한다.
- W는 정상이나 C만 실패: 해당 언어 문제가 아니라 창 길이·전환 방식 결함으로 분리한다.

이 실행 뒤에는 한국어+영어에서 만든 실제 재사용 전이/문맥 아틀라스로 같은 14개 문장을
Ditto 재생성 없이 렌더한다. 그 결과가 W 기준과 사람 평가를 통과해야 “한 번 생성한 자산으로
Naia 14개 언어 지원”을 선언할 수 있다.

실행 결과는 [`issue-13-fourteen-language-coverage-result.md`](issue-13-fourteen-language-coverage-result.md)에 기록한다.
