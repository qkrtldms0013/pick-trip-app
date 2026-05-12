# 기여 가이드 (Contributing Guide)

Pick Trip App에 기여해주셔서 감사합니다!
이 문서는 프로젝트에 처음 참여하는 팀원을 위해 작성되었습니다.
개발 환경 설정부터 PR 제출까지 단계별로 안내합니다.

---

## 목차

1. [프로젝트 기술 스택](#1-프로젝트-기술-스택)
2. [개발 환경 설정](#2-개발-환경-설정)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [브랜치 전략](#4-브랜치-전략)
5. [커밋 메시지 규칙](#5-커밋-메시지-규칙)
6. [코드 스타일](#6-코드-스타일)
7. [Pull Request 가이드](#7-pull-request-가이드)
8. [이슈 작성 가이드](#8-이슈-작성-가이드)

---

## 1. 프로젝트 기술 스택

| 분류          | 기술                     |
| ------------- | ------------------------ |
| 언어          | TypeScript ~5.9.2        |
| 프레임워크    | React Native 0.81.5      |
| 플랫폼        | Expo ~54.0.33            |
| 스타일링      | styled-components ^6.4.1 |
| 상태 관리     | Zustand ^5.0.13          |
| 패키지 매니저 | Bun                      |
| 린터 / 포맷터 | Biome 2.4.15             |

---

## 2. 개발 환경 설정

### 2-1. 필수 도구 설치

| 도구    | 설치 방법                                                             |
| ------- | --------------------------------------------------------------------- |
| Node.js | [nodejs.org](https://nodejs.org) (LTS 버전 권장)                      |
| Bun     | macOS/Linux: `curl -fsSL https://bun.sh/install \| bash`              |
| Bun     | Windows (PowerShell): `powershell -c "irm bun.sh/install.ps1 \| iex"` |
| Expo Go | 모바일 기기에 Expo Go 앱 설치 (실기기 테스트용)                       |

설치 후 아래 명령어로 Bun이 정상 설치되었는지 확인합니다.

```bash
bun --version
```

> 자세한 명령어는 `.agents/docs/package-manager-guide.md`를 참고하세요.

### 2-2. 저장소 포크 (Fork)

1. [https://github.com/cmu02/pick-trip-app](https://github.com/cmu02/pick-trip-app) 에 접속합니다.
2. 우측 상단의 **Fork** 버튼을 클릭하고, 본인의 GitHub 계정을 대상으로 선택합니다.

### 2-3. 로컬 환경 설정

포크한 저장소를 클론하고 `upstream` 리모트를 등록합니다.

```bash
# 1. 포크한 저장소 클론 (your-github-username을 본인 계정으로 변경)
git clone git@github.com:<your-github-username>/pick-trip-app.git
cd pick-trip-app

# 2. 리모트 확인 (origin만 보여야 합니다)
git remote show

# 3. 원본 저장소를 upstream으로 등록
git remote add upstream git@github.com:cmu02/pick-trip-app.git

# 4. 리모트 재확인 (origin과 upstream이 모두 보여야 합니다)
git remote show

# 5. 모든 브랜치 정보 가져오기
git fetch --all

# 6. 브랜치 확인 (origin과 upstream의 브랜치가 모두 보여야 합니다)
git branch -a

# 7. 의존성 설치
bun install
```

### 2-4. 코드 동기화

작업 중 `upstream`(원본 저장소)에 변경사항이 생기면 아래 절차로 동기화합니다.

```bash
# 1. 모든 리모트 브랜치 정보 가져오기
git fetch --all

# 2. main 브랜치로 이동 후 upstream 반영
git checkout main
git pull upstream main

# 3. 작업 브랜치로 돌아가기
git checkout feat/kakao-login

# 4. main 기준으로 리베이스 (브랜치를 최신 main에 맞게 정렬)
git rebase main
```

> **주의**: 이미 원격(origin)에 푸시한 브랜치는 리베이스하지 않습니다.
> 푸시 이후에는 `git rebase` 대신 `git merge main`을 사용하세요.

작업이 완료되어 PR이 머지된 후에는 브랜치를 정리합니다.

```bash
# 로컬 브랜치 삭제
git branch -d feat/kakao-login

# 원격(origin) 브랜치 삭제
git push origin :feat/kakao-login
```

### 2-5. 개발 서버 실행

```bash
bun run start
```

실행 후 터미널에 QR 코드가 표시됩니다.
모바일 기기의 Expo Go 앱으로 QR 코드를 스캔하면 앱을 바로 확인할 수 있습니다.

### 2-6. 주요 스크립트

```bash
bun run android    # Android 에뮬레이터 실행
bun run ios        # iOS 시뮬레이터 실행
bun run lint       # 린트 검사
bun run lint:fix   # 린트 검사 + 자동 수정
bun run format     # 코드 포맷 자동 적용
```

---

## 3. 디렉토리 구조

```text
.
├── components/
│   ├── atoms        # 가장 작은 단위의 UI 컴포넌트 (버튼, 인풋 등)
│   ├── molecules    # atoms 조합 컴포넌트 (검색바, 카드 등)
│   └── organisms    # 화면을 구성하는 큰 단위 컴포넌트
├── screens/         # 화면 단위 컴포넌트
├── navigation/      # 네비게이션 설정
├── services/        # API 호출, 비즈니스 로직
├── store/           # 전역 상태 관리 (Zustand)
├── hooks/           # 커스텀 훅
├── types/           # 전역 타입 및 인터페이스 정의
├── constants/       # 전역 상수 (지역 코드, API 엔드포인트 등)
├── utils/           # 공통 유틸 함수
├── assets/          # 이미지, 아이콘 등
└── App.tsx
```

새 파일을 추가할 때는 역할에 맞는 디렉토리에 배치합니다.

---

## 4. 브랜치 전략

### 기본 규칙

- `main` 브랜치에는 **직접 커밋하지 않습니다.**
- 모든 작업은 새 브랜치를 생성하여 진행합니다.
- 작업이 완료되면 Pull Request를 통해 `main`에 병합합니다.

### 브랜치 이름 형식

```
<타입>/<작업-내용>
```

이슈 번호가 있는 경우 끝에 `-<이슈번호>` 형식으로 추가합니다.

| 타입       | 사용 시점                     | 예시                           |
| ---------- | ----------------------------- | ------------------------------ |
| `feat`     | 새로운 기능 개발              | `feat/kakao-login`             |
| `fix`      | 버그 수정                     | `fix/trip-card-crash`          |
| `refactor` | 기능 변경 없이 코드 구조 개선 | `refactor/trip-list-component` |
| `bugfix`   | 이슈 기반 버그 수정           | `bugfix/map-render-issue-23`   |
| `hotfix`   | 배포된 버전의 긴급 버그 수정  | `hotfix/login-token-expire`    |

> `hotfix`는 `main`의 긴급 버그를 수정할 때 사용하며, 수정 후 `main`으로 즉시 머지합니다.

### 브랜치 생성 예시

```bash
# 1. main 브랜치 최신화
git checkout main
git pull origin main

# 2. 새 브랜치 생성 및 이동
git checkout -b feat/kakao-login
```

> **주의**: 한 브랜치에서는 해당 기능과 관련된 작업만 진행합니다.
> 다른 기능을 개발하려면 반드시 새 브랜치를 생성하세요.

---

## 5. 커밋 메시지 규칙

### 기본 형식

```
<타입>(<범위, 선택>): <제목>

(선택) 본문 — 변경 이유와 주요 내용

(선택) 푸터 — 관련 이슈 번호 (예: Closes #12)
```

### 타입 종류

| 타입       | 설명                                |
| ---------- | ----------------------------------- |
| `feat`     | 새로운 기능 추가                    |
| `fix`      | 버그 수정                           |
| `docs`     | 문서 변경 (README, 주석 등)         |
| `style`    | 코드 포맷 변경 (기능 변경 없음)     |
| `refactor` | 기능 변경 없이 코드 구조 개선       |
| `chore`    | 빌드 설정, 패키지 관리 등 기타 작업 |
| `perf`     | 성능 개선                           |
| `ci`       | CI 설정 및 스크립트 변경            |
| `release`  | 버전 릴리즈 및 태그                 |

### 작성 규칙

- 제목은 **마침표 없이** 작성합니다.
- 커밋 메시지는 **한국어**로 작성합니다.
- 하나의 커밋은 하나의 논리적 단위만 포함합니다.
- 민감한 파일(`.env`, 인증 키 등)은 절대 커밋하지 않습니다.

### 커밋 절차

```bash
# 1. 변경사항 확인
git status
git diff

# 2. 관련 파일만 스테이징
git add <파일명>

# 3. 커밋
git commit -m "feat(auth): 카카오 소셜 로그인 구현"

# 4. 완료 확인
git log --oneline -10
git status
```

### 예시

```
feat(auth): 카카오 소셜 로그인 구현

- OAuth 리다이렉트 처리 추가
- 로그인 실패 시 에러 메시지 표시

Closes #5
```

---

## 6. 코드 스타일

### 네이밍 규칙

| 항목                 | 규칙               | 예시                                     |
| -------------------- | ------------------ | ---------------------------------------- |
| 컴포넌트 파일 / 이름 | PascalCase         | `TripCard.tsx`, `HomeScreen.tsx`         |
| 함수 / 변수          | camelCase          | `fetchTrips`, `isLoading`, `handleLogin` |
| 전역 상수            | UPPER_SNAKE_CASE   | `API_BASE_URL`, `MAX_RETRY_COUNT`        |
| 런타임 상수          | camelCase          | `baseUrl`, `defaultTimeout`              |
| 이벤트 핸들러        | handle + 동작      | `handleLogin`, `handleImageUpload`       |
| 비동기 함수          | get / fetch / load | `fetchTrips`, `getProfileInfo`           |
| Props 타입           | 컴포넌트명 + Props | `TripCardProps`, `RegionSelectorProps`   |

### TypeScript 규칙

```ts
// interface: 컴포넌트 Props, API 응답 객체 (확장 가능성 있는 객체)
interface TripCardProps { ... }
interface TourApiResponse { ... }

// type: 유니온 타입, 단순 alias, 함수 시그니처
type TripDuration = 'day' | '1night' | '2night';
type FetchTrip = (id: string) => Promise<Trip>;
```

### styled-components 네이밍

요소의 역할을 명확히 드러내는 의미 기반 이름을 사용합니다.

| 유형                 | 예시                                   |
| -------------------- | -------------------------------------- |
| 레이아웃 감싸는 요소 | `Container`, `Wrapper`, `Section`      |
| 사용자 입력 요소     | `SearchInput`, `DateInput`, `TextArea` |
| 버튼                 | `SubmitButton`, `CancelButton`         |
| 텍스트               | `Title`, `Description`, `Label`        |
| 카드 / 리스트 아이템 | `TripCard`, `ContentItem`              |

### Biome 린트 검사

PR 제출 전에 반드시 아래 명령어를 실행합니다.

```bash
bun run lint       # 오류 확인
bun run lint:fix   # 자동 수정
bun run format     # 포맷 적용
```

> 전체 코드 컨벤션은 `.agents/rules/code-convention.md`를 참고하세요.

---

## 7. Pull Request 가이드

### PR 제출 전 체크리스트

- [ ] `bun run lint` 실행 후 오류 없음
- [ ] 변경 사항이 현재 브랜치의 기능 범위 안에 있음
- [ ] `main` 브랜치의 최신 변경사항을 반영함 (`git rebase main`)
- [ ] PR 제목과 설명이 명확하게 작성됨

### PR 제목 형식

```
<타입>: <변경 내용 요약>
```

예시:

- `feat: 카카오 로그인 기능 추가`
- `fix: 로그인 실패 시 에러메시지 개선`

### PR 본문 템플릿

```
## <PR 제목>
- [기능/버그/개선/환경...] 에 대한 한 줄 요약

---

## 변경 목적
왜 이 변경이 필요한지 한두 문장으로 작성해 주세요.
관련 이슈 번호가 있다면 함께 적어 주세요. (예: 이슈: #5)

---

## 변경 내용
주요 변경 파일과 내용을 간단히 적어 주세요.
- src/screens/LoginScreen.tsx: 카카오 로그인 버튼 추가
- src/services/authService.ts: OAuth 토큰 처리 로직 추가

---

## 테스트 및 검증 방법
실제로 어떻게 테스트했는지 적어 주세요.
- 로컬에서 카카오 로그인 테스트: 정상 토큰 발급 확인
- 로그인 후 일정 저장 요청 성공 여부 확인

---

## 리뷰 요청 포인트
리뷰어에게 특히 주의해서 봐달라고 하고 싶은 부분을 적어 주세요.
- authService.ts의 토큰 만료 처리 로직이 안전한지
```

### 리뷰 과정

1. PR 생성 후 팀원에게 리뷰를 요청합니다.
2. 리뷰어는 코드 스타일뿐 아니라 로직, 성능, 유지보수성도 함께 검토합니다.
3. 코멘트는 구체적으로 작성하고 감정적인 표현은 지양합니다.
4. 모든 코멘트가 해결되면 `main`으로 **Rebase Merge** 합니다.

### 병합 기준

- 린트 오류가 없어야 합니다.
- 모든 리뷰 코멘트가 해결되어야 합니다.
- 기능 검증이 필요한 변경은 검증 방법을 PR에 포함합니다.
- 머지 후 관련 이슈를 닫고 작업 상태를 업데이트합니다.

---

## 8. 이슈 작성 가이드

버그를 발견하거나 새 기능을 제안할 때 이슈를 작성합니다.
새 이슈를 작성하기 전에 **기존 이슈를 먼저 검색**해주세요.

### 버그 리포트

```
## 버그 설명
어떤 문제가 발생했나요?

## 재현 방법
1. ...
2. ...

## 예상 동작
어떻게 동작해야 하나요?

## 실제 동작
실제로는 어떻게 동작했나요?

## 환경
- OS: (예: macOS 14, Windows 11)
- 기기: (예: iPhone 15, Galaxy S24)
```

### 기능 제안

```
## 기능 설명
어떤 기능을 원하나요?

## 필요한 이유
왜 이 기능이 필요한가요?

## 구현 아이디어 (선택)
어떻게 구현하면 좋을지 아이디어가 있다면 작성해주세요.
```

---

궁금한 점이 있으면 언제든지 팀 채널에 질문해주세요!
