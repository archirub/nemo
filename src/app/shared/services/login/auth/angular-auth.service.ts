import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, PartialObserver } from "rxjs";
import { delay, flatMap, map, take, tap } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { AlertController } from "@ionic/angular";
import { AbstractFormGroupDirective } from "@angular/forms";
import { AuthResponseData } from "@interfaces/auth-response.model";
import { User } from "@classes/user.class";
import {
  Full,
  Baseline,
  SignupAuthenticated,
  SignupRequired,
  createAccountRequest,
  successResponse,
} from "@interfaces/index";
import { CameraPhoto, Plugins } from "@capacitor/core";
import { from } from "rxjs";
import { AuthenticatedUser, BaselineUser, FullUser } from "@classes/signup.class";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireStorage } from "@angular/fire/storage";
import { AngularFireAuth } from "@angular/fire/auth";

@Injectable({
  providedIn: "root",
})
export class AngularAuthService {
  constructor(
    private http: HttpClient,
    private afAuth: AngularFireAuth,
    private afFunctions: AngularFireFunctions,
    private afStorage: AngularFireStorage
  ) {}

  isLoggedIn = false;
  _user = new BehaviorSubject<AuthenticatedUser | BaselineUser | FullUser>(null); //this will store the logged in users data
  // private _type = new BehaviorSubject<String>(null); //this will store the logged in users data
  private signupAuthMap: SignupAuthenticated;
  private baselineMap: Baseline;
  private userTypes = {
    AuthenticatedUser: AuthenticatedUser,
    BaselineUser: BaselineUser,
    FullUser: FullUser,
  };

  get userIsAuthenticated() {
    return this._user.asObservable().pipe(
      map((user) => {
        if (user) {
          // console.log(`** Auth Gaurd PASSED! \n User Type: ${user.constructor.name}`);
          return !!user.token;
          // if (user.constructor.name in ["BaselineUser", "FullUser"]) {
          //   console.log(`** Auth Gaurd PASSED! \n User Type: ${user.constructor.name}`);
          //   return !!user.token; //force boolean
          // }
        } else {
          // console.log(`** Auth Gaurd FAILED`);
          return false;
        }
      })
    );
  }

  get userType() {
    return this._user.asObservable().pipe(
      map((user) => {
        console.log("KAKAKAKA", user);
        if (user) {
          return user.constructor.name;
        } else {
          return null;
        }
      })
    );
  }

  get userId() {
    return this._user.asObservable().pipe(
      map((user) => {
        if (user) {
          return user.uid;
        } else {
          return null;
        }
      })
    );
  }

