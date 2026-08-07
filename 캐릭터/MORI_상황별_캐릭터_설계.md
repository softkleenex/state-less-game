# MORI 상황별 캐릭터 설계와 편집 프롬프트

## 제작 목표

MORI를 일반적인 사이버펑크 AI 소녀가 아니라, `MEMORY:// LOCAL ARCHIVE`에서 한 출처의 세션만 검증하는 **로컬 세션 검증 데몬**으로 보이게 한다.

현재 PNG는 UI 배치를 검증하기 위한 임시 기준 이미지다. 최종 캐릭터는 아래 설계로 새 모델 기준표를 확정한 뒤 교체한다.

프롬프트만으로 “AI가 만든 티”를 완전히 없앨 수는 없다. 일관된 기준 원본, 부분 마스킹 편집, 마지막 수동 선화 정리를 한 제작 과정으로 묶어야 한다.

## 캐릭터 한 문장

**컴퓨터와 색인 정리를 좋아해 장난스럽게 말을 거는 20대 초반의 흑발 세션 검증 데몬. 플레이어가 페이지를 떠나거나 자신을 지우려 할 때만 조용한 집착이 드러난다.**

## UI에서 가져온 디자인 언어

- 검은 일지 바탕: 머리카락, 카디건, 바지
- 밝은 종이: 목이 올라오는 이너와 인덱스 카드
- cyan 색인선: 실 한 줄, 펜촉, 눈동자의 아주 작은 반사광
- amber 보존 표시: `]` 모양 머리핀과 소매의 한 땀
- rose 정정 표시: 오답·불안정 상태에서만 등장하는 붉은 연필 자국
- emerald 검수 표시: 정답·검증 완료 상태에서만 작은 체크 표시

정확한 기준색은 게임 CSS와 맞춘다.

| 역할 | 색상 |
|---|---|
| 가장 어두운 잉크 | `#020617` |
| 의상 잉크 | `#0f172a`, `#1e293b` |
| 종이 | `#e2e8f0`, `#f1f5f9` |
| 색인 cyan | `#67e8f9` |
| 보존 amber | `#fcd34d` |
| 정정 rose | `#fb7185` |
| 검수 emerald | `#6ee7b7` |

## 고정 외형

### 실루엣

- 성인 여성, 20대 초반으로 명확하게 보이는 신체 비례
- 한쪽에 체중을 둔 편한 3/4 자세
- 턱선에서 어깨까지 길이가 불규칙한 검은 레이어드 헤어
- 오른쪽 얼굴 옆에만 조금 더 긴 한 갈래를 남겨 멀리서도 알아볼 수 있게 함
- 발광 회로, 전투복, 고양이 귀, 교복 실루엣은 사용하지 않음

### 얼굴

- 가늘고 차분한 눈, 낮고 자연스러운 눈썹
- 아주 옅은 눈 밑 그림자로 밤새 일지를 정리한 인상
- 기본 표정은 입꼬리가 한쪽만 조금 올라간 장난스러운 미소
- 눈을 과도하게 크게 그리거나 유리구슬처럼 여러 겹 하이라이트를 넣지 않음
- 피부에 에어브러시 광택과 홍조 그라데이션을 사용하지 않음

### 머리와 식별점

- 청색광이 없는 순수한 흑발, 한 덩어리 큰 명암과 소수의 선만 사용
- amber 색 `]` 모양 머리핀 하나만 사용
- 생성할 때마다 머리핀 수·위치·모양이 바뀌면 실패로 판정

### 복장

- 종이색 하이넥 이너
- 잉크색의 약간 큰 니트 카디건 또는 작업 재킷
- 가슴과 허리 쪽에 인덱스 카드가 들어가는 납작한 포켓 두 개
- 성인 작업복 인상을 주는 하이웨이스트 와이드 팬츠와 낮은 가죽 작업화
- cyan 실 한 줄과 amber 손바느질 한 곳만 포인트로 사용
- 의미 없는 버클, 지퍼, 스트랩, 전술 장비를 추가하지 않음

