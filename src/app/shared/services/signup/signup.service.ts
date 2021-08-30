import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { AngularFireStorage } from "@angular/fire/storage";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireAuth } from "@angular/fire/auth";

import { Plugins } from "@capacitor/core";
import {
  BehaviorSubject,
  Observable,
  from,
  forkJoin,
  of,
  throwError,
  concat,
} from "rxjs";
import {
  catchError,
  concatMap,
  map,
  publish,
  publishReplay,
  share,
  shareReplay,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import { environment } from "src/environments/environment";

import { CurrentUserStore } from "@stores/index";
import {
  AuthResponseData,
  SignupRequired,
  createAccountRequest,
  SignupOptional,
  SignupAuthenticated,
  allowOptionalProp,
  successResponse,
} from "@interfaces/index";
import { SignupDataHolder } from "@classes/index";
import { UploadTaskSnapshot } from "@angular/fire/storage/interfaces";
import { SignupoptionalPage } from "src/app/welcome/signupoptional/signupoptional.page";

@Injectable({
  providedIn: "root",
})
export class SignupService {
  signupData = new BehaviorSubject<SignupDataHolder>(new SignupDataHolder({}));

  constructor(
    private http: HttpClient,
    private afAuth: AngularFireAuth,
    private afFunctions: AngularFireFunctions,
    private afStorage: AngularFireStorage,
    private router: Router,
    private currentUserStore: CurrentUserStore // private signupOptionalPage: SignupOptionalPage, // private signupRequiredPage: SignupRequiredPage
  ) {}

  /**
   * Creates the account in Firebase authentification, initializes
   * the signData observable and stores its content on the local storage
   * @param email
   * @param password
   * @returns
   */
  createFirebaseAccount(
    email: string,
    password: string
  ): Observable<firebase.auth.UserCredential> {
    // return this.http
    //   .post<AuthResponseData>(
    //     `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${environment.firebase.apiKey}`,
    //     { email: email, password: password, returnSecureToken: true }
    //   )
    return from(this.afAuth.createUserWithEmailAndPassword(email, password)).pipe(
      // tap(this.initializeLocalStorage.bind(this)),
      switchMap(() => this.afAuth.signInWithEmailAndPassword(email, password))
    );
  }

  /**
   * Used right after the Firebase account has been created to store
   * locally (and on the app in an Observable) relevant data
   */
  // async initializeLocalStorage(d: AuthResponseData) {
  //   console.log("initializeSignupStorage", d);

  //   if (!d.idToken) {
  //     return;
  //   }
  //   const expTime = new Date(new Date().getTime() + +d.expiresIn * 1000); // returns exp time in milliseconds
  //   const data = new SignupDataHolder({
  //     email: d.email,
  //     uid: d.localId,
  //     token: d.idToken,
  //     tokenExpirationDate: expTime.toISOString(),
  //   });
  //   await this.updateLocalStorage(data);
  //   this.signupData.next(data);
  // }

  /**
   * Creates user documents on firestore with info from signup process,
   * and stores its pictures in Firebase storage
   * @param data object containing all of the data from all parts of the signup process
   */
  createFirestoreAccount(): Observable<void> {
    return this.signupData.pipe(
      withLatestFrom(this.afAuth.authState),
      take(1),
      switchMap(([dataStored, user]) => {
        if (!user) {
          console.error("Big mistake right here");
          return of(null);
        }

        const creationRequestData: createAccountRequest = {
          firstName: dataStored.firstName,
          picturesCount: dataStored?.pictures?.filter(Boolean).length ?? 0, // counts # of none empty elements
          sexualPreference: dataStored.sexualPreference,
          gender: dataStored.gender,
          dateOfBirth: new Date(dataStored.dateOfBirth).toISOString(),
          university: dataStored.university,
          degree: dataStored.degree,
          biography: dataStored.biography,
          course: dataStored.course,
          society: dataStored.society,
          areaOfStudy: dataStored.areaOfStudy,
          onCampus: dataStored.onCampus,
          societyCategory: dataStored.societyCategory,
          interests: dataStored.interests,
          questions: dataStored.questions,
          socialMediaLinks: dataStored.socialMediaLinks,
        };

        return forkJoin([
          of({ pictures: dataStored.pictures, uid: user.uid }),
          this.afFunctions.httpsCallable("createAccount")(creationRequestData),
        ]);
      }),
      switchMap(([data, accountCreationRes]) => {
        if (accountCreationRes.successful)
          return this.storePictures(data.pictures, data.uid);
        else throwError("DATABASE DOCUMENT STORAGE FAILED");
      }),
      switchMap((pictureStoringRes) => {
        if ((pictureStoringRes[0].state = "success")) return of(null);

        return throwError("PICTURE STORAGE FAILED");
      })
    );

    // error handling:
    //   - if the error is due to misformat in data, then don't retry (with same data at least,
    //    inform the user that there is a problem with regards to that, and which fields are a problem)
    //   - if the error is due to connection error or something of the sort, retry
    //   - if the error is due to an error inside of the cloud function, then retry maybe
    // (basically retry only if the error is due to connection error. )
    // easiest option is to just retry a bunch of times regardless of the case, and if it doesn't work
    // just display an error message
  }

  initialiseUser() {
    return this.afAuth.user.pipe(
      take(1),
      concatMap((user) => {
        if (!user) {
          console.error("That's a big no no");
          return of();
        }
        return concat(
          this.currentUserStore.fillStore(),
          this.removeLocalStorage(),
          this.router.navigateByUrl("/main/home")
        );
      })
    );
  }

  /**
   * Stores the pictures provided in the Firebase storage of the user
   */
  private storePictures(
    pictures: string[],
    uid: string
  ): Observable<UploadTaskSnapshot[]> {
    if (!uid) return;

    const pictureStorers$ = pictures.map((picture, index) => {
      const filePath = `profilePictures/${uid}/${index}`;
      // const filePath = `profile_pictures/${uid}/${index}.${picture.format}`;
      const ref = this.afStorage.ref(filePath);
      // const url = URL.createObjectURL(picture.webPath);
      return from(
        (async () => {
          const res = await fetch(picture);

          return await res.blob();
        })()
      ).pipe(concatMap((blob) => from(ref.put(blob))));
    });

    return forkJoin(pictureStorers$);

    // const promises = Array.from({ length: pictures.length });

    // // associating each picture to a location in storage of shape "profile_pictures/uid/pictureIndex.pictureFormat"
    // pictures.forEach((picture, index) => {
    //   const filePath = `profile_pictures/${uid}/${index}`;
    //   // const filePath = `profile_pictures/${uid}/${index}.${picture.format}`;
    //   const ref = this.afStorage.ref(filePath);
    //   console.log("pic", picture.webPath.replace("blob:", ""));
    //   urlToBlob(picture.webPath.replace("blob:", "")).subscribe((a) =>
    //     console.log("blob", a)
    //   );
    //   promises[index] = ref.put(picture.webPath.replace("blob:", ""));
    // });

    // // making all requests at the same time
    // await Promise.all(promises);
  }

  /**
   * Adds the given data to the service's observable and to the local storage.
   * Only modifies the properties provided in "additionalData", leaves the others unchanged
   */
  async addToDataHolders(
    additionalData: allowOptionalProp<SignupRequired> & allowOptionalProp<SignupOptional>
  ) {
    const observableData = this.signupData.value;

    for (let key of Object.keys(additionalData)) {
      observableData[key] = additionalData[key];
    }

    await this.updateLocalStorage(observableData);

    this.signupData.next(observableData);
  }

  /**
   * Replaces data in local storage under key "signupData" by data object provided
   * Only does so if the data holder isn't empty
   */
  async updateLocalStorage(data: SignupDataHolder) {
    let empty = true;
    Object.keys(data).forEach((key) => {
      if (data[key]) {
        empty = false;
      }
    });

    if (!empty)
      return Plugins.Storage.set({ key: "signupData", value: JSON.stringify(data) });
  }

  /**
   * Removes data in local storage under key "signupData"
   */
  async removeLocalStorage() {
    return Plugins.Storage.remove({ key: "signupData" });
  }

  /**
   * get the data in local storage under key "signupData" and stores it in the
   * signupData observable
   */
  async getLocalStorage() {
    const storageContent = JSON.parse(
      (await Plugins.Storage.get({ key: "signupData" })).value
    );

    // checks whether content is empty. If it is, then don't replace the current observable
    if (storageContent && Object.keys(storageContent).length > 0) {
      const data = new SignupDataHolder(storageContent);
      this.signupData.next(data);
    }
  }

  /**
   * Resets the signup data holder by passing a new value to the behaviorSubject
   */
  resetDataHolder() {
    // this.signupOptionalPage.form.reset(this.signupOptionalPage.blankForm)

    this.signupData.next(new SignupDataHolder({}));
  }

  /**
   * Checks the signup information contained by the local storage. Based how much data it contains,
   * redirects to the correct signup stage
   */
  async checkAndRedirect() {
    // get the information stored on local storage to signupData observable (if there is any)
    await this.getLocalStorage();

    // get the stage of completion of the signup process of the user
    const stage = this.signupStage;

    // this check of whether stage is not falsy is to make sure that we are only
    // redirected to a stage if the signup process has been initialized
    if (stage) {
      this.router.navigateByUrl(`welcome/signup${stage}`);
    }
  }

  /**
   * null indicates that the authentification hasn't be done, in other words,
   * that the signup process hasn't been initialized.
   */
  get signupStage(): null | "required" | "optional" {
    const signupData = this.signupData.value;

    // const authProperties: (keyof SignupAuthenticated)[] = [
    //   "email",
    //   "uid",
    //   "token",
    //   "tokenExpirationDate",
    // ];
    const requiredProperties: (keyof SignupRequired)[] = [
      "firstName",
      "dateOfBirth",
      "gender",
      "sexualPreference",
      "degree",
      "university",
      "pictures",
      // "swipeMode",
    ];
    // not amazing to have the default value of these as true in principle it feels
    let authIsDone = true;
    let requiredIsDone = true;

    // these checks are quite bad, but might be sufficient

    // checking for auth might be useless since the local storage only contains
    // signup data if auth is done
    // authProperties.forEach((prop) => {
    //   if (!signupData[prop]) authIsDone = false;
    // });

    requiredProperties.forEach((prop) => {
      if (!signupData[prop]) requiredIsDone = false;
    });

    if (!authIsDone) return null;
    if (!requiredIsDone) return "required";
    return "optional";
  }
}