  autologin() {
    //put this function in the in root module's constructr
    return from(Plugins.Storage.get({ key: "authData" })).pipe(
      map((storedData) => {
        if (!storedData || !storedData.value) {
          return null;
        }
        const parsedData = JSON.parse(storedData.value);
        const expTime = new Date(parsedData.tokenExpirationDate);
        // if (expTime <= new Date()) { return null; }
        // const user = new AuthenticatedUser(parsedData)

        const userType: string = parsedData["userType"];
        delete parsedData["userType"];
        let temp: AuthenticatedUser | BaselineUser | FullUser;
        if (userType == "AuthenticatedUser") {
          console.log(parsedData, "ssss");

          temp = new AuthenticatedUser(parsedData);
        } else if (userType == "BaselineUser") {
          temp = new BaselineUser(parsedData);
        } else if (userType == "FullUser") {
          temp = new FullUser(parsedData);
        }
        const user = temp;
        return user;
      }),
      tap((user) => {
        if (user) {
          // console.log("USER",user)
          this._user.next(user);
        }
      }),
      map((user) => {
        // console.log("USER",user)
        // console.log("BOOLEAN", !!user)
        return !!user; //force boolean
      })
    );
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

  signup(email: string, password: string): Observable<AuthResponseData> {
    // make some market that the intermediary process has begun
    return this.http
      .post<AuthResponseData>(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${environment.firebase.apiKey}`,
        { email: email, password: password, returnSecureToken: true }
      )
      .pipe(tap(this.setUserAuthData.bind(this)));
  }

  login(email: string, password: string): Observable<AuthResponseData> {
    return this.http
      .post<AuthResponseData>(
        `
      https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${environment.firebase.apiKey}`,
        { email: email, password: password, returnSecureToken: true }
      )
      .pipe(tap(this.setUserAuthData.bind(this)));
  }

  private setUserAuthData(userData: AuthResponseData) {
    if (!userData.idToken) {
      return;
    }
    const expTime = new Date(new Date().getTime() + +userData.expiresIn * 1000);
    this.signupAuthMap = {
      email: userData.email,
      uid: userData.localId,
      token: userData.idToken,
      tokenExpirationDate: expTime.toISOString(),
    };
    const auth_user = new AuthenticatedUser(this.signupAuthMap);
    this._user.next(auth_user);
    this.storeAuthData(auth_user);
    console.log(`Created an authenticated user`);
  }

  private storeAuthData(dataMap: SignupAuthenticated | BaselineUser | FullUser) {
    const user_type = dataMap.constructor.name;
    dataMap["_userType"] = user_type;
    const newMap = this.filter_(dataMap);
    //iterate through dict keys, makes it into a string, removes the "_" then deletes the old dict value and stores the new one
    const data = JSON.stringify(newMap);
    Plugins.Storage.set({ key: "authData", value: data });
    // Plugins.Storage.set({key: 'userType', value: user_type})
  }

  private filter_(dataMap) {
    const upd = {};
    for (let key of Object.keys(dataMap)) {
      console.log(key);
      let new_key = key.replace("_", "");
      console.log(new_key);
      let value = dataMap[key];
      upd[new_key] = dataMap[key];
      console.log(value);
    }
    return upd;
  }

  createBaselineUser(dataMap: SignupRequired) {
    let sucessfull = false;
    let user = this._user.getValue();
    if (user) {
      this.baselineMap = {
        email: user.email,
        uid: user.uid,
        token: user.token,
        tokenExpirationDate: user.tokenExpirationDate,
        firstName: dataMap.firstName,
        sexualPreference: dataMap.sexualPreference,
        gender: dataMap.gender,
        dateOfBirth: dataMap.dateOfBirth,
        pictures: dataMap.pictures,
        university: dataMap.university,
        degree: dataMap.degree,
      };
      const base_user = new BaselineUser(this.baselineMap);
      this.storeAuthData(base_user);
      this._user.next(base_user);
      sucessfull = true;
      console.log(`Baseline User Created: ${user.constructor.name}`);
    }
    return sucessfull;
  }

  /**
   * Creates user documents on firestore with info from signup process,
   * and stores its pictures in Firebase storage
   * @param data object containing all of the data from all parts of the signup process
   */
  // createFullUser(data: Full): Observable<successResponse> {
  //   const creationRequestData: createAccountRequest = {
  //     uid: data.uid,
  //     firstName: data.firstName,
  //     sexualPreference: data.sexualPreference,
  //     gender: data.gender,
  //     dateOfBirth: data.dateOfBirth,
  //     university: data.university,
  //     degree: data.degree,
  //     biography: data.biography,
  //     course: data.course,
  //     society: data.society,
  //     areaOfStudy: data.areaOfStudy,
  //     onCampus: data.onCampus,
  //     societyCategory: data.societyCategory,
  //     interests: data.interests,
  //     questions: data.questions,
  //   };
  //   return this.afFunctions
  //     .httpsCallable("createAccount")(creationRequestData)
  //     .pipe(
  //       // error handling:
  //       //   - if the error is due to misformat in data, then don't retry (with same data at least,
  //       //    inform the user that there is a problem with regards to that, and which fields are a problem)
  //       //   - if the error is due to connection error or something of the sort, retry
  //       //   - if the error is due to an error inside of the cloud function, then retry maybe
  //       // (basically retry only if the error is due to connection error. )
  //       // easiest option is to just retry a bunch of times regardless of the case, and if it doesn't work
  //       // just display an error message
  //       take(1),
  //       // IMAGE FORMAT "JPG" IS FOR DEVELOPMENT, it should be changed to a variable like data.pictureFormat
  //       // (flatMap is the Observable equivalent of then, and from converts a promise to an observable)
  //       tap(() => from(this.storePictures(data.pictures, data.uid)))
  //     );
  // }

  private async storePictures(pictures: CameraPhoto[], uid: string) {
    if (!uid) return;

    const promises = Array.from({ length: pictures.length });

    // associating each picture to a location in storage of shape "profile_pictures/uid/pictureIndex.pictureFormat"
    pictures.forEach((picture, index) => {
      const filePath = `profile_pictures/${uid}/${index}.${picture.format}`;
      const ref = this.afStorage.ref(filePath);

      promises[index] = ref.put(picture.webPath);
    });

    // making all requests at the same time
    await Promise.all(promises);
    console.log("less gooooooo");
  }

  // TEMPORARY - THIS WAY UNTIL THE USER STATES FOR SIGNING UP AND FOR NORMAL USAGE ARE UNTANGLED
  async logout(): Promise<void> {
    // using allSettled in an attempt to do both processes regardless of whether the other fails
    // await (Promise as any).allSettled([
    //   Plugins.Storage.remove({ key: "authData" }),
    //   this.afAuth.signOut(),
    // ]);
    // await Plugins.Storage.remove({ key: "authData" });
    // await this.afAuth
    //   .signOut()
    //   .then(() => this.afAuth.user.subscribe((a) => console.log("YES LE SANG", a))),
    //   this._user.next(null);
  }

  // // ORIGINAL SHAPE OF FUNCTION ABOVE!
  // logout(): void {
  //   this._user.next(null);
  //   Plugins.Storage.remove({ key: "authData" });
  // }
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
