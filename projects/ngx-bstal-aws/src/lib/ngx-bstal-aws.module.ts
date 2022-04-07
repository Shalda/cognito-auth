import {InjectionToken, ModuleWithProviders, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";
import {AwsAuthService} from "./ngx-bstal-aws.service";
import {HttpClientModule} from "@angular/common/http";

const AUTH_CONFIG = new InjectionToken<string>('AUTH_CONFIG');

@NgModule({
  imports: [CommonModule, RouterModule, HttpClientModule],
  exports: []
})
export class AwsModule {
  public static forRoot(environment: any): ModuleWithProviders<AwsModule> {
    return {
      ngModule: AwsModule,
      providers: [
        { provide: AUTH_CONFIG, useValue: environment },

        AwsAuthService,
        {
          provide: 'env', // you can also use InjectionToken
          useValue: environment
        }
      ],
    };
  }
}
