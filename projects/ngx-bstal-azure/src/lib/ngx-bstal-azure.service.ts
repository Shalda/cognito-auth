import {Inject, Injectable, OnDestroy} from '@angular/core';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { EventMessage, EventType, InteractionRequiredAuthError, InteractionStatus } from '@azure/msal-browser';
import { AuthenticationResult } from '@azure/msal-common';
import {BehaviorSubject, defer, from, Observable, Subject, of, Subscription} from 'rxjs';
import { filter, map, take, takeUntil, catchError } from 'rxjs/operators';
import { EnvironmentData, UserAuthData } from './ngx-bstal-azure.model';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class AzureAuthService implements OnDestroy {
  private loginVal = false;
  private _authStatus$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _userData!: UserAuthData | null;

  private readonly _destroying$ = new Subject<void>();
  private _acquireTokenSubscription!: Subscription;

  constructor(
    @Inject('env') private env: EnvironmentData,
    private _authService: MsalService,
    private msalBroadcastService: MsalBroadcastService,
    private _router: Router
  ) {
    this._authStatusListener(); // load MSAL status listeners
    this._acquireTokenSubscription = this.checkToken().subscribe(); // refresh tokens if it's needed
    this._isLoggedIn(); // get active user from autDataStorage and set authState
  }

  public getAuthStatus(): Observable<boolean> {
    return this._authStatus$.asObservable();
  }

  public setAuthStatus(val: boolean, noRedirect?: boolean): void {
    this._authStatus$.next(val);
    if (!val) {
      this._userData = null;
      if (!noRedirect)
        this._router.navigateByUrl(this.env.logoutPath);
    }
  }

  public logIn(): Observable<UserAuthData | null> {
    return this._authService.loginPopup().pipe(
      map((response: AuthenticationResult) => {
        if (response.account) {
          this._authService.instance.setActiveAccount(response.account);
          this._saveTokens(
            response.account.username,
            response.idToken,
            response.accessToken
          );
          return {
            accessToken: response.idToken,
            idToken: response.idToken,
            user: response.account.username
          };
        } else return null;
      })
    );
  }

  public logOut(): void {
    this._authService.logoutPopup().subscribe({
      next: () => {
        this.setAuthStatus(false)
      },
      error: (err) => {
        console.log(err);
      }
    });
  }

  //checkToken() checks the cache for a valid token and returns it.
  // When no valid token is in the cache, it attempts to use its refresh token.
  // If the refresh token's 24-hour lifetime has expired,
  // MSAL.js will open a hidden iframe to silently request a new authorization code
  public checkToken(redirect?: boolean): Observable<boolean> {
    //first check and set active from cache
    this._checkAndSetActiveAccount();
    const account = this._authService.instance.getActiveAccount();
    if (account) {
      const tokenRequest = {
        scopes: ['user.read'],
        account
      };
      // by default acquireTokenSilent() returns Promise, so wrap with RxJs methods to work with Observable
      const checkToken$ = defer(() =>
        from(this._authService.instance.acquireTokenSilent(tokenRequest))
      );
      // in case browser blocked hidden iframe, that needed for refresh token update, use acquireTokenPopup()
      const checkTokenWithPopUp$ = defer(() =>
        from(this._authService.instance.acquireTokenPopup(tokenRequest))
      );
      return checkToken$.pipe(
        take(1),
        map((tokenResponse: AuthenticationResult) => {
          this._saveTokens(
            tokenResponse.account?.username,
            tokenResponse.idToken,
            tokenResponse.accessToken
          );
          return true;
        }),
        catchError((error) => {
          if (error instanceof InteractionRequiredAuthError) {
            // if client browser blocked silent token refresh use popup refresh
            return checkTokenWithPopUp$.pipe(
              take(1),
              map((tokenResponse: AuthenticationResult) => {
                this._saveTokens(
                  tokenResponse.account?.username,
                  tokenResponse.idToken,
                  tokenResponse.accessToken
                );
                return true;
              }),
              catchError(() => {
                return this._tokenCheckFailed(redirect)
              })
            );
          } else {
            console.log('Caught in acquireTokenSilent. Returning false');
            return this._tokenCheckFailed(redirect)
          }
        })
      );
    } else {
      return this._tokenCheckFailed(redirect)
    }
  }

  private _tokenCheckFailed(redirect?: boolean) {
    if (redirect === false) {
      this.setAuthStatus(false, true);
    } else {
      this.setAuthStatus(false)
    }
    return of(false);
  }

  private _authStatusListener(): void {
    // Optional - This will enable ACCOUNT_ADDED and ACCOUNT_REMOVED events emitted when a user logs in or out of another tab or window
    this._authService.instance.enableAccountStorageEvents();
    this.msalBroadcastService.msalSubject$
      .pipe(
        // autohandlering events after login operations or acquire tokens
        filter(
          (msg: EventMessage) =>
            msg.eventType === EventType.ACCOUNT_ADDED ||
            msg.eventType === EventType.ACCOUNT_REMOVED ||
            msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
        )
      )
      .subscribe((result: EventMessage) => {
        if (this._authService.instance.getAllAccounts().length === 0) {
          //  if no users detected
          this._router.navigateByUrl(this.env.logoutPath);
        } else {
          this._isLoggedIn();
        }
      });
    // check if interaction is complete and an account is signed
    this.msalBroadcastService.inProgress$
      .pipe(
        filter(
          (status: InteractionStatus) => status === InteractionStatus.None
        ),
        takeUntil(this._destroying$)
      )
      .subscribe(() => {
        this._isLoggedIn();
        this._checkAndSetActiveAccount();
      });
  }

  private _isLoggedIn(): void {
    this.loginVal = this._authService.instance.getAllAccounts().length > 0;
    this.setAuthStatus(this.loginVal);
  }

  public getUserData(): UserAuthData | null {
    return this._userData || null;
  }

  private _saveTokens(
    accountName: string | undefined,
    idToken: string,
    accessToken: string
  ): void {
    this._userData = {
      user: accountName,
      idToken: idToken,
      accessToken: accessToken
    };
  }

  private _checkAndSetActiveAccount(): void {
    /**
     * If no active account set but there are accounts signed in, sets first account to active account
     */
    const activeAccount = this._authService.instance.getActiveAccount();
    if (
      !activeAccount &&
      this._authService.instance.getAllAccounts().length > 0
    ) {
      const accounts = this._authService.instance.getAllAccounts();
      this._authService.instance.setActiveAccount(accounts[0]);
    }
  }

  ngOnDestroy(): void {
    this._acquireTokenSubscription.unsubscribe();
    this._destroying$.next(undefined);
    this._destroying$.complete();
  }
}


