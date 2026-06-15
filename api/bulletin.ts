import { apiPost, apiRequest } from "@/utils/apiClient";
import { getAccessToken } from "@/utils/tokenStorage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/** Viewer's attempt on the daily quiz (present once attempted; answer revealed). */
export interface BulletinQuizAttempt {
  is_correct: boolean;
  /** 1-based; null = the 15-second timer expired without an answer. */
  selected_option_index: number | null;
  answer_option_index: number;
  explanation: string | null;
}

export interface BulletinQuiz {
  id: number;
  question: string;
  /** Four option texts; the correct index is hidden until attempted. */
  options: string[];
  attempt: BulletinQuizAttempt | null;
}

/** Today's locality bulletin: weather + AI summary + quiz. */
export interface Bulletin {
  id: number;
  locality_id: number;
  hashtag: string;
  locality_name: string;
  date: string;
  weather: {
    min_temp: number | null;
    max_temp: number | null;
    humidity: number | null;
    rain_probability: number | null;
    avg_aqi: number | null;
    pollen: number | null;
  } | null;
  weather_source: string | null;
  summary: string | null;
  quiz: BulletinQuiz | null;
}

export interface QuizAttemptResult {
  quiz_id: number;
  is_correct: boolean;
  selected_option_index: number | null;
  answer_option_index: number;
  explanation: string | null;
}

/**
 * Today's bulletin for a hashtag, or null when the locality has no generated content yet (it's
 * picked up by the next 8 AM run). Public read — the token is attached when present so the
 * response includes the viewer's attempt status.
 */
export async function fetchBulletin(hashtag: string): Promise<Bulletin | null> {
  const url = `${API_BASE_URL}/api/v1/bulletin?hashtag=${encodeURIComponent(hashtag)}`;
  const token = await getAccessToken();
  const response = await apiRequest(url, {
    method: "GET",
    skipAuth: true,
    timeout: 15_000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch bulletin: ${response.status} - ${errorText}`);
  }

  const json = await response.json();
  return json.data ?? null;
}

/**
 * Submits the user's single attempt. Pass null when the 15-second timer ran out — recorded as a
 * missed, incorrect attempt. The backend rejects a second attempt with 409.
 */
export async function submitQuizAttempt(
  quizId: number,
  selectedOptionIndex: number | null,
): Promise<QuizAttemptResult> {
  const url = `${API_BASE_URL}/api/v1/quiz/${quizId}/attempt`;
  const response = await apiPost(
    url,
    { selected_option_index: selectedOptionIndex },
    { headers: { "Content-Type": "application/json" } },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to submit attempt: ${response.status} - ${errorText}`);
  }

  const json = await response.json();
  return json.data;
}
