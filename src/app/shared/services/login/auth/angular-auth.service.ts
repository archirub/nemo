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
import { Full, Baseline, Authenticated, SignupRequired } from '@interfaces/index';
import { Plugins } from '@capacitor/core';
import { from } from 'rxjs';
import { AuthenticatedUser, BaselineUser, FullUser } from '@classes/signup.class';

@Injectable({
  providedIn: 'root'
})
export class AngularAuthService {
  constructor(private http: HttpClient, private authFr: AngularFireAuth) {}

  isLoggedIn = false;
  private _user = new BehaviorSubject<AuthenticatedUser|BaselineUser|FullUser>(null); //this will store the logged in users data 
  // private _type = new BehaviorSubject<String>(null); //this will store the logged in users data 
  private signupAuthMap: Authenticated
  private baselineMap: Baseline
  private userTypes = {"AuthenticatedUser": AuthenticatedUser, "BaselineUser": BaselineUser, "FullUser": FullUser}

  get userIsAuthenticated() {
    return this._user.asObservable().pipe(map(user => {
      if (user) {
        return !!user.token;
        // if (user.constructor.name in ["BaselineUser", "FullUser"]) {
        //   console.log(`** Auth Gaurd PASSED! \n User Type: ${user.constructor.name}`);
        //   return !!user.token; //force boolean 
        // }       
      } 
      else {
        console.log(`** Auth Gaurd FAILED`);
        return false;}}))
  }

  get userType() {
    return this._user.asObservable().pipe(map(user => {
      if (user) {return (user.constructor.name);}
      else {return null;}}))
  }

  get userId() {
    return this._user.asObservable().pipe(map(user => {
      if (user) {return user.uid;}
      else {return null;}}))
  }

  autologin() { //put this function in the in root module's constructr
    return from(Plugins.Storage.get({key: 'authData'})).pipe(map(storedData => {
      if (!storedData || !storedData.value) { return null; }
      const parsedData = JSON.parse(storedData.value) 
      const expTime = new Date(parsedData.tokenExpirationDate);
      if (expTime <= new Date()) { return null; }
      // const user = new AuthenticatedUser(parsedData)
      const userType = parsedData["userType"]
      delete parsedData["userType"]
      let temp: AuthenticatedUser|BaselineUser|FullUser
      if (userType == "AuthenticatedUser") {
        temp = new AuthenticatedUser(parsedData)
      } else if (userType == "BaselineUser") {
        temp = new BaselineUser(parsedData)
      } else if (userType == "FullUser") {
        temp = new FullUser(parsedData)
      }
      const user = temp
      return user;
    }), tap(user => {
          if (user) {
            this._user.next(user);
          }
    }), map(user => {
          return !!user; //force boolean
    }));
  }

  // get_usertype_from_storage() {
  //   const observable = from(Plugins.Storage.get({key: 'userType'})).pipe(map(mymap => {
  //     this._type.next(mymap.value)
  //   }))
  //     // let userType = this.get_usertype_from_storage()
  //     // let user: AuthenticatedUser|BaselineUser|FullUser
  //     // console.log(`USER TYPE ON AUTOLOGIN: ${userType}`);
  //     // if (userType == "AuthenticatedUser") {
  //     //   user = new AuthenticatedUser(parsedData)
  //     // } else if (userType == "BaselineUser") {
  //     //   user = new BaselineUser(parsedData)
  //     // } else if (userType == "FullUser") {
  //     //   user = new FullUser(parsedData)
  //     // }
  //     // const user = new this.userTypes[userType](parsedData); 
  // }
  
  signup(email: string, password: string) {
    // make some market that the intermediary process has begun
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
    if (!userData.idToken) {
      return
    }
    const expTime = new Date(new Date().getTime() + +userData.expiresIn * 1000); // returns exp time in milliseconds
    this.signupAuthMap = {
      email: userData.email,
      uid: userData.localId,
      token: userData.idToken,
      tokenExpirationDate: expTime.toISOString()
    }
    const auth_user = new AuthenticatedUser(this.signupAuthMap)
    this.storeAuthData(auth_user)
    this._user.next(auth_user)
    console.log(`Created an authenticated user`)
  }

  private storeAuthData(infoMap: Authenticated|BaselineUser|FullUser) {
    const user_type = infoMap.constructor.name
    infoMap["userType"] = user_type
    const data = JSON.stringify(infoMap)
    Plugins.Storage.set({key: 'authData', value: data})
    // Plugins.Storage.set({key: 'userType', value: user_type})
  }

  createBaselineUser(dataMap: SignupRequired) {
    console.log("CREATING BASELINE USER")
    this._user.asObservable().pipe(map(user => {
      console.log("got here!")
      if (user) {
        this.baselineMap = {
          email: user.email,
          uid: user.uid,
          token: user.token,
          tokenExpirationDate: user.tokenExpirationDate,
          firstName: dataMap.firstName,
          sexualPreference: dataMap.sexualPreference,
          gender: dataMap.gender,
          dateOfBirth: dataMap.dateOfBirth
        }
        const base_user = new BaselineUser(this.baselineMap) 
        this.storeAuthData(base_user)
        this._user.next(base_user)
        console.log(`Baseline User Created: ${user.constructor.name}`)
      }}))}

  private createFullUser(data: Full) {
    //create 
  }

  logout(): void {
    this._user.next(null)
    Plugins.Storage.remove({key: "authData"})
  }


}

  // isValidEmail(email: String): Observable<boolean> {
  //   const regex = /[a-zA-Z]*@[a-zA-Z]*\.ac\.uk/g;
  //   const found = email.match(regex)
  //   if (found.length = 1) {
  //     this.hasValidEmail = of(true)
  //     return of(true)
  //   }
  //   this.hasValidEmail = of(false)
  //   return of(false)
  // } 
  
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
