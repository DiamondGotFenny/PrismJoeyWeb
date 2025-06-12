import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useMemo, type RefObject } from 'react';
import type {
  PracticeSession,
  Question,
  AnswerPayload,
  HelpResponse,
} from '../services/api';
import {
  startPracticeSession,
  getNextQuestion,
  submitAnswer,
  getPracticeSummary,
  getQuestionHelp,
  playStreamingAudio,
} from '../services/api';
import { AxiosError } from 'axios';

interface FeedbackState {
  isCorrect: boolean | null;
  message: string;
  correctAnswer?: string | number;
  show: boolean;
}

interface HelpState {
  data: HelpResponse | null;
  isVisible: boolean;
  isLoading: boolean;
  error: {
    type: 'network' | 'server' | 'llm' | 'unknown';
    message: string;
    canRetry: boolean;
  } | null;
  retryCount: number;
}

interface VoiceHelpState {
  isLoading: boolean;
  error: string | null;
  isPlaying: boolean;
  progress: number;
}

interface ColumnarInputState {
  type: 'operand' | 'result';
  rowIndex?: number;
  digitIndex: number;
}

interface PracticeState {
  // Session state
  sessionId: string | null;
  session: PracticeSession | null;

  // Question state
  currentQuestion: Question | null;
  questionNumber: number;
  totalQuestions: number;
  questionAnimationKey: number;

  // Answer state
  currentAnswer: string;
  columnarResultDigits: (number | null)[] | null;
  columnarOperandDigits: (number | null)[][] | null;
  activeColumnarInput: ColumnarInputState | null;
  isAnswerSubmitted: boolean;

  // Progress state
  score: number;

  // UI state
  isLoading: boolean;
  error: string | null;
  isSessionOver: boolean;

  // Feedback state
  feedback: FeedbackState;

  // Help state
  help: HelpState;

  // Voice help state
  voiceHelp: VoiceHelpState;

  // Abort controllers
  helpAbortController: AbortController | null;
  voiceHelpAbortController: AbortController | null;

  // Session summary
  sessionDataForSummary: PracticeSession | null;
}

interface PracticeActions {
  // Session actions
  startSession: (
    difficultyLevelId: number,
    totalQuestions?: number
  ) => Promise<void>;
  endSession: () => Promise<void>;
  resetSession: () => void;

  // Question actions
  loadNextQuestion: () => Promise<void>;

  // Answer actions
  setCurrentAnswer: (answer: string) => void;
  submitCurrentAnswer: () => Promise<void>;

  // Columnar answer actions
  setColumnarResultDigits: (digits: (number | null)[]) => void;
  setColumnarOperandDigits: (digits: (number | null)[][]) => void;
  setActiveColumnarInput: (input: ColumnarInputState | null) => void;
  updateColumnarDigit: (
    digit: number,
    type: 'operand' | 'result',
    digitIndex: number,
    rowIndex?: number
  ) => void;
  clearColumnarInputs: () => void;

  // Navigation helpers
  findNextFocusableInput: () => void;

  // Feedback actions
  showFeedback: (
    isCorrect: boolean,
    message?: string,
    correctAnswer?: string | number
  ) => void;
  hideFeedback: () => void;

  // Help actions
  requestHelp: () => Promise<void>;
  retryHelp: () => Promise<void>;
  showHelp: () => void;
  hideHelp: () => void;
  clearHelpError: () => void;

  // Voice help actions
  requestVoiceHelp: (
    audioRef?: RefObject<HTMLAudioElement | null>
  ) => Promise<void>;
  playVoiceHelp: () => Promise<void>;
  stopVoiceHelp: () => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Loading states
  setLoading: (loading: boolean) => void;

  // Complete reset
  reset: () => void;
}

type PracticeStore = PracticeState & PracticeActions;

const initialFeedback: FeedbackState = {
  isCorrect: null,
  message: '',
  correctAnswer: undefined,
  show: false,
};

const initialHelp: HelpState = {
  data: null,
  isVisible: false,
  isLoading: false,
  error: null,
  retryCount: 0,
};

const initialVoiceHelp: VoiceHelpState = {
  isLoading: false,
  error: null,
  isPlaying: false,
  progress: 0,
};

