import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import {
  MsalBroadcastService,
  MsalService,
  MSAL_INSTANCE,
} from '@azure/msal-angular';
import {
  BrowserCacheLocation,
  IPublicClientApplication,
  PublicClientApplication
} from '@azure/msal-browser';

import { EnvironmentData } from './ngx-bstal-azure.model';
import { AzureAuthService } from './ngx-bstal-azure.service';

const AUTH_CONFIG = new InjectionToken<string>('AUTH_CONFIG');

// MSAL instance to be passed to msal-angular
export function MSALInstanceFactory(config: EnvironmentData): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: config.clientId, // This is your client ID
      authority: config.tenantId || 'https://login.microsoftonline.com/common', // This is your tenant ID or use common
      redirectUri:  config.redirectUri || '/', // This is your redirect URI
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
      storeAuthStateInCookie: false,
    },
  });
}

@NgModule({
  imports: [CommonModule, RouterModule],
  declarations: [],
  providers: [],
})
export class AzureModule {
  public static forRoot(environment: any): ModuleWithProviders<AzureModule> {
    return {
      ngModule: AzureModule,
      providers: [
        { provide: AUTH_CONFIG, useValue: environment },
        {
          provide: MSAL_INSTANCE,
          useFactory: MSALInstanceFactory,
          deps: [AUTH_CONFIG],
        },
        MsalBroadcastService,
        MsalService,
        AzureAuthService,
        {
          provide: 'env', // you can also use InjectionToken
          useValue: environment
        }
      ],
    };
  }
}