### 소품

- 글자가 없는 종이색 인덱스 카드
- rose 색 교정 연필
- 투명한 cyan 기억 조각

상황마다 위 세 소품 중 하나만 쓴다. 가짜 글자와 랜덤 UI 기호가 생기기 쉬우므로 카드에는 읽을 수 있는 문장을 넣지 않는다.

## 그림체 규칙: AI 인상을 줄이는 핵심

- 홍보용 일러스트가 아니라 **손으로 그린 2D 애니메이션 설정화와 편집 삽화의 중간**을 목표로 한다.
- 선 굵기는 원본 기준 2~4px 사이에서 의도적으로 변한다.
- 머리카락과 옷 주름을 수백 개 그리지 않고 큰 형태와 필요한 선만 남긴다.
- 명암은 한 방향의 단단한 셀 셰이딩 한 단계만 사용한다.
- 하이라이트는 머리, 눈, 옷에 각각 하나 이하로 제한한다.
- 좌우 얼굴과 옷 주름을 완벽히 대칭으로 만들지 않는다.
- 선 끝의 작은 겹침은 허용하지만 손가락 오류나 액세서리 변화는 허용하지 않는다.
- 하프톤과 종이 질감은 캐릭터 원본에 굽지 않고 UI의 CSS 처리로 적용한다.

## 자산 규격

### 모델 기준표

- 캔버스: 2048×3072px, 세로 2:3
- 형식: PNG RGBA, sRGB, 투명 배경
- 구도: 전신 3/4, 머리와 신발이 모두 보임
- 여백: 외곽 8~10%
- 저장 예정 경로: `/Volumes/samsd/workspace_v2/NHN2026/사전과제/캐릭터/images/master/mori_model_v01.png`

### 상황별 흉상

- 캔버스: 1600×1600px 정사각형
- 형식: PNG RGBA, sRGB, 투명 배경
- 구도: 가슴 위, 몸은 화면 기준 왼쪽 15도, 얼굴 중심 좌표를 모든 파일에서 고정
- 손과 소품이 필요하면 어깨 아래를 조금 포함하되 캔버스를 바꾸지 않음
- 웹용: 800×800px WebP alpha, 파일당 목표 300KB 이하
- 저장 예정 폴더: `/Volumes/samsd/workspace_v2/NHN2026/사전과제/캐릭터/images/states/`

## 상황별 상태표