const initialState: PracticeState = {
  sessionId: null,
  session: null,
  currentQuestion: null,
  questionNumber: 0,
  totalQuestions: 0,
  questionAnimationKey: 0,
  currentAnswer: '',
  columnarResultDigits: null,
  columnarOperandDigits: null,
  activeColumnarInput: null,
  isAnswerSubmitted: false,
  score: 0,
  isLoading: false,
  error: null,
  isSessionOver: false,
  feedback: initialFeedback,
  help: initialHelp,
  voiceHelp: initialVoiceHelp,
  helpAbortController: null,
  voiceHelpAbortController: null,
  sessionDataForSummary: null,
};

export const usePracticeStore = create<PracticeStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Session actions
      startSession: async (
        difficultyLevelId: number,
        totalQuestions: number = 10
      ) => {
        try {
          set((state) => {
            state.isLoading = true;
            state.error = null;
            // Ensure previous session data is cleared before starting a new one
            state.sessionId = null;
            state.session = null;
            state.currentQuestion = null;
            state.questionNumber = 0;
            state.totalQuestions = 0;
          });

          const sessionData = await startPracticeSession(
            difficultyLevelId,
            totalQuestions
          );

          set((state) => {
            state.sessionId = sessionData.id;
            state.session = sessionData;
            state.totalQuestions = sessionData.total_questions_planned;
            state.score = sessionData.score;
          });

          // Load first question
          await get().loadNextQuestion();

          set((state) => {
            // Don't override questionNumber - loadNextQuestion already set it correctly
            state.isLoading = false;
          });
        } catch (error) {
          set((state) => {
            state.error = '开始练习失败，请稍后再试。';
            state.isLoading = false;
          });
          console.error('Error starting session:', error);
        }
      },

      endSession: async () => {
        const sessionId = get().sessionId;
        if (!sessionId) return;

        try {
          console.log('[usePracticeStore] Ending session, fetching summary...');
          const summaryData = await getPracticeSummary(sessionId);

          set((state) => {
            state.sessionDataForSummary = summaryData;
            state.isSessionOver = true;
            state.isLoading = false;
          });

          console.log(
            '[usePracticeStore] Session summary fetched and state updated.'
          );
        } catch (error) {
          console.error('Error fetching session summary:', error);
          set((state) => {
            state.isSessionOver = true;
            state.error = '获取练习总结失败，但练习已完成。';
            state.isLoading = false;
          });
        }
      },

      resetSession: () => {
        set((state) => {
          Object.assign(state, initialState);
        });
      },

      // Question actions
      loadNextQuestion: async () => {
        const sessionId = get().sessionId;
        if (!sessionId) return;

        // Check if we are about to exceed the total number of questions
        const currentQuestionNumber = get().questionNumber;
        if (currentQuestionNumber >= get().totalQuestions) {
          console.log(
            '[usePracticeStore] Attempted to load next question, but session should be over. Current:',
            currentQuestionNumber,
            'Total:',
            get().totalQuestions
          );
          await get().endSession();
          return;
        }

        try {
          set((state) => {
            state.isLoading = true;
            // Don't increment question number here - do it after successful load
          });

          const question = await getNextQuestion(sessionId);

          console.log('[usePracticeStore] Loaded question:', {
            id: question.id,
            question_type: question.question_type,
            question_string: question.question_string,
            columnar_operands: question.columnar_operands,
            columnar_result_placeholders: question.columnar_result_placeholders,
            columnar_operation: question.columnar_operation,
          });

          set((state) => {
            state.currentQuestion = question;
            state.questionAnimationKey += 1;
            state.currentAnswer = '';
            // Increment question number only after successful load
            state.questionNumber += 1;

            // Initialize columnar data for columnar questions
            if (question.question_type === 'columnar') {
              // Initialize operand digits from question data
              if (question.columnar_operands) {
                state.columnarOperandDigits = question.columnar_operands.map(
                  (row) =>
                    row.map((digit) => (digit === undefined ? null : digit))
                );
              } else {
                state.columnarOperandDigits = null;
              }

              // Initialize result digits from question data
              if (question.columnar_result_placeholders) {
                state.columnarResultDigits =
                  question.columnar_result_placeholders.map((digit) =>
                    digit === undefined ? null : digit
                  );
              } else {
                state.columnarResultDigits = null;
              }
            } else {
              state.columnarResultDigits = null;
              state.columnarOperandDigits = null;
            }

            state.activeColumnarInput = null;
            state.isAnswerSubmitted = false;
            state.feedback = initialFeedback;
            state.help = initialHelp;
            state.voiceHelp = initialVoiceHelp;
            state.isLoading = false;
          });

          // Auto-focus first input for columnar questions
          if (question.question_type === 'columnar') {
            setTimeout(() => {
              get().findNextFocusableInput();
            }, 100);
          }
        } catch (error) {
          const axiosError = error as AxiosError;
          if (axiosError.response && axiosError.response.status === 404) {
            console.log(
              '[usePracticeStore] No more questions. Ending session.'
            );
            set((state) => {
              state.isSessionOver = true;
              state.isLoading = false;
            });
            await get().endSession();
          } else {
            set((state) => {
              state.error = '获取题目失败，请稍后再试。';
              state.isLoading = false;
            });
            console.error('Error loading next question:', error);
          }
        }
      },

      // Answer actions
      setCurrentAnswer: (answer: string) => {
        console.log('[usePracticeStore] setCurrentAnswer called with:', answer);
        set((state) => {
          console.log(
            '[usePracticeStore] Previous currentAnswer:',
            state.currentAnswer
          );
          state.currentAnswer = answer;
          console.log(
            '[usePracticeStore] New currentAnswer:',
            state.currentAnswer
          );
        });
      },

      submitCurrentAnswer: async () => {
        const state = get();
        const {
          sessionId,
          currentQuestion,
          currentAnswer,
          columnarOperandDigits,
          columnarResultDigits,
        } = state;

        if (!sessionId || !currentQuestion || state.isAnswerSubmitted) return;

        try {
          set((draft) => {
            draft.isLoading = true;
            draft.isAnswerSubmitted = true;
          });

          const payload: AnswerPayload = {
            session_id: sessionId,
            question_id: currentQuestion.id,
            time_spent: 30, // TODO: Implement actual time tracking
          };

          if (currentQuestion.question_type === 'columnar') {
            if (columnarOperandDigits) {
              payload.user_filled_operands = columnarOperandDigits.map((row) =>
                row.map((digit) => digit ?? 0)
              );
            }
            if (columnarResultDigits) {
              payload.user_filled_result = columnarResultDigits.map(
                (digit) => digit ?? 0
              );
            }
          } else {
            const answerNumber = parseFloat(currentAnswer);
            if (!isNaN(answerNumber)) {
              payload.user_answer = answerNumber;
            }
          }

          const result = await submitAnswer(payload);

          set((draft) => {
            draft.score =
              result.user_answer !== undefined
                ? draft.score + (result.is_correct ? 1 : 0)
                : draft.score;
            draft.isLoading = false;
          });

          // Show feedback - for columnar questions, calculate the correct answer
          let correctAnswer: string | number | undefined =
            result.correct_answer;
          if (
            currentQuestion.question_type === 'columnar' &&
            currentQuestion.operands
          ) {
            const opSymbol =
              currentQuestion.columnar_operation ||
              currentQuestion.operations?.[0] ||
              '+';

            // Build operand strings with zero padding according to columnar_operands lengths
            const operandStrings = currentQuestion.operands.map(
              (operand, idx) => {
                const desiredLength =
                  currentQuestion.columnar_operands?.[idx]?.length ?? undefined;
                return desiredLength
                  ? operand.toString().padStart(desiredLength, '0')
                  : operand.toString();
              }
            );

            // Compute result number
            let resultNumber = 0;
            if (opSymbol === '+') {
              resultNumber = currentQuestion.operands.reduce(
                (sum, n) => sum + n,
                0
              );
            } else if (
              opSymbol === '-' &&
              currentQuestion.operands.length >= 2
            ) {
              resultNumber =
                currentQuestion.operands[0] - currentQuestion.operands[1];
            } else if (
              opSymbol === '*' &&
              currentQuestion.operands.length >= 2
            ) {
              resultNumber = currentQuestion.operands.reduce(
                (prod, n) => prod * n,
                1
              );
            }

            const resultLen =
              currentQuestion.columnar_result_placeholders?.length ?? undefined;
            const resultStr = resultLen
              ? resultNumber.toString().padStart(resultLen, '0')
              : resultNumber.toString();

            correctAnswer = `${operandStrings[0]} ${opSymbol} ${operandStrings[1]} = ${resultStr}`;
          }

          get().showFeedback(
            result.is_correct ?? false,
            result.is_correct ? '答对了！🎉' : '再想想哦 🤔',
            correctAnswer
          );

          // The navigation to the result page is handled by a useEffect in PracticePage.
          if (get().questionNumber >= get().totalQuestions) {
            set((draft) => {
              draft.isSessionOver = true;
            });
            await get().endSession();
          }
        } catch (error) {
          set((state) => {
            state.error = '提交答案失败，请稍后再试。';
            state.isLoading = false;
            state.isAnswerSubmitted = false;
          });
          console.error('Error submitting answer:', error);
        }
      },

      // Columnar answer actions
      setColumnarResultDigits: (digits: (number | null)[]) => {
        set((state) => {
          state.columnarResultDigits = digits;
        });
      },

      setColumnarOperandDigits: (digits: (number | null)[][]) => {
        set((state) => {
          state.columnarOperandDigits = digits;
        });
      },

      setActiveColumnarInput: (input: ColumnarInputState | null) => {
        console.log(
          '[usePracticeStore] setActiveColumnarInput called with:',
          input
        );
        set((state) => {
          state.activeColumnarInput = input;
        });
      },

      updateColumnarDigit: (
        digit: number,
        type: 'operand' | 'result',
        digitIndex: number,
        rowIndex?: number
      ) => {
        console.log('[usePracticeStore] updateColumnarDigit called with:', {
          digit,
          type,
          digitIndex,
          rowIndex,
        });

        const state = get();
        console.log('[usePracticeStore] Current columnar state:', {
          columnarOperandDigits: state.columnarOperandDigits,
          columnarResultDigits: state.columnarResultDigits,
          activeColumnarInput: state.activeColumnarInput,
        });

        set((state) => {
          if (
            type === 'operand' &&
            rowIndex !== undefined &&
            state.columnarOperandDigits
          ) {
            if (
              state.columnarOperandDigits[rowIndex] &&
              state.columnarOperandDigits[rowIndex][digitIndex] === null
            ) {
              console.log('[usePracticeStore] Setting operand digit:', {
                rowIndex,
                digitIndex,
                digit,
              });
              state.columnarOperandDigits[rowIndex][digitIndex] = digit;
            } else {
              console.log(
                '[usePracticeStore] Cannot set operand digit - not null or invalid position'
              );
            }
          } else if (type === 'result' && state.columnarResultDigits) {
            if (state.columnarResultDigits[digitIndex] === null) {
              console.log('[usePracticeStore] Setting result digit:', {
                digitIndex,
                digit,
              });
              state.columnarResultDigits[digitIndex] = digit;
            } else {
              console.log(
                '[usePracticeStore] Cannot set result digit - not null'
              );
            }
          } else {
            console.log(
              '[usePracticeStore] updateColumnarDigit - no matching conditions'
            );
          }
        });

        // Auto-advance to next input
        get().findNextFocusableInput();
      },

      clearColumnarInputs: () => {
        set((state) => {
          if (state.currentQuestion?.columnar_operands) {
            state.columnarOperandDigits =
              state.currentQuestion.columnar_operands.map((row) =>
                row.map((digit) => (digit === undefined ? null : digit))
              );
          }
          if (state.currentQuestion?.columnar_result_placeholders) {
            state.columnarResultDigits =
              state.currentQuestion.columnar_result_placeholders.map((digit) =>
                digit === undefined ? null : digit
              );
          }
          state.activeColumnarInput = null;
        });
      },

      // Navigation helpers
      findNextFocusableInput: () => {
        const state = get();
        const {
          columnarOperandDigits,
          columnarResultDigits,
          activeColumnarInput,
        } = state;

        console.log('[usePracticeStore] findNextFocusableInput called:', {
          hasOperandDigits: !!columnarOperandDigits,
          hasResultDigits: !!columnarResultDigits,
          activeColumnarInput,
        });

        if (!columnarOperandDigits || !columnarResultDigits) {
          console.log('[usePracticeStore] No columnar data available');
          return;
        }

        // If no active input, start from the beginning
        if (!activeColumnarInput) {
          // Look for first empty operand input
          for (let r = 0; r < columnarOperandDigits.length; r++) {
            for (let d = 0; d < columnarOperandDigits[r].length; d++) {
              if (columnarOperandDigits[r][d] === null) {
                console.log('[usePracticeStore] Setting first operand input:', {
                  rowIndex: r,
                  digitIndex: d,
                });
                get().setActiveColumnarInput({
                  type: 'operand',
                  rowIndex: r,
                  digitIndex: d,
                });
                return;
              }
            }
          }

          // If no empty operand inputs, look for empty result inputs
          for (let i = 0; i < columnarResultDigits.length; i++) {
            if (columnarResultDigits[i] === null) {
              console.log('[usePracticeStore] Setting first result input:', {
                digitIndex: i,
              });
              get().setActiveColumnarInput({ type: 'result', digitIndex: i });
              return;
            }
          }

          console.log('[usePracticeStore] No empty inputs found');
          return;
        }

        // Logic to find next focusable input based on current active input
        if (
          activeColumnarInput?.type === 'operand' &&
          activeColumnarInput.rowIndex !== undefined
        ) {
          // Look for next empty operand input in current row
          for (
            let i = activeColumnarInput.digitIndex + 1;
            i < columnarOperandDigits[activeColumnarInput.rowIndex].length;
            i++
          ) {
            if (
              columnarOperandDigits[activeColumnarInput.rowIndex][i] === null
            ) {
              console.log('[usePracticeStore] Setting next operand in row:', {
                rowIndex: activeColumnarInput.rowIndex,
                digitIndex: i,
              });
              get().setActiveColumnarInput({
                type: 'operand',
                rowIndex: activeColumnarInput.rowIndex,
                digitIndex: i,
              });
              return;
            }
          }

          // Look for next empty operand input in next rows
          for (
            let r = activeColumnarInput.rowIndex + 1;
            r < columnarOperandDigits.length;
            r++
          ) {
            for (let d = 0; d < columnarOperandDigits[r].length; d++) {
              if (columnarOperandDigits[r][d] === null) {
                console.log(
                  '[usePracticeStore] Setting next operand in next row:',
                  {
                    rowIndex: r,
                    digitIndex: d,
                  }
                );
                get().setActiveColumnarInput({
                  type: 'operand',
                  rowIndex: r,
                  digitIndex: d,
                });
                return;
              }
            }
          }
        }

        // Look for empty result inputs
        const startIndex =
          activeColumnarInput?.type === 'result'
            ? activeColumnarInput.digitIndex + 1
            : 0;
        for (let i = startIndex; i < columnarResultDigits.length; i++) {
          if (columnarResultDigits[i] === null) {
            console.log('[usePracticeStore] Setting result input:', {
              digitIndex: i,
            });
            get().setActiveColumnarInput({ type: 'result', digitIndex: i });
            return;
          }
        }

        // No more focusable inputs
        console.log('[usePracticeStore] No more focusable inputs');
        get().setActiveColumnarInput(null);
      },

      // Feedback actions
      showFeedback: (
        isCorrect: boolean,
        message?: string,
        correctAnswer?: string | number
      ) => {
        set((state) => {
          state.feedback = {
            isCorrect,
            message: message || (isCorrect ? '答对了！🎉' : '再想想哦 🤔'),
            correctAnswer,
            show: true,
          };
        });
      },

      hideFeedback: () => {
        set((state) => {
          state.feedback = initialFeedback;
        });
      },

      // Help actions
      requestHelp: async () => {
        const { currentQuestion, helpAbortController } = get();
        if (!currentQuestion) return;

        const effectiveSessionId = currentQuestion.session_id;
        if (!effectiveSessionId) return;

        // Abort any existing request
        if (helpAbortController) {
          helpAbortController.abort();
        }

        const newController = new AbortController();

        set((state) => {
          state.help.isLoading = true;
          state.help.isVisible = true;
          state.help.error = null;
          state.helpAbortController = newController;
        });

        try {
          const helpData = await getQuestionHelp(
            effectiveSessionId,
            currentQuestion.id,
            {
              signal: newController.signal,
            }
          );
          set((state) => {
            state.help.data = helpData;
            state.help.isLoading = false;
            state.help.retryCount = 0;
          });
        } catch (error) {
          if (error instanceof AxiosError && error.name === 'CanceledError') {
            console.log('Help request cancelled by user.');
            // State is reset in hideHelp, so no need to set isLoading to false here
            return;
          }

          console.error('Error fetching help:', error);
          set((state) => {
            state.help.isLoading = false;
            state.help.error = {
              type: 'network',
              message: '无法获取帮助，请检查你的网络连接。',
              canRetry: true,
            };
          });
        } finally {
          set((state) => {
            if (state.helpAbortController === newController) {
              state.helpAbortController = null;
            }
          });
        }
      },

      retryHelp: async () => {
        set((state) => {
          state.help.error = null;
          state.help.retryCount += 1;
        });
        await get().requestHelp();
      },

      showHelp: () => {
        set((state) => {
          state.help.isVisible = true;
        });
      },

      hideHelp: () => {
        const { helpAbortController, voiceHelpAbortController } = get();
        if (helpAbortController) {
          helpAbortController.abort();
        }
        if (voiceHelpAbortController) {
          voiceHelpAbortController.abort();
        }
        set((state) => {
          state.help.isVisible = false;
          state.help.isLoading = false; // Explicitly turn off loading
          state.helpAbortController = null;

          // Also reset voice help state on close
          state.voiceHelp.isLoading = false;
          state.voiceHelp.isPlaying = false;
          state.voiceHelp.progress = 0;
          state.voiceHelpAbortController = null;
          // Do not clear the voiceHelp.error so user can see it
        });
      },

      clearHelpError: () => {
        set((state) => {
          state.help.error = null;
        });
      },

      // Voice help actions
      requestVoiceHelp: async (
        audioRef?: RefObject<HTMLAudioElement | null>
      ) => {
        const { currentQuestion, voiceHelpAbortController } = get();
        console.log('[requestVoiceHelp] Starting voice help request', {
          sessionId: currentQuestion?.session_id,
          currentQuestion: !!currentQuestion,
          hasAudioRef: !!audioRef,
        });
        if (!currentQuestion) return;

        const effectiveSessionId = currentQuestion.session_id;
        if (!effectiveSessionId) return;

        if (voiceHelpAbortController) {
          console.log('[requestVoiceHelp] Aborting existing controller');
          voiceHelpAbortController.abort();
        }
        const newController = new AbortController();

        console.log('[requestVoiceHelp] Setting isLoading = true');
        set((state) => {
          state.voiceHelp.isLoading = true;
          state.voiceHelp.error = null;
          state.voiceHelp.isPlaying = false;
          state.voiceHelp.progress = 0;
          state.voiceHelpAbortController = newController;
        });

        try {
          console.log('[requestVoiceHelp] About to call playStreamingAudio');
          await playStreamingAudio(
            effectiveSessionId,
            currentQuestion.id,
            (progress) => {
              console.log('[requestVoiceHelp] onProgress callback', progress);
              set((state) => {
                state.voiceHelp.isPlaying = true;
                state.voiceHelp.progress = progress;
              });
            },
            () => {
              // onComplete
              console.log('[requestVoiceHelp] onComplete callback');
              set((state) => {
                state.voiceHelp.isPlaying = false;
                state.voiceHelp.progress = 100;
              });
            },
            (error) => {
              // onError
              console.log('[requestVoiceHelp] onError callback', error);
              if (
                error.name !== 'AbortError' &&
                error.message !== 'Operation cancelled'
              ) {
                set((state) => {
                  state.voiceHelp.error =
                    error.message || '语音播放时发生错误。';
                });
              }
            },
            { signal: newController.signal, audioRef }
          );
          console.log(
            '[requestVoiceHelp] playStreamingAudio completed successfully'
          );
          // Now that playback has actually started, we can set isLoading to false
          // but keep isPlaying true until the audio completes
          console.log(
            '[requestVoiceHelp] Playback started, setting isLoading = false but keeping isPlaying = true'
          );
          set((state) => {
            state.voiceHelp.isLoading = false;
          });
        } catch (error) {
          console.log(
            '[requestVoiceHelp] playStreamingAudio threw error',
            error
          );
          if ((error as Error).name !== 'AbortError') {
            console.error('Error in requestVoiceHelp:', error);
            set((state) => {
              state.voiceHelp.error = '无法请求语音提示。';
              state.voiceHelp.isLoading = false;
            });
          } else {
            // AbortError - just reset loading state
            set((state) => {
              state.voiceHelp.isLoading = false;
            });
          }
        }

        // Clean up the abort controller reference
        set((state) => {
          if (state.voiceHelpAbortController === newController) {
            state.voiceHelpAbortController = null;
          }
        });
      },

      playVoiceHelp: async () => {
        // This is now handled by requestVoiceHelp, can be kept for future use
        console.warn(
          'playVoiceHelp is deprecated, use requestVoiceHelp instead.'
        );
      },

      stopVoiceHelp: () => {
        set((state) => {
          state.voiceHelp.isPlaying = false;
          state.voiceHelp.progress = 0;
        });
      },

      // Error handling
      setError: (error: string | null) => {
        set((state) => {
          state.error = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      // Loading states
      setLoading: (loading: boolean) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      // Complete reset
      reset: () => {
        set((state) => {
          Object.assign(state, initialState);
        });
      },
    })),
    {
      name: 'practice-store',
    }
  )
);

