# Pick Trip App

# Introduce

현재는 좁은 범위로 경상도 내에 상대적으로 덜 알려진 지역인 하동, 영주, 예천을 중심으로 음식, 축제, 관광지, 문화 및 자연 컨텐츠를 소개하고, 사용자가 원하는 컨텐츠를 직접 선택하면
AI가 여행 날짜 및 동행 조건에 맞춰 현실적인 여행 일정을 생성해주는 서비스입니다.

핵심 방향은 단순한 여행지 추천이 아니라, 사용자가 직접 고른 지역 컨텐츠를 AI가 일정으로 조립해주는 것입니다.
이를 통해서 사용자는 낯선 지역에서도 무엇을 먹을지, 어디를 볼지, 어떤 순서로 이동해야하는지 쉽게 결정할 수 있습니다.

추후, 경상도 내 지역 뿐만 아니라 여러 지역도 확장 시킬 계획입니다.

# Background of the Project

국내 여행자는 유명 관광지에 집중되는 경향이 강합니다. 반면, 경상도 범위를 좁힌 하동, 영주, 예천처럼 고유한 음식, 자연, 문화, 축제 자원을 가진 지역은 여행 정보가 흩어져 있어
처음 방문하는 사용자가 매력을 한눈에 파악하기 어렵습니다.

특히 가족 여행자는 여행지를 고를 때 단순히 유명한 장소보다 이동 동선, 주차, 식사 시간, 아이 또는 부모님 동반 가능성, 운영시간, 날씨 대안 등 현실적인 조건을 중요하게 봅니다.

기존 지도 서비스나 블로그 검색은 개별장소 정보는 제공하지만 사용자의 선택을 실제 일정으로 연결하는 데 한계가 있습니다.

이 서비스는 이러한 문제를 해결하기 위해서 지역 컨텐츠 탐색이나 AI 일정 생성을 하나의 흐름으로 연결합니다.

# Tech Stack

| 분류          | 기술                     |
| ------------- | ------------------------ |
| 언어          | TypeScript ~5.9.2        |
| 프레임워크    | React Native 0.81.5      |
| 플랫폼        | Expo ~54.0.33            |
| 스타일링      | styled-components ^6.4.1 |
| 패키지 매니저 | Bun                      |
| 린터 / 포맷터 | Biome 2.4.15             |

# Project Information

| title                 | path                                                       |
| --------------------- | ---------------------------------------------------------- |
| 주요 사용자 흐름      | `.agents/docs/key-usage-flow.md`                           |
| 핵심 기능             | `.agents/docs/key-features.md`                             |
| 지역별 컨텐츠 방향    | `.agents/docs/content-direction-by-region.md`              |
| 정보 안정성 보완 방안 | `.agents/docs/measures-to-enhance-information-security.md` |
| MVP 범위              | `.agents/docs/mvp-scope.md`                                |
| 예외 처리 흐름        | `.agents/docs/error-handling-flow.md`                      |
| 패키지 매니저 가이드  | `.agents/docs/package-manager-guide.md`                    |

# Convention

| title         | path                               |
| ------------- | ---------------------------------- |
| 코드 규칙     | `.agents/rules/code-convention.md` |
| 깃 규칙       | `.agents/rules/git-convention.md`  |
| 브랜치 포커스 | `.agents/rules/branch-focus.md`    |
| Biome 설정    | `biome.json`                       |

# GitHub Issue & PR

## 이슈 생성

이슈를 생성할 때는 사용자가 요청한 작업 내용을 보고 `.github/ISSUE_TEMPLATE/`에 있는 템플릿 중
상황에 가장 적절한 것을 골라 그 형식에 맞춰 작성한다.

| 템플릿                                      | 사용 상황                                | 라벨    |
| ------------------------------------------- | ---------------------------------------- | ------- |
| `.github/ISSUE_TEMPLATE/feature_request.md` | 새로운 기능 제안                         | feature |
| `.github/ISSUE_TEMPLATE/bug_report.md`      | 버그 제보                                | bug     |
| `.github/ISSUE_TEMPLATE/task.md`            | 구현, 개선, 조사 등 구체적인 작업        | task    |
| `.github/ISSUE_TEMPLATE/chore.md`           | 설정, 의존성, 문서 정리 등 유지보수 작업 | chore   |

- 템플릿의 제목 접두사(`[Feature]`, `[Bug]`, `[Task]`, `[Chore]`)와 라벨을 그대로 따른다.
- 템플릿의 각 섹션(작업 내용, 변경 이유, 완료 조건 등)을 빠짐없이 채운다.

## PR 생성

PR을 생성할 때는 `.github/pull_request_template.md` 템플릿을 보고 그 형식에 맞춰 작성한다.

- `## 작업 내용`: 주요 변경 사항을 요약한다.
- `## 관련 이슈`: `Closes #<이슈번호>` 형식으로 연결해 머지 시 이슈가 자동으로 닫히게 한다.
- `## 테스트 플랜`: 어떻게 검증했는지(테스트 실행, 동작 확인 등)를 기록한다.