| 코드 상태 | 파일명 | 상황 | 표정·행동 | 강조색 |
|---|---|---|---|---|
| `boot-empty` | `mori_boot-empty.webp` | 첫 방문, 기억 없음 | 빈 카드를 내려다보다 플레이어를 발견한 호기심 | cyan |
| `return-found` | `mori_return-found.webp` | 재방문 | 이미 알고 있다는 작은 옆미소, 카드 모서리를 두드림 | amber |
| `observing` | `mori_observing.webp` | 문제 풀이 중 | 교정 연필을 가볍게 든 중립 집중 표정 | cyan |
| `answer-correct` | `mori_answer-correct.webp` | 정답 | 한쪽 입꼬리가 올라가고 작은 검수 카드 제시 | emerald |
| `sync-linked` | `mori_sync-linked.webp` | 2연속 이상 정답 | 장난기가 조금 더 드러난 미소, cyan 조각을 플레이어 쪽으로 기울임 | emerald + cyan |
| `directive-complete` | `mori_directive-complete.webp` | `MORI REQUEST` 완료 | 약속한 보너스 카드를 일지에 봉인하는 만족스러운 반쪽 미소 | emerald + amber |
| `sync-recovery` | `mori_sync-recovery.webp` | 실수 뒤 3연속 정답 | 다친 색인 카드를 펴고 emerald 실로 다시 묶어 플레이어에게 돌려줌 | emerald + amber |
| `answer-wrong` | `mori_answer-wrong.webp` | 오답 | 미소가 사라지고 구겨진 카드 가장자리를 잡음 | rose |
| `lens-used` | `mori_lens-used.webp` | ARCHIVE LENS 사용 | 잘라낸 거짓 카드 한 장을 옆으로 치움 | amber |
| `deep-verify` | `mori_deep-verify.webp` | DEEP VERIFY 활성 | 플레이어를 똑바로 보며 amber 탭 카드 한 장을 내미는 도발적인 반쪽 미소 | amber + rose |
| `time-critical` | `mori_time-critical.webp` | 5초 이하 | 시선이 날카로워지고 rose 연필을 선택지 쪽으로 겨눔 | rose |
| `tab-left` | `mori_tab-left.webp` | 탭을 떠났다가 돌아옴 | 시선을 정면에 고정, 접힌 보존 카드를 쥠 | amber + rose 소량 |
| `other-self` | `mori_other-self.webp` | 같은 페이지가 다른 탭에도 열림 | 옆을 경계하며 겹친 카드 두 장을 확인 | amber |
| `core-final` | `mori_core-final.webp` | 마지막 6라운드 진입 | 플레이어와 정면으로 시선을 맞추고 봉인 직전의 일지 카드를 함께 붙듦 | amber + rose |
| `result-verified` | `mori_result-verified.webp` | 검증 결말 | 긴장이 풀린 미소, 기억 조각을 카드 포켓에 보관 | emerald |
| `result-unstable` | `mori_result-unstable.webp` | 불안정 결말 | 피곤한 눈, rose 연필 자국이 묻은 카드 | rose |
| `archive-complete` | `mori_archive-complete.webp` | 6조각 완성 | 처음으로 경계 없는 미소, 닫힌 일지를 양손에 듦 | cyan + amber |

총 17개 상태를 제작한다. 첫 제작에서는 전신 1장과 `observing`, `deep-verify`, `core-final`, `time-critical`, `answer-correct`, `sync-linked`, `directive-complete`, `sync-recovery`, `answer-wrong`, `result-verified`, `result-unstable` 흉상 11장을 만든다. 한 런에서 가장 자주 보이는 상태의 일관성을 먼저 확인한 뒤 나머지 6장을 제작한다.

## 1단계: 모델 기준표 생성 프롬프트

아래 영어 프롬프트를 웹 이미지 생성기에 사용한다. 한 번에 여러 상황을 요구하지 말고 모델 기준표 한 장만 만든다.

```text
Create a production character model image for an original adult woman named MORI, the local memory archivist daemon in the web game STATE//LESS. She is clearly in her early twenties. This is a restrained character design sheet image, not splash art and not a promotional poster.

Art direction: hand-inked 2D animation key drawing combined with a limited-color editorial archive print. Use confident but slightly irregular human linework, 2–4 px line-weight variation at 2048 px width, flat colors, one hard cel-shadow shape, and almost no soft gradients. Keep details intentionally economical. Avoid perfect facial symmetry and avoid glossy rendering.

Silhouette: relaxed three-quarter standing pose with weight on one leg; uneven layered black hair from jaw to shoulder, with one longer lock beside the right side of her face. One small amber right-bracket-shaped hairpin, always on the same side.

Face: narrow calm eyes, natural low eyebrows, a very subtle tired shadow under the eyes, and a restrained mischievous half-smile. Adult facial proportions, not childlike.

Clothing: paper-white high-neck inner shirt, oversized ink-charcoal archive work cardigan with two flat index-card pockets, high-waisted charcoal wide trousers, low practical leather work shoes. Add only one thin cyan binding-thread detail and one amber visible repair stitch. No glowing circuits and no tactical equipment.

Prop: one blank warm-white index card with no writing, logo, symbol, or pseudo-text.

Palette must stay close to #020617, #0f172a, #1e293b, #e2e8f0, #f1f5f9, #67e8f9, and #fcd34d. Transparent background, RGBA, sRGB. Full body from hair to shoes, 2:3 vertical canvas, 8–10 percent empty margin, one character only.
```

