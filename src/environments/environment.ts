// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  awsConfig: {
    cognitoUserPoolId: 'us-east-1_dE4Zy1ayW',
    cognitoAppClientId: 'k9qtr0ehg2vvd904q04khb0u1',
    region: 'us-east-1',
    redirectDomain: 'http://localhost:4200',
    domainName: 'authtestpool',
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
