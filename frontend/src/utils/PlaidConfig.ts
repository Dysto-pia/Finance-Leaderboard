/**
 * Plaid configuration and helper functions
 */

export const PLAID_ENV = "sandbox";

// Check if a response from Plaid API contains an error
export const hasPlaidError = (response: any): boolean => {
  return (
    response &&
    response.error &&
    (response.error.error_code || response.error.error_message)
  );
};

// Format a Plaid error for display
export const formatPlaidError = (error: any): string => {
  if (!error) return "Unknown error";

  // Case 1: Plaid API error object
  if (error.error_code) {
    return `${error.error_code}: ${error.error_message || "Unknown error"}`;
  }

  // Case 2: Standard error object
  if (error.message) {
    return error.message;
  }

  // Case 3: String error
  if (typeof error === "string") {
    return error;
  }

  // Fallback
  return "Unknown error occurred";
};

// Helper for consistent error logging
export const logPlaidError = (context: string, error: any) => {
  console.error(`Plaid Error (${context}):`, error);
  if (error.response && error.response.data) {
    console.error("API Response:", error.response.data);
  }
};
