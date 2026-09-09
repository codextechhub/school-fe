/** The access credential lives only for the lifetime of this JavaScript context. */
let accessToken = "";

export function getAccessToken(): string {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token && token !== "undefined" ? token : "";
}

export function clearAccessToken(): void {
  accessToken = "";
}
