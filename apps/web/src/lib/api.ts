export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(5000),
    headers: isFormData
      ? options.headers
      : { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });

  if (!res.ok) {
    let message = `Lỗi ${res.status}`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text() as unknown as T;
}

/** Một số lệnh phải gọi sang Zalo (tải danh sách nhóm, gửi tin) nên cần hạn chờ dài hơn 5 giây mặc định. */
const slow = (timeoutMs: number): RequestInit => ({ signal: AbortSignal.timeout(timeoutMs) });

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'DELETE' }),
  slow,
};
