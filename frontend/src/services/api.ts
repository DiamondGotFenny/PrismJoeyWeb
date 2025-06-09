import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Adjust if backend runs elsewhere

export interface DifficultyLevel {
  id: number;
  name: string;
  code: string;
  max_number: number;
  allow_carry: boolean;
  allow_borrow: boolean;
  operation_types: string[];
  order: number;
}

// Fetch difficulty levels
export const getDifficultyLevels = async (): Promise<DifficultyLevel[]> => {
  try {
    const response = await axios.get<DifficultyLevel[]>(
      `${API_BASE_URL}/difficulty/levels`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching difficulty levels:', error);
    throw error;
  }
};

// Placeholder for future API functions related to practice sessions
export interface Question {
  id: string; // UUID
  session_id: string; // UUID
  operands: number[];
  operations: string[];
  question_string: string;
  correct_answer: number;
  difficulty_level_id: number;
  question_type: string;
  columnar_operands?: (number | null)[][];
  columnar_result_placeholders?: (number | null)[];
  columnar_operation?: string;
  created_at: string; // ISO datetime string
  user_answer?: number;
  is_correct?: boolean;
  time_spent?: number; // seconds
  answered_at?: string; // ISO datetime string
}

export interface PracticeSession {
  id: string; // UUID
  user_id?: string;
  difficulty_level_id: number;
  total_questions_planned: number;
  questions: Question[];
  current_question_index: number;
  score: number;
  start_time: string; // ISO datetime string
  end_time?: string; // ISO datetime string
  difficulty_level_details?: DifficultyLevel;
}

export interface AnswerPayload {
  session_id: string; // UUID
  question_id: string; // UUID
  user_answer?: number; // For arithmetic
  time_spent?: number;
  user_filled_operands?: number[][]; // For columnar
  user_filled_result?: number[]; // For columnar
}

export const startPracticeSession = async (
  difficultyLevelId: number,
  totalQuestions: number = 10
): Promise<PracticeSession> => {
  try {
    const response = await axios.post<PracticeSession>(
      `${API_BASE_URL}/practice/start`,
      {
        difficulty_level_id: difficultyLevelId,
        total_questions: totalQuestions,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error starting practice session:', error);
    throw error;
  }
};

export const getNextQuestion = async (sessionId: string): Promise<Question> => {
  try {
    const response = await axios.get<Question>(
      `${API_BASE_URL}/practice/question?session_id=${sessionId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching next question:', error);
    throw error;
  }
};

export const submitAnswer = async (
  payload: AnswerPayload
): Promise<Question> => {
  try {
    const response = await axios.post<Question>(
      `${API_BASE_URL}/practice/answer`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
};

export const getPracticeSummary = async (
  sessionId: string
): Promise<PracticeSession> => {
  try {
    const response = await axios.get<PracticeSession>(
      `${API_BASE_URL}/practice/summary?session_id=${sessionId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching practice summary:', error);
    throw error;
  }
};

// Help/Hint functionality
export interface HelpRequest {
  session_id: string;
  question_id: string;
}

export interface HelpResponse {
  help_content: string;
  thinking_process: string;
  solution_steps: string[];
}

export const getQuestionHelp = async (
  sessionId: string,
  questionId: string,
  options?: { signal?: AbortSignal }
): Promise<HelpResponse> => {
  try {
    const response = await axios.post<HelpResponse>(
      `${API_BASE_URL}/practice/help`,
      {
        session_id: sessionId,
        question_id: questionId,
      },
      { signal: options?.signal }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching question help:', error);
    throw error;
  }
};

export const getQuestionVoiceHelp = async (
  sessionId: string,
  questionId: string
): Promise<Blob> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/practice/voice-help`,
      {
        session_id: sessionId,
        question_id: questionId,
      },
      {
        responseType: 'blob',
        headers: {
          Accept: 'audio/mpeg',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching voice help:', error);
    throw error;
  }
};

export const getQuestionVoiceHelpStream = async (
  sessionId: string,
  questionId: string
): Promise<ReadableStream<Uint8Array> | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/practice/voice-help-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        session_id: sessionId,
        question_id: questionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body available for streaming');
    }

    return response.body;
  } catch (error) {
    console.error('Error fetching streaming voice help:', error);
    throw error;
  }
};

// Utility function to convert ReadableStream to playable audio
export const streamToAudio = async (
  stream: ReadableStream<Uint8Array>,
  onChunk?: (chunk: Uint8Array) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
): Promise<void> => {
  try {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Create a blob from all chunks and play it
        const audioBlob = new Blob(chunks as BlobPart[], {
          type: 'audio/mpeg',
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          onComplete?.();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          onError?.(new Error('Audio playback error'));
        };

        await audio.play();
        break;
      }

      if (value) {
        chunks.push(value);
        onChunk?.(value);
      }
    }
  } catch (error) {
    console.error('Error processing audio stream:', error);
    onError?.(error as Error);
  }
};

// Alternative streaming approach for better real-time playback
export const playStreamingAudio = async (
  sessionId: string,
  questionId: string,
  onProgress?: (loaded: number) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
  options?: {
    signal?: AbortSignal;
    audioRef?: React.MutableRefObject<HTMLAudioElement | null>;
  }
): Promise<void> => {
  let audio: HTMLAudioElement | null = null;

  const cleanup = () => {
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    audio = null;
    if (options?.audioRef) {
      options.audioRef.current = null;
    }
  };

  const signal = options?.signal;

  if (signal?.aborted) {
    onError?.(new Error('Operation cancelled pre-flight'));
    return;
  }

  const abortListener = () => {
    cleanup();
    onError?.(new Error('Operation cancelled'));
  };

  signal?.addEventListener('abort', abortListener);

  try {
    const response = await fetch(`${API_BASE_URL}/practice/voice-help-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        session_id: sessionId,
        question_id: questionId,
      }),
      signal: signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body available for streaming');
    }

    // Create a MediaSource for progressive playback
    if ('MediaSource' in window) {
      const mediaSource = new MediaSource();
      audio = new Audio();
      if (options?.audioRef) {
        options.audioRef.current = audio;
      }
      audio.src = URL.createObjectURL(mediaSource);

      const onEnded = () => {
        cleanup();
        signal?.removeEventListener('abort', abortListener);
      };

      const onErrorCleanup = (err: Error) => {
        onError?.(err);
        cleanup();
        signal?.removeEventListener('abort', abortListener);
      };

      audio.onended = onEnded;
      audio.onerror = () => onErrorCleanup(new Error('Audio playback error'));

      mediaSource.addEventListener('sourceopen', async () => {
        if (signal?.aborted) return;
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          const reader = response.body!.getReader();
          let totalLoaded = 0;

          const pump = async (): Promise<void> => {
            if (signal?.aborted) {
              reader.cancel().catch(() => {});
              cleanup();
              return;
            }
            const { done, value } = await reader.read();

            if (done) {
              if (mediaSource.readyState === 'open' && !sourceBuffer.updating) {
                try {
                  mediaSource.endOfStream();
                } catch (e) {
                  console.warn('Error during endOfStream:', e);
                }
              }
              onComplete?.();
              return;
            }

            if (value) {
              totalLoaded += value.length;
              onProgress?.(totalLoaded);

              await new Promise<void>((resolve, reject) => {
                const onUpdateEnd = () => {
                  sourceBuffer.removeEventListener('updateend', onUpdateEnd);
                  sourceBuffer.removeEventListener('error', onErrorEvent);
                  resolve();
                };
                const onErrorEvent = (e: Event) => {
                  sourceBuffer.removeEventListener('updateend', onUpdateEnd);
                  sourceBuffer.removeEventListener('error', onErrorEvent);
                  reject(e);
                };

                sourceBuffer.addEventListener('updateend', onUpdateEnd);
                sourceBuffer.addEventListener('error', onErrorEvent);
                try {
                  sourceBuffer.appendBuffer(value);
                } catch (e) {
                  reject(e);
                }
              });
              await pump();
            }
          };

          if (audio) {
            audio.addEventListener(
              'canplay',
              () => {
                if (signal?.aborted) {
                  cleanup();
                  return;
                }
                audio
                  ?.play()
                  .then(() => {
                    // playback started
                  })
                  .catch((err) => {
                    if ((err as Error).name !== 'AbortError') {
                      onErrorCleanup(err);
                    } else {
                      cleanup();
                    }
                  });
              },
              { once: true }
            );
          }

          await pump();
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            onErrorCleanup(error as Error);
          } else {
            cleanup();
          }
        }
      });
    } else {
      // Fallback: collect all chunks then play
      await streamToAudio(
        response.body,
        onProgress ? (chunk) => onProgress(chunk.length) : undefined,
        onComplete,
        onError
      );
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Error playing streaming audio:', error);
      onError?.(error as Error);
    }
    cleanup();
  }
};

