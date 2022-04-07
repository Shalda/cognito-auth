import {Inject, Injectable} from '@angular/core';
import {EnvironmentData} from "./ngx-bstal-aws.model";
import {
  CognitoAccessToken, CognitoIdToken, CognitoRefreshToken,
  CognitoUser,
  CognitoUserPool,
  CognitoUserSession, ICognitoUserSessionData,
} from "amazon-cognito-identity-js";
import {ActivatedRoute, Router} from "@angular/router";
import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";
import {BehaviorSubject, catchError, Observable, of, tap, throwError} from "rxjs";

interface TokenResponse {
  access_token: string,
  id_token: string,
  refresh_token: string
}

@Injectable({
  providedIn: 'root'
})
export class AwsAuthService {
  private _REGION = this.env.region;
  private _DOMAIN = this.env.domainName;
  private _POOL_ID = this.env.cognitoUserPoolId;
  private _CLIENT_ID = this.env.cognitoAppClientId;
  private _REDIRECT_DOMAIN = this.env.redirectDomain;

  private _COGNITO_URL = `https://${this._DOMAIN}.auth.${this._REGION}.amazoncognito.com/`;
  private _LOGIN_URL = `${this._COGNITO_URL}/login?client_id=${this._CLIENT_ID}&response_type=code&scope=aws.cognito.signin.user.admin+email+openid+profile&redirect_uri=${this._REDIRECT_DOMAIN}`;
  private _TOKEN_URL = `https://${this._DOMAIN}.auth.${this._REGION}.amazoncognito.com/oauth2/token`;

  private _codeGrant: string | null = null;
  private _cognitoUser: CognitoUser | null = null;
  private _userSession!: CognitoUserSession;
  private _userPool = new CognitoUserPool({
    UserPoolId: this._POOL_ID,
    ClientId: this._CLIENT_ID
  });

  private _idToken!: CognitoIdToken;
  private _accessToken!: CognitoAccessToken;
  private _refreshToken!: CognitoRefreshToken;

  private _authStatus$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(
    @Inject('env') private env: EnvironmentData,
    private _router: Router,
    private _route: ActivatedRoute,
    private _http: HttpClient
  ) {
  }

  public getAuthStatus(): Observable<boolean> {
    return this._authStatus$.asObservable();
  }

  public setAuthStatus(val: boolean): void {
    this._authStatus$.next(val);
  }

  public logIn(): void {
    window.location.href = this._LOGIN_URL
  }

  public logout() {
    if (this._cognitoUser) {
      this._cognitoUser.signOut();
      this._cognitoUser = null;
      this.setAuthStatus(false);
    }
  }


  public checkToken() {
    // if user and tokens available in local storage verify the token and try to refresh them if needed
    if (this._getUser() !== null) {
      return this._sessionValidation();
    }
    // if url contains auth code grant after redirect from Hosted UI call getToken api
    else if (window.location.href.indexOf("code")) {
      this._getAuthCode();
      if (this._codeGrant) {
        return this._tokenRequest(this._codeGrant).subscribe(res => console.log('response', res))
      }
    }
  }

  private _sessionValidation(){
    this._cognitoUser?.getSession((error: Error | null, session: null | CognitoUserSession): any => {
        if (error) {
          this.setAuthStatus(false);
          console.log('error', error.message || JSON.stringify(error));
          return throwError(() => error);
        }
        if (session) {
          console.log('session validity: ' + session.isValid());
          const now = Math.floor(new Date().getTime() / 1000);
          // @ts-ignore
          console.log('token is alive: ', now < session?.getAccessToken().getExpiration() && now < session?.getIdToken().getExpiration());
          // @ts-ignore
          console.log(`Now is ${new Date(new Date().getTime()).toLocaleTimeString()}, Access Token expiration time is: ${new Date(new Date(session?.getAccessToken().getExpiration()).getTime() * 1000).toLocaleTimeString()} and Id Token expiration time is: ${new Date(new Date(session?.getIdToken().getExpiration()).getTime() * 1000).toLocaleTimeString()}`);
          this.setAuthStatus(true);
          return of(session)
        }
      }
    )
  }

  private _getUser(): CognitoUser | null {
    // set cognito user using data from localStorage
    return this._cognitoUser = this._userPool.getCurrentUser();
  }

  // get authorization code grant after login with Hosted UI
  private _getAuthCode() {
    const params = new URLSearchParams(window.location.search)
    if (params.has('code')) {
      this._codeGrant = params.get('code');
    }
  }

  private _tokenRequest(code: string) {
    let options = {
      headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')
    };

    let param = new HttpParams()
      .set("grant_type", "authorization_code")
      .set("code", code)
      .set("client_id", this.env.cognitoAppClientId)
      .set("redirect_uri", this.env.redirectDomain)

    return this._http.post<TokenResponse>(this._TOKEN_URL, param, options)
      .pipe(
        tap(res => {
          if (res.id_token) {
            this._saveTokens(res);
            this._createSession();
            this.createCognitoUser();
            this.setAuthStatus(true);
          }
        }),
        catchError((error) => {
          if (error.error.error == 'invalid_grant') {
            this.logIn();
          }
          this.setAuthStatus(false);
          return throwError(() => error);
        }),
      )
  }

  private _createSession() {
    const sessionData: ICognitoUserSessionData = {
      IdToken: this._idToken,
      AccessToken: this._accessToken,
      RefreshToken: this._refreshToken
    }
    this._userSession = new CognitoUserSession(sessionData);
  }

  public getUser() {
    console.log('user', this._cognitoUser)
    return this._cognitoUser
  }

  private _saveTokens(res: TokenResponse) {
    this._accessToken = new CognitoAccessToken({AccessToken: res.access_token});
    this._idToken = new CognitoIdToken({IdToken: res.id_token});
    this._refreshToken = new CognitoRefreshToken({RefreshToken: res.refresh_token})
  }

  createCognitoUser() {
    const userName: string = this._userSession.getIdToken().payload['cognito:username'];
    this._cognitoUser = new CognitoUser({Username: userName, Pool: this._userPool})
    this._cognitoUser.setSignInUserSession(this._userSession)
  }
}
