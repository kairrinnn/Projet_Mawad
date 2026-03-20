import { toast } from "sonner";

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * A wrapper around fetch to centralize error handling and toast notifications.
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Erreur ${response.status}`;
      toast.error(errorMessage);
      return { data: null, error: errorMessage };
    }

    return { data, error: null };
  } catch (err: any) {
    const errorMessage = "Erreur de connexion au serveur";
    toast.error(errorMessage);
    console.error(`API Request Error [${url}]:`, err);
    return { data: null, error: errorMessage };
  }
}