### 공통 네거티브 프롬프트

```text
generic cyberpunk girl, neon circuit hoodie, hologram, tactical straps, school uniform, childlike body, huge glossy eyes, plastic skin, airbrushed face, photorealism, 3D render, painterly splash art, excessive hair strands, excessive clothing folds, rim light, bloom, random jewelry, multiple hair clips, asymmetrical accessory changes, unreadable text, pseudo-lettering, logo, watermark, background scene, cropped feet, extra fingers, merged fingers, broken hands, duplicate props
```

## 2단계: 기준 흉상 만들기

선택한 모델 기준표를 참조 이미지로 첨부하고 `observing` 흉상을 먼저 만든다. 이 흉상이 모든 상황 편집의 직접 원본이다.

```text
Use the attached approved MORI model as a locked character reference. Create one square chest-up production portrait for the in-game state slot. Preserve the exact facial proportions, eye spacing, nose, mouth, jaw, hair contour, right-side amber bracket hairpin, clothing seams, palette, line weight, and shadow direction. Do not redesign or beautify her.

MORI is quietly observing a browser memory audit. Her mouth is neutral with the faintest one-sided amusement. She holds one rose correction pencil loosely near the bottom edge. Transparent background. 1600x1600 RGBA. Keep the face center and shoulder crop suitable for identical overlay with future expression edits.
```

## 3단계: 상황별 마스킹 편집 공통문

`observing` 흉상을 첨부하고 얼굴의 눈썹·눈·입, 필요한 손과 소품 영역만 마스킹한다. 전체 그림 재생성은 금지한다.

```text
Edit the attached locked MORI portrait. This is a masked production edit, not a new illustration. Preserve all unmasked pixels. Keep the exact face landmarks, head angle, hair silhouette, amber bracket hairpin position, clothing outline, line art, palette, crop, canvas, and lighting. Change only the requested expression, hand gesture, and single prop. Do not add details or polish the rendering.

[STATE CHANGE]

Transparent background. No text, logo, UI, scenery, glow, or extra accessory.
```

### `[STATE CHANGE]` 교체문

- `boot-empty`: `She looks down at one completely blank index card, then raises her eyes toward the viewer with cautious curiosity. Her shoulders remain open and relaxed.`
- `return-found`: `She recognizes the viewer. Add a restrained knowing half-smile and have one fingertip tap the corner of an index card with three simple tally notches, not text.`
- `answer-correct`: `Her mischievous half-smile becomes slightly clearer. She presents one small card bearing only a simple emerald check mark.`
- `sync-linked`: `Her restrained smile opens only slightly and her shoulders lean a few degrees toward the viewer. She tilts one small translucent cyan memory shard toward the viewer as if both are reading the same record.`
- `directive-complete`: `She seals the promised bonus card into one charcoal archive ledger with a single emerald check mark and one amber binding tab. Her restrained half-smile shows quiet satisfaction, as if a pact has been honored. No writing or extra symbol.`
- `sync-recovery`: `She carefully smooths one previously creased index card and reconnects its split binding with one simple emerald stitch. She returns the repaired card toward the viewer with a relieved but restrained smile. Add one small amber recovery tab, no text.`
- `answer-wrong`: `Her smile disappears. Her eyes look quietly hurt rather than angry. One hand grips the creased edge of a card with a single rose correction stroke.`
- `lens-used`: `She calmly moves one rejected blank card out of the working stack with two fingers. A single amber diagonal retention mark appears on that card; no text or extra symbol.`
- `deep-verify`: `She meets the viewer's eyes with a restrained, challenging half-smile and offers one blank index card with a single amber edge tab. Her other hand stays out of frame. Add one short rose correction stroke near the card edge, no text or extra symbol.`
- `time-critical`: `Her eyes sharpen and her posture leans forward by only a few degrees. She points the rose correction pencil toward the unseen choices with controlled urgency, not panic.`
- `tab-left`: `She holds eye contact without smiling, chin raised by only a few degrees. Her hand holds one folded amber retention card a little too tightly. The mood is restrained possessiveness, never horror or violence.`
- `other-self`: `Her eyes shift to the side with guarded suspicion. She compares two overlapping blank index cards. Keep her mouth closed and composed.`
- `core-final`: `She meets the viewer's eyes with calm concentration and leans forward by only a few degrees. Both hands hold the opposite edges of one charcoal archive card as if she and the viewer are about to seal it together. Add one amber edge tab and one short rose correction line, with no writing or extra symbol.`
- `result-verified`: `Her shoulders soften and she gives a small genuine smile. She places one cyan translucent memory shard into the archive pocket.`
- `result-unstable`: `She looks tired and disappointed, not monstrous. A small rose pencil smudge appears on one card and one loose hair strand crosses her cheek.`
- `archive-complete`: `For the first time her expression is fully unguarded but still subtle. She holds one closed charcoal archive ledger with both hands; six tiny cyan index tabs and one amber binding stitch are visible, with no writing.`