// Ultra-optimized streaming with immediate audio feedback
export const playUltraStreamingAudio = async (
  sessionId: string,
  questionId: string,
  onProgress?: (loaded: number) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/practice/voice-help-stream-ultra`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: questionId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body available for streaming');
    }

    // Create a MediaSource for progressive playback
    if ('MediaSource' in window) {
      const mediaSource = new MediaSource();
      const audio = new Audio();
      audio.src = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener('sourceopen', async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          const reader = response.body!.getReader();
          let totalLoaded = 0;

          const pump = async (): Promise<void> => {
            const { done, value } = await reader.read();

            if (done) {
              if (mediaSource.readyState === 'open') {
                mediaSource.endOfStream();
              }
              onComplete?.();
              return;
            }

            if (value) {
              totalLoaded += value.length;
              onProgress?.(totalLoaded);

              // Wait for the source buffer to be ready
              await new Promise<void>((resolve) => {
                if (!sourceBuffer.updating) {
                  resolve();
                } else {
                  sourceBuffer.addEventListener('updateend', () => resolve(), {
                    once: true,
                  });
                }
              });

              sourceBuffer.appendBuffer(value);
              await pump();
            }
          };

          // Start playback as soon as we have some data
          audio.addEventListener(
            'canplay',
            () => {
              audio.play().catch(onError);
            },
            { once: true }
          );

          audio.onerror = () => onError?.(new Error('Audio playback error'));

          await pump();
        } catch (error) {
          onError?.(error as Error);
        }
      });
    } else {
      // Fallback: collect all chunks then play
      await streamToAudio(
        response.body,
        onProgress ? (chunk) => onProgress(chunk.length) : undefined,
        onComplete,
        onError
      );
    }
  } catch (error) {
    console.error('Error playing ultra streaming audio:', error);
    onError?.(error as Error);
  }
};
