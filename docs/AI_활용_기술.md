# STATE//LESS AI 활용 기술 문서

## 1. AI 활용 개요

개발 보조 도구로 **OpenAI Codex**를 사용했습니다. AI는 게임 콘셉트 구체화, 프론트엔드 구현, 게임 로직 테스트, 접근성 점검, 문서 초안 작성에 활용했습니다. 최종 요구 방향은 참여자가 직접 제시했으며, AI가 제안한 초기 아케이드 콘셉트는 참여자의 피드백에 따라 폐기하고 메타 퍼즐로 다시 설계했습니다.

런타임 게임 자체는 외부 생성형 AI API를 호출하지 않습니다. 심사 환경에서 API 키, 비용, 응답 지연, 네트워크 장애에 의존하지 않도록 브라우저 상태와 결정적 규칙으로 “로컬 AI 추론”을 구현했습니다.

## 2. 주요 프롬프트와 반영 내역

### 최초 요구

> 사전과제 폴더 안의 내용을 확인하고, 사전과제 안에 게임 작업을 완료해보자. 내가 원하는 요소는 키보드 혹은 마우스로만 플레이 가능하고 웹으로 서비스되는 것 하나뿐이다.

반영 내용:

- 정적 웹 빌드로 구현
- 키보드 전용 경로와 마우스 전용 경로를 각각 제공
- 시작, 본 플레이, 결말 선택, 재시작까지 어느 한 입력 장치만으로 완주 가능
- GitHub Pages 자동 배포 워크플로 포함

### 기술 방향 피드백

> 최근 AI에 나타난 프론트엔드 특이점, 특히 Pretext 등을 이용해서 메타적(쿠키 상태)인 게임은 어떨까. 그 외에도 최신 기술을 다루면 좋겠다.

반영 내용:

- 2026년 공개된 Pretext를 실제 게임 보드의 텍스트 배치 엔진으로 사용
- 1st-party 쿠키의 방문 횟수와 이전 결말을 서사 및 문제 생성에 사용
- Cookie Store API, View Transition API, Page Visibility API, BroadcastChannel, ResizeObserver, CSS Container Queries를 장식이 아닌 게임 상태와 상호작용에 연결
- 개인정보나 다른 출처의 쿠키를 읽지 않는 로컬 전용 구조 채택

## 3. AI가 지원한 구현 영역

### 기획

- HTTP의 무상태성과 쿠키의 상태성을 핵심 모순으로 설정
- 실제 브라우저 텔레메트리와 AI 문장의 모순을 찾는 6라운드 게임 루프 설계
- 재방문, 탭 이탈, 복수 탭 감지를 메타 서사로 연결

### 개발

- Vite 기반 정적 웹 프로젝트 구성
- 키보드 로빙 포커스와 포인터 선택 구현
- 제한 시간, 연속 정답 보너스, 무결성, 랭크 판정 구현
- Cookie Store 비동기 저장과 `document.cookie` 폴백 구현
- Pretext rich-inline API를 이용한 문장 칩 배치 구현
- 외부 파일 없는 Web Audio 효과음 구현
- GitHub Pages Actions 워크플로 작성

### 검증

- 라운드마다 정확히 하나의 거짓만 존재하는지 테스트
- 동일 상태와 시드에서 같은 문제가 생성되는지 테스트
- 점수·난이도·결말 경계값 테스트
- 쿠키 데이터 직렬화 시 허용 필드만 보존되는지 테스트
- 프로덕션 빌드와 실제 브라우저 입력 경로 점검

## 4. 핵심 기술 구조

### Pretext 기반 게임 보드

`@chenglou/pretext/rich-inline`의 `prepareRichInline()`과 `walkRichInlineLineRanges()`로 세 문장의 실제 폭과 줄바꿈을 계산합니다. 각 문장은 `break: "never"`인 원자적 칩이며, Pretext가 계산한 위치에 버튼을 절대 배치합니다.

이 방식은 문장 높이를 알아내기 위해 `getBoundingClientRect()`로 각 텍스트를 반복 측정하지 않습니다. 컨테이너 폭이 바뀌면 `ResizeObserver`가 제공한 폭을 이용해 순수 계산으로 다시 배치합니다.

### 쿠키 상태 모델

단일 쿠키 `state_less_memory_v1`에 다음 화이트리스트 필드만 저장합니다.

```json
{
  "version": 1,
  "visits": 1,
  "runs": 0,
  "bestScore": 0,
  "lastEnding": null,
  "policy": "session"
}
```

값은 읽은 뒤 형식·범위·허용 열거형을 다시 검증합니다. 최신 보안 컨텍스트에서는 이벤트 루프를 막지 않는 Cookie Store API를 우선 사용하고, 미지원 브라우저에서는 `SameSite=Strict`인 `document.cookie`로 전환합니다.

### 결정적 로컬 추론

방문·테마·시간·입력·탭·화면 폭·네트워크·이전 결말 등의 사실마다 참 문장과 거짓 문장을 한 쌍으로 정의합니다. 세션 시드로 사실을 섞고 매 라운드 하나만 거짓으로 치환합니다. 같은 상태와 시드는 같은 문제를 만들므로 테스트와 재현이 가능합니다.

## 5. 외부 에셋과 오픈소스

| 항목 | 용도 | 버전 | 라이선스·출처 |
|---|---|---:|---|
| `@chenglou/pretext` | 텍스트 측정 및 rich-inline 배치 | 0.0.8 | MIT, <https://github.com/chenglou/pretext> |
| Vite | 개발 서버와 프로덕션 번들 | 8.2.0 | MIT, <https://github.com/vitejs/vite> |
| OpenAI Codex | 개발 보조 | 사용 환경 제공 버전 | <https://openai.com/codex/> |

외부 이미지, 아이콘, 음원, 영상, 폰트 파일은 사용하지 않았습니다. 화면 그래픽은 HTML/CSS로, 효과음은 Web Audio API로 실시간 생성합니다.

## 6. 검증 명령

```bash
npm test
npm run build
```

`npm test`는 게임 규칙과 쿠키 직렬화 테스트를 실행합니다. `npm run build`는 GitHub Pages에 배포할 `dist/` 정적 파일을 생성합니다.
