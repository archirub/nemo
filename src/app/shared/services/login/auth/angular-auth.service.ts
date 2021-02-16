import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AlertController } from '@ionic/angular';
import { AbstractFormGroupDirective } from '@angular/forms';
import { AngularFireAuth } from '@angular/fire/auth';
import { AuthResponseData } from '@interfaces/auth-response.model';
import { User } from '@classes/user.class';
import { Full, Baseline, SignupAuth } from '@interfaces/index';
import { Plugins } from '@capacitor/core';
import { from } from 'rxjs';
import { AuthUser, BaselineUser, FullUser } from '@classes/signup.class';

@Injectable({
  providedIn: 'root'
})
export class AngularAuthService {
  hasValidEmail: Observable<boolean> = of(false)

  constructor(private http: HttpClient, private authFr: AngularFireAuth) {}

  isLoggedIn = false;
  private _user = new BehaviorSubject<AuthUser|BaselineUser|FullUser>(null); //this will store the logged in users data 
  private signupAuthMap: SignupAuth

  get userIsAuthenticated() {
    return this._user.asObservable().pipe(map(user => {
      if (user) {return !!user.token;} //force boolean
      else {return false;}}))
  }

  get userId() {
    return this._user.asObservable().pipe(map(user => {
      if (user) {return user.uid;}
      else {return null;}}))
  }

  autologin() {
    return from(Plugins.Storage.get({key: 'authData'})).pipe(map(storedData => {
      if (!storedData || !storedData.value) { return null; }
      const parsedData = JSON.parse(storedData.value) as SignupAuth
      const expTime = new Date(parsedData.tokenExpirationDate);
      if (expTime <= new Date()) { return null; }
      const user = new AuthUser(parsedData);
      return user;
    }), tap(user => {
          if (user) {
            this._user.next(user);
          }
    }), map(user => {
          return !!user; //force boolean
    }));
  }
  
  signup(email: string, password: string) {
    return this.http.post<AuthResponseData>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${environment.firebase.apiKey}`,
      {email: email, password: password, returnSecureToken: true}).pipe(tap(this.setUserAuthData.bind(this)));
  }

  login(email: string, password: string) {
    return this.http.post<AuthResponseData>(`
      https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${environment.firebase.apiKey}`,
      {email: email, password: password, returnSecureToken: true}).pipe(tap(this.setUserAuthData.bind(this)));
  }

  private setUserAuthData(userData: AuthResponseData) {
    const expTime = new Date(new Date().getTime() + +userData.expiresIn * 1000); // returns exp time in milliseconds
    this.signupAuthMap = {
      email: userData.email,
      uid: userData.localId,
      token: userData.idToken,
      tokenExpirationDate: expTime.toISOString()
    }
    this.storeAuthData(this.signupAuthMap)
    const user = new AuthUser(this.signupAuthMap) 
    this._user.next(user)
  }

  private storeAuthData(signupAuthMap: SignupAuth) {
    const data = JSON.stringify(signupAuthMap)
    Plugins.Storage.set({key: 'authData', value: data})
  }

  private createPartialUser(dataMap: Baseline) {
    //create 
  }

  private createFullUser(data: Full) {
    //create 
  }

  logout(): void {
    this._user.next(null)
  }

  isValidEmail(email: String): Observable<boolean> {
    const regex = /[a-zA-Z]*@[a-zA-Z]*\.ac\.uk/g;
    const found = email.match(regex)
    if (found.length = 1) {
      this.hasValidEmail = of(true)
      return of(true)
    }
    this.hasValidEmail = of(false)
    return of(false)
  } 

  isValidCode(code: String): Observable<boolean> {
    // make call to firebase auth storage and get the sent auth code
  
    return of(false)
  }
  // CHECK AUTH CODE // string -> boolean
  // Component: on onsubmit(), get control form value and call injectable function on a string of numbers
  // Service: implement a function that, given a string of numbers, checks whether its the correct auth code  
  // sent from the database. if so, stores it in an observable boolean value (this.validAuthCode)
  // Gaurd: when the gaurd is determining the validity, just check for the current state of the observable

  // CHECK E-MAIL // string -> boolean
  // Component: on onsubmit(), get control form value and call injectable functon on the email string
  // Service: implement a function that, given an email string, parses it to see if its a uni email (regex)
  // if so, store it in an observable boolean value (this.validUniEmail)
  // Gaurd: when the gaurd is determining the validity, just check for the current state of the observable
}
