export interface UserAuthData  {
  idToken?: string,
  accessToken: string,
  user?: string,
}
export interface EnvironmentData {
  cognitoUserPoolId: string,
  cognitoAppClientId: string
  domainName: string,
  region: string,
  redirectDomain:string,
  afterLoginRedirect: string
}
