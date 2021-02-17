import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router, CanLoad, Route, UrlSegment } from '@angular/router';
import { of } from 'rxjs';
import { Observable } from 'rxjs';
import { switchMap, take, tap } from 'rxjs/operators';
import { AngularAuthService } from './auth/angular-auth.service';

@Injectable({
  providedIn: 'root'
})
export class SignupAuthGuard implements CanLoad {

  // inject auth service into auth gaurd
  constructor(private authService: AngularAuthService, private router: Router) {}

  canLoad(route: Route, segments: UrlSegment[]): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    return this.authService.userIsAuthenticated.pipe(take(1), 
    switchMap(isAuthenticated => {
      if (!isAuthenticated) {
        return this.authService.autologin();
      } else {
        return of(isAuthenticated)
      }
    }),
    tap(isAuthenticated => {
      if (!isAuthenticated) {return of(false)} 
    }))
  }

  // canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
  //   console.log('SignupAuthGuard#canActivate called');
  //   console.log(state);
  //   // call a function that checks the auth code
  //   return this.authService.hasValidEmail;
  // }

  params = "kaan"

  checkForm(): false|true {
    if (this.authService.isLoggedIn) { return true; }
    return false
  }


  
}
