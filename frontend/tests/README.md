# E2E Testing with Playwright

This directory contains end-to-end tests for the frontend application using Playwright.

## Getting Started

### Prerequisites

- Node.js and npm installed
- Playwright browsers installed (already done during setup)

### Running Tests

#### Basic Commands

```bash
# Run all tests in headless mode
npm run test:e2e

# Run tests with browser UI visible
npm run test:e2e:headed

# Run tests with Playwright's interactive UI
npm run test:e2e:ui

# Debug tests step by step
npm run test:e2e:debug
```

#### Advanced Commands

```bash
# Run tests in a specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run a specific test file
npx playwright test tests/example.spec.ts

# Run help functionality tests specifically
npx playwright test tests/help-functionality.spec.ts

# Run tests matching a pattern
npx playwright test --grep "homepage"

# Run only help-related tests (by pattern)
npx playwright test --grep "帮助功能|help"

# Run tests in parallel
npx playwright test --workers=4
```

## Configuration

The Playwright configuration is located in `playwright.config.ts` and includes:

- **Base URL**: http://localhost:5173 (Vite dev server)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Features**:
  - Automatic dev server startup
  - Screenshots on failure
  - Video recording on failure
  - Trace collection on retry
  - HTML reporter

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Your test code here
  });
});
```

### Available Test Files

- **`e2e-app-flow.spec.ts`** - Navigation and routing tests
- **`practice-session-flow.spec.ts`** - Practice session workflow tests
- **`columnar-calculation.spec.ts`** - Columnar calculation specific tests
- **`help-functionality.spec.ts`** - Comprehensive help feature tests
- **`example.spec.ts`** - Basic example test

### Best Practices

1. **Use data-testid attributes** for reliable element selection:

   ```html
   <button data-testid="submit-button">Submit</button>
   ```

   ```typescript
   await page.locator('[data-testid="submit-button"]').click();
   ```

2. **Wait for elements** before interacting:

   ```typescript
   await page.waitForSelector('[data-testid="content"]');
   await expect(page.locator('[data-testid="content"]')).toBeVisible();
   ```

3. **Use page.goto()** for navigation:

   ```typescript
   await page.goto('/dashboard');
   ```

4. **Group related tests** in describe blocks:
   ```typescript
   test.describe('User Authentication', () => {
     // Related tests here
   });
   ```

### Common Assertions

```typescript
// Text content
await expect(page.locator('h1')).toContainText('Welcome');

// Visibility
await expect(page.locator('.modal')).toBeVisible();
await expect(page.locator('.loading')).toBeHidden();

// URL
await expect(page).toHaveURL('/dashboard');

// Title
await expect(page).toHaveTitle('My App');

// Form inputs
await expect(page.locator('input[name="email"]')).toHaveValue(
  'test@example.com'
);
```

## Debugging

### Visual Debugging

- Use `npm run test:e2e:headed` to see tests run in browser
- Use `npm run test:e2e:debug` to debug step by step
- Add `await page.pause();` to pause execution at specific points

### Screenshots and Videos

- Screenshots are automatically taken on test failures
- Videos are recorded for failed tests
- Both are saved in `test-results/` directory

### Playwright Inspector

```bash
# Debug a specific test
npx playwright test tests/example.spec.ts --debug
```

## CI/CD Integration

For continuous integration, tests will:

- Run in headless mode
- Retry failed tests up to 2 times
- Generate HTML reports
- Run with a single worker for stability

## Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

The report includes:

- Test results and timing
- Screenshots of failures
- Video recordings
- Trace files for debugging

# E2E 测试说明

本目录包含所有 Playwright 端到端（E2E）测试用例，覆盖核心练习流程、帮助功能、竖式计算等主要功能。

## 目录结构

- `help-functionality.spec.ts` —— 帮助功能全流程E2E测试（23项，100%通过）
- `columnar-calculation.spec.ts` —— 竖式计算相关E2E测试
- `practice-session-flow.spec.ts` —— 练习流程主线E2E测试
- `e2e-app-flow.spec.ts` —— 应用主流程E2E测试
- `example.spec.ts` —— Playwright官方示例
- `HELP_FUNCTIONALITY_TEST_SUMMARY.md` —— 帮助功能测试用例详细说明

## 运行方法

1. 安装依赖：

```bash
npm install
```

2. 运行全部E2E测试：

```bash
npx playwright test --project chromium --workers=6
```

3. 仅运行帮助功能测试：

```bash
npx playwright test tests/help-functionality.spec.ts
```

仅运行帮助功能测试集中的"should navigate to results after completing session"

```bash
npx playwright test tests/help-functionality.spec.ts -g "should navigate to results after completing session"
```

```bash
npx playwright test tests/help-functionality.spec.ts -g "should navigate to results after completing session" --headed --debug --project chromium --workers=1
```

4. 查看测试报告：

```bash
npx playwright show-report
```

## 帮助功能测试（help-functionality.spec.ts）

- **覆盖范围**：
  - 文字帮助、语音帮助、加载与错误处理、交互体验、性能与稳定性、可访问性、API参数校验等
- **通过率**：
  - **23/23 全部通过**（2024-06-XX）
- **常见问题已全部修复**：
  - 状态初始化、API模拟、UI遮挡、键盘导航、错误消息、按钮选择器等问题均已解决
- **最佳实践**：
  - 使用测试模式URL参数初始化状态，确保与真实流程一致
  - API mock数据字段完整，避免"Critical error: No current question loaded"
  - 交互测试优先用可见按钮和文本选择器，兼容UI变动
  - 错误消息断言采用正则，兼容多种实现
  - 关闭帮助框优先用关闭按钮，兼容不同实现

## 维护建议

- 新增功能请补充对应E2E用例，保持100%通过率
- 遇到"Critical error"优先检查API mock和URL参数
- 组件结构变动时同步更新选择器和断言
- 建议定期本地全量跑一次E2E，确保主流程稳定

## 相关文档

- [HELP_FUNCTIONALITY_TEST_SUMMARY.md](./HELP_FUNCTIONALITY_TEST_SUMMARY.md) —— 详细用例与技术说明

---

如有疑问或需补充说明，请联系前端负责人。
