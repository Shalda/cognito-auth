export interface UserAuthData  {
  idToken?: string,
  accessToken: string,
  user?: string,
}
export interface EnvironmentData {
  tenantId: string,
  clientId: string,
  redirectUri: string,
  logoutPath: string
}
