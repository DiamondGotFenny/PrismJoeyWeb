# Bug Records

## Status Legend

- ❌ **CRITICAL** - Severe bug that blocks functionality
- ⚠️ **HIGH** - Important bug that affects user experience
- 🔧 **MEDIUM** - Bug that should be fixed but doesn't block usage
- ✅ **FIXED** - Bug has been resolved

---

## Active Bugs

### 1. ❌ **CRITICAL** - Backend Server Hangs on Help Request Timeout

**Status:** Open  
**Severity:** Critical  
**Description:** When user clicks "帮我一下" (Help) button and the LLM request times out or doesn't respond, the FastAPI backend server becomes unresponsive. Even Ctrl+C cannot terminate the server - only force-closing the terminal works.  
**Impact:** Complete server lockup requiring manual intervention  
**Priority:** Immediate fix required

### 5. ⚠️ **HIGH** - Voice Help Issues in Columnar Calculation

**Status:** Open  
**Severity:** High  
**Description:** Voice help for columnar calculations has multiple issues:

- Single digits are described as double digits
- Missing parts are described as underscores ("下横线")  
  **Impact:** Confusing and unhelpful voice assistance  
  **Priority:** Fix in next release

---

## Resolved Bugs

### 2. ✅ **FIXED** - Critical Error on Exercise Session Page Load

**Status:** Fixed  
**Severity:** High  
**Description:** Loading math exercise page showed error: "ExerciseSessionPage.tsx:543 [ExerciseSessionPage] Critical error: No current question loaded despite passing guards"  
**Solution:** Fixed race condition by adding proper loading state handling for component initialization  
**Fixed Date:** 2025-06-10
**Fixed By:** AI Assistant

### 3. ✅ **FIXED** - Test Mode Code in Production Component

**Status:** Fixed  
**Severity:** Medium  
**Description:** ExerciseSessionPage contains 'test mode' code that should not be in production. Testing should use proper mocks instead of embedded test logic.  
**Solution:** Completely removed all test-related code from ExerciseSessionPage. Implemented proper localStorage mocking strategy in test helpers using `gotoPracticeSession()` function. Fixed localStorage key mismatch and added missing data-testid attribute for test element targeting. Tests now use non-invasive mocking without any test code in production components.  
**Fixed Date:** 2025-06-10  
**Fixed By:** AI Assistant

### 4. ✅ **FIXED** - Columnar Calculation Answer Not Displayed

**Status:** Fixed  
**Severity:** High  
**Description:** In columnar calculation exercises, when user submits answer and presses confirm, the correct answer is not displayed to the user.  
**Solution:** Enhanced ColumnarCalculation component to properly display correct answers when showCorrectAnswer=true. Added logic to calculate and display the complete correct solution, highlighting previously blank (user-filled) cells in green.  
**Fixed Date:** 2025-06-10  
**Fixed By:** AI Assistant

### 6. ✅ **FIXED** - Keyboard Input Not Working in Columnar Calculation

**Status:** Fixed  
**Severity:** High  
**Description:** Users cannot input numbers using keyboard in columnar calculation mode.  
**Solution:** Added comprehensive keyboard input support for columnar calculations including numeric keys (0-9), Backspace/Delete for clearing, Enter for submission, and arrow keys for navigation. Implemented custom event system to bridge keyboard input with existing keypad logic.  
**Fixed Date:** 2025-06-10
**Fixed By:** AI Assistant

### 7. ✅ **FIXED** - Input Border Disappears After Number Entry

**Status:** Fixed  
**Severity:** Medium  
**Description:** In columnar calculation, after user fills a number into a blank field, the border of that input field disappears.  
**Solution:** Added CSS styling for filled cells with green borders and light green backgrounds. Implemented visual distinction between empty, filled, and correct answer states. Filled cells now maintain visible borders and proper hover effects.  
**Fixed Date:** 2025-06-10  
**Fixed By:** AI Assistant

---

## Summary

- **Total Bugs:** 7
- **Active:** 2 (1 Critical, 1 High)
- **Fixed:** 5
- **Critical Issues:** 1 (Server hang on help timeout)