// Selectors for better performance
export const usePracticeSession = () => {
  const sessionId = usePracticeStore((state) => state.sessionId);
  const session = usePracticeStore((state) => state.session);
  const isSessionOver = usePracticeStore((state) => state.isSessionOver);

  return useMemo(
    () => ({ sessionId, session, isSessionOver }),
    [sessionId, session, isSessionOver]
  );
};

export const usePracticeQuestion = () => {
  const question = usePracticeStore((state) => state.currentQuestion);
  const questionNumber = usePracticeStore((state) => state.questionNumber);
  const totalQuestions = usePracticeStore((state) => state.totalQuestions);
  const animationKey = usePracticeStore((state) => state.questionAnimationKey);

  return useMemo(
    () => ({ question, questionNumber, totalQuestions, animationKey }),
    [question, questionNumber, totalQuestions, animationKey]
  );
};

export const usePracticeAnswer = () => {
  const currentAnswer = usePracticeStore((state) => state.currentAnswer);
  const columnarResultDigits = usePracticeStore(
    (state) => state.columnarResultDigits
  );
  const columnarOperandDigits = usePracticeStore(
    (state) => state.columnarOperandDigits
  );
  const activeColumnarInput = usePracticeStore(
    (state) => state.activeColumnarInput
  );
  const isAnswerSubmitted = usePracticeStore(
    (state) => state.isAnswerSubmitted
  );

  return useMemo(
    () => ({
      currentAnswer,
      columnarResultDigits,
      columnarOperandDigits,
      activeColumnarInput,
      isAnswerSubmitted,
    }),
    [
      currentAnswer,
      columnarResultDigits,
      columnarOperandDigits,
      activeColumnarInput,
      isAnswerSubmitted,
    ]
  );
};

export const usePracticeProgress = () => {
  const score = usePracticeStore((state) => state.score);
  const questionNumber = usePracticeStore((state) => state.questionNumber);
  const totalQuestions = usePracticeStore((state) => state.totalQuestions);

  return useMemo(
    () => ({ score, questionNumber, totalQuestions }),
    [score, questionNumber, totalQuestions]
  );
};

export const usePracticeUI = () => {
  const isLoading = usePracticeStore((state) => state.isLoading);
  const error = usePracticeStore((state) => state.error);
  const feedback = usePracticeStore((state) => state.feedback);

  return useMemo(
    () => ({ isLoading, error, feedback }),
    [isLoading, error, feedback]
  );
};

export const usePracticeHelp = () => {
  const help = usePracticeStore((state) => state.help);
  const voiceHelp = usePracticeStore((state) => state.voiceHelp);

  return useMemo(() => ({ help, voiceHelp }), [help, voiceHelp]);
};
