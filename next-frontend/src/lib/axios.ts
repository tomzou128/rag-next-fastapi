import axios, { AxiosError, AxiosResponse } from "axios";

export const API_URL = "/api/backend";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor for error handling
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (axios.isAxiosError(error)) {
      console.error("Axios Error:", error);

      if (error.response) {
        // Server responded with an error status
        console.error("Server responded with status:", error.response.status);
        console.error("Response data:", error.response.data);
        return Promise.reject(
          new Error(
            error.response.data?.detail ||
              `Request failed with status: ${error.response.status}`,
          ),
        );
      } else if (error.request) {
        // Request made, but no response received
        console.error("No response received:", error.request);
        return Promise.reject(
          new Error("No response received from the server."),
        );
      } else {
        console.error("Unexpected Error:", error.message);
        return Promise.reject(new Error(`Unexpected Error: ${error.message}`));
      }
    } else {
      // Non-Axios error
      console.error("Non-Axios Error:", error);
      return Promise.reject(error);
    }
  },
);

export default axiosInstance;
