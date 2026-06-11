import { apiPost } from "@/utils/apiClient";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export interface AccountDeletionRequestResponse {
  data: {
    status: string;
    requested_at: string;
    scheduled_deletion_at: string;
  };
}

// Calls the in-app account deletion initiation endpoint required by App Store review.
export async function requestAccountDeletion(): Promise<AccountDeletionRequestResponse> {
  const response = await apiPost(`${API_BASE_URL}/account/delete-request`);

  if (!response.ok) {
    let message = "Unable to submit account deletion request. Please try again.";
    try {
      const errorData = await response.json();
      message = errorData?.error?.message ?? message;
    } catch {
      // Keep the default message when the server response is not JSON.
    }
    throw new Error(message);
  }

  return response.json();
}
