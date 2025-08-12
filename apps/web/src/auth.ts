import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'shorturi_token';

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  const t = getToken();
  if (!t) return false;
  try {
    const decoded: any = jwtDecode(t);
    if (!decoded?.exp) return true;
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}


