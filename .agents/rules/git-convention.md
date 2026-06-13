# Git Commit Message Naming Convention

> **⚠️ Do not commit to Git under any circumstances until you are specifically instructed to do so.**

## 1. Basic Structure

- `feat`: Used when adding a new feature

- `fix`: Used when fixing a bug

- `docs`: Used when making documentation-only changes (README, comments, Wiki, etc.)

- `style`: Used for style or format changes that don’t affect functionality (e.g., missing semicolons, white spaces)

- `refactor`: Used when refactoring code without changing its behavior

- `chore`: Used for routine or miscellaneous tasks (build scripts, package manager config, lint settings)

- `perf`: Used when improving performance

- `ci`: Used for CI (Continuous Integration) configuration or script modifications

- `release`: Used when releasing a new version or tagging a release

## 2. Commit Message Format

```text
<type>(optional: scope): <title>

(optional) Body

(optional) Footer (e.g., issue tracking number, breaking change notice)
```

## 3. Commit By Logical Units

> Please divide your current work into logical units and commit them separately.

### Steps

1. Check current changes
   - Use git status to check staged/unstaged changes.

   - Use git diff to review detailed changes in each file.

2. Group changes by logical unit
   - Group related changes together.

   - Each group should represent a complete, meaningful unit of work.

   - Classify the commits based on the basic structure above.

3. Commit each unit sequentially
   - Start with the most essential changes.

   - For each unit:

   - `git add [related files]`

   - Write the commit message following the naming convention and rules.

4. Verify commit completion
   - Run `git log --oneline -10` to check recent commit history.

   - Run `git status` to ensure no remaining changes.

### Notes

- Each commit should be meaningful and self-contained.

- Unrelated changes must be committed separately.

- Never commit sensitive files (e.g., .env, credentials).

- Unless instructed otherwise, write commit messages in Korean by default.

## 4. Merge Guidelines

- As a general rule, pull requests should be merged via rebase.
- Before rebasing a feature branch, ensure there are no open issues on the base branch (`main`) and that the branch is up to date.
- Rebasing maintains a linear commit history and prevents the creation of unnecessary merge commits.
- If conflicts occur even after rebasing, resolve them, retest, and then proceed with the merge.

---

# Branch Naming Convention

- All team members should not commit directly to `main`;  
  instead, they should create a work branch to perform their tasks.
- Branch names must follow the format `<type>/<issue_number>`:
  - New features: `feat/<issue_number>` (e.g., `feat/12`)
  - Refactoring: `refactor/<issue_number>` (e.g., `refactor/12`)
  - Bug fixes: `bugfix/<issue_number>` (e.g., `bugfix/12`)
  - Hot fixes: `hotfix/<issue_number>` (e.g., `hotfix/12`)
- The issue number is the core identifier of the branch name.  
  Always create a branch from the corresponding issue so that work and issues map 1:1.

> `hotfix`는 `main` 브랜치의 긴급 버그를 수정할 때 사용한다. 수정 후 `main`으로 즉시 머지한다.

---

# Pull Requests (PR)

- A PR is a process in which code changes are reviewed and implemented following team consensus.
- As a general rule, we push changes in small increments and clearly document the reason for the change and it's scope.

### Write Guidelines

- Write PR Title that clearly convey the changes at a glance.
- Include the purpose, key changes, and test results in the PR description
- Break down large changes that are difficult to review into smaller parts whenever possible.
- Separate unnecessary file changes or formatting changes into separate PRs.

### Review Guidelines

- The author of the PR should first explain the intent of the change and any points to note.
- Reviewers should check not only the code style but also the logic, performance, and maintainability.
- Comments should be specific, and emotional language should be avoided.
- Be sure to verify the core logic and edge cases before approval.

### Merge Criteria

- All required tests must pass.
- Review comments must be addressed.
- For changes that require functional verification, include the verification method.
- After merging, close any related issues and update the task status.

### Recommended Example

- `fix: 로그인 실패 시 에러메시지 개선`
- `feat: OAuth2 카카오, 구글 로그인 기능 추가`

### PR Template Format

```text
## <PR 제목>

- [기능/버그/개선/환경...]에 대한 한줄 요약
  - 예: `feat: 로그인 API JWT 토큰 발급 로직 추가`
  - 예: `fix: 프로필 이미지 업로드 시 500 오류 수정`

---

## 변경 목적
- 왜 이 변경이 필요한지 한두 문장으로 작성해 주세요.
- 관련 이슈 번호가 있다면 함께 적어 주세요.

예시:
  - 기존 로그인 후 세션 재발급 로직에서 오류가 발생하여,
  JWT 토큰 방식으로 변경하여 안정성을 높이기 위해 추가합니다.
  - 이슈: #234

---

## 변경 내용
- 주요 파일/모듈/함수를 간단히 적어 주세요.
- 데이터베이스 스키마 변경, API 스펙 변경, 외부 서비스 연동 등이 있다면 명시해 주세요.

예:
  - `src/auth/auth.service.ts`: 로그인 후 JWT 토큰 발급 로직 추가
  - `src/auth/auth.controller.ts`: `/login` 엔드포인트 응답 형식 변경
  - `docs/openapi.yaml`: `/login` API 스펙 업데이트

---

## 테스트 및 검증 방법

- 실제 테스트 환경에서 어떻게 검증했는지 적어 주세요.
- 로컬/스테이징에서의 테스트 증거도 포함하면 좋습니다.

예:
- 로컬에서 로그인 테스트: 정상 토큰 발급 및 헤더에 `Authorization: Bearer ...` 설정 확인
- 로그인 후 `/me` 요청으로 토큰 검증 및 사용자 정보 조회 성공 여부 확인

---

## 리뷰 요청 포인트

- 리뷰어에게 특히 주의해서 봐달라고 하고 싶은 부분을 적어 주세요.

예:
- `auth.service.ts`의 토큰 만료 정책 및 토큰 갱신 로직이 안전한지
- `config/auth.ts`의 환경 변수 설정이 암호화/보안 관점에서 적절한지
```