## 생성 순서

1. 모델 기준표 후보는 최대 3장만 생성한다.
2. 얼굴보다 실루엣·머리핀·포켓·신발이 설계와 일치하는 후보를 고른다.
3. 선택본의 손가락, 머리핀, 옷 선을 수동으로 먼저 고친다.
4. 수정된 한 장을 이후 모든 생성의 유일한 기준 이미지로 사용한다.
5. `observing` 흉상을 확정한다.
6. 상황별 이미지는 한 번에 한 장씩, 마스크 편집으로 만든다.
7. 50% 투명도로 겹쳐 얼굴 위치와 외곽선이 흔들리지 않는지 검사한다.
8. 수동 정리 후 PNG 원본과 WebP 최적화본을 별도로 내보낸다.

## 수동 마무리 체크리스트

Photopea, Krita, Affinity Photo 등 레이어 편집이 가능한 도구에서 확인한다.

- [ ] 모든 흉상의 눈·코·입·턱 좌표가 기준본에서 눈에 띄게 움직이지 않았다.
- [ ] 머리핀 위치, 개수, `]` 모양이 동일하다.
- [ ] 머리카락 덩어리와 긴 옆머리 실루엣이 동일하다.
- [ ] 포켓, 봉제선, 소매 길이와 색상 샘플이 동일하다.
- [ ] 손가락 수와 관절이 자연스럽다.
- [ ] 카드에 가짜 글자나 읽히지 않는 기호가 없다.
- [ ] 눈과 피부의 과도한 하이라이트를 지웠다.
- [ ] 랜덤하게 생긴 액세서리와 옷 주름을 지웠다.
- [ ] 한 단계 셀 그림자 방향이 모든 파일에서 같다.
- [ ] 알파 가장자리에 흰 테두리나 색 번짐이 없다.
- [ ] 파일을 빠르게 넘겼을 때 캐릭터가 흔들리지 않고 표정만 바뀐다.

## 게임 연결 규칙

현재 코드는 다음 상태 문자열을 이미 노출한다.

```text
boot-empty
return-found
observing
time-critical
answer-correct
sync-linked
directive-complete
sync-recovery
answer-wrong
lens-used
deep-verify
tab-left
other-self
core-final
result-verified
result-unstable
archive-complete
```

상황별 WebP가 준비되면 이 상태와 파일명을 매핑해 인트로·플레이·결말 슬롯의 `src`만 바꾼다. 이미지가 준비되기 전에는 현재 기본 이미지가 그대로 폴백되어 게임이 깨지지 않는다.
