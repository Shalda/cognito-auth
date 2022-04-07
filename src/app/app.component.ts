import {Component, OnInit} from '@angular/core';
import {AwsAuthService} from "../../projects/ngx-bstal-aws/src/lib/ngx-bstal-aws.service";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  isAuth: boolean = false;
  constructor(private _authService: AwsAuthService, private route: ActivatedRoute) {}

  title = 'bstal-12-13';

  onLogin() {
    this._authService.logIn()

  }
  onLogout(){
    this._authService.logout()
  }
  onGetUser(){
    console.log('Tokens: ', this._authService.getUserData());
  }
  ngOnInit() {
    this._authService.getAuthStatus().subscribe((auth:boolean)=> {
      this.isAuth = auth;
    })
  };
}
