import { getAuthToken } from './rbacAuth';

const isBrowser = typeof window !== 'undefined';

const resolveApiBaseUrl = () => {
  const envApiUrl = import.meta.env.VITE_API_URL?.trim();
  if (envApiUrl) {
    return envApiUrl.replace(/\/$/, '');
  }

  if (!isBrowser) {
    return 'http://localhost:5000/api';
  }

  const { hostname } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  return isLocalhost ? 'http://localhost:5000/api' : '/api';
};

const API_BASE_URL = resolveApiBaseUrl();
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET?.trim();

type ApiResponse<T> = {
  success?: boolean;
  ok?: boolean;
  error?: string;
  message?: string;
} & T;

/** Never show Netlify 404 HTML/CSS or other markup as an error message. */
const sanitizeErrorMessage = (raw: string | undefined, status: number): string => {
  const text = (raw || '').trim();
  if (!text) {
    if (status === 401 || status === 403) return 'Invalid email or password.';
    if (status === 404) return 'Auth service not available. Check backend / GO_API_URL.';
    if (status === 409) return 'Email already registered.';
    if (status >= 500) return 'Server error. Please try again.';
    return 'Request failed.';
  }

  const looksLikeHtml =
    text.startsWith('<!') ||
    text.startsWith('<html') ||
    text.includes('<style') ||
    text.includes('colorRgbFacets') ||
    text.includes('Page not found') ||
    text.includes('netlify');

  if (looksLikeHtml) {
    if (status === 404) {
      return 'Cannot reach auth API. Set VITE_API_URL or GO_API_URL to your Go backend (MySQL).';
    }
    return 'Server returned an unexpected response. Please try again.';
  }

  // Cap length so a long body never floods the UI
  return text.length > 180 ? `${text.slice(0, 180)}…` : text;
};

const parseResponseData = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return (await response.json()) as ApiResponse<T>;
    } catch {
      return {
        success: false,
        error: `Invalid JSON response (${response.status})`,
      } as ApiResponse<T>;
    }
  }

  const rawText = await response.text();
  return {
    success: response.ok,
    error: sanitizeErrorMessage(rawText, response.status),
  } as ApiResponse<T>;
};

const apiRequest = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        ...(ADMIN_SECRET ? { 'x-admin-secret': ADMIN_SECRET } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Unable to connect to server. Is the Go backend (MySQL) running?');
  }

  const data = await parseResponseData<T>(response);
  const isSuccessful = response.ok && (data.success ?? data.ok ?? true);

  if (!isSuccessful) {
    const msg = sanitizeErrorMessage(data.error || data.message, response.status);
    throw new Error(msg);
  }

  return data as T;
};

/** Register student — password is bcrypt-hashed and stored in MySQL by Go backend. */
export const apiRegisterUser = async (payload: { name: string; email: string; password: string }) =>
  apiRequest<{ token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/** Login — verifies email + password against MySQL (bcrypt). */
export const apiRoleLogin = async (payload: {
  email: string;
  password: string;
  role: 'student' | 'admin';
}) => {
  const endpoint = payload.role === 'admin' ? '/auth/login/staff' : '/auth/login/student';
  return apiRequest<{ token: string; user: any }>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
};

export const apiSendOtp = async (email: string) =>
  apiRequest<{ cooldownSeconds: number }>('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const apiVerifyOtp = async (payload: { email: string; otp: string }) =>
  apiRequest<{ message: string }>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const apiGetCourses = () => apiRequest<{ data: any[] }>('/courses');
export const apiGetProfileDashboard = () => apiRequest<{ data: any }>('/profile/dashboard');
export const apiGetProblemSubmissions = () =>
  apiRequest<{ data: { problemKey: string; status: string }[] }>('/problems/submissions');
export const apiSubmitProblem = (
  problemKey: string,
  payload: {
    name: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    status: 'Accepted' | 'Attempted';
  },
) =>
  apiRequest<{ data: any }>(`/problems/${encodeURIComponent(problemKey)}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
export const apiCreateCourse = (payload: Record<string, unknown>) =>
  apiRequest<{ data: any }>('/courses', { method: 'POST', body: JSON.stringify(payload) });
export const apiUpdateCourse = (id: string, payload: Record<string, unknown>) =>
  apiRequest<{ data: any }>(`/courses?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
export const apiDeleteCourse = (id: string) =>
  apiRequest<{ message: string }>(`/courses?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

export const apiGetPendingStudents = () => apiRequest<{ data: any[] }>('/students/pending');
export const apiVerifyStudent = (id: string, action: 'approve' | 'reject') =>
  apiRequest<{ data: any }>(`/students/${id}/verification`, {
    method: 'PATCH',
    body: JSON.stringify({
      action,
      // Backend accepts status (verified|rejected); also send action for compatibility
      status: action === 'approve' ? 'verified' : 'rejected',
    }),
  });
export const apiSubmitCollegeVerification = (file: File) => {
  const formData = new FormData();
  formData.append('document', file);
  return apiRequest<{ data: { id: string; status: string; fileName: string } }>('/college-verification', {
    method: 'POST',
    body: formData,
  });
};

export const apiFetchVerificationDocument = async (verificationId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/admin/verifications/${encodeURIComponent(verificationId)}/document`,
    {
      headers: {
        ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        ...(ADMIN_SECRET ? { 'x-admin-secret': ADMIN_SECRET } : {}),
      },
    },
  );
  if (!response.ok) {
    throw new Error('Unable to load verification document');
  }
  return response.blob();
};
