import { FirebaseUser, UserCredentialType } from "./../../interfaces/firebase.model";
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { AngularFireStorage } from "@angular/fire/storage";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireAuth } from "@angular/fire/auth";

import { Storage } from "@capacitor/storage";
import {
  BehaviorSubject,
  Observable,
  from,
  forkJoin,
  of,
  throwError,
  concat,
  combineLatest,
} from "rxjs";
import {
  catchError,
  concatMap,
  filter,
  last,
  map,
  publish,
  publishReplay,
  share,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import { environment } from "src/environments/environment";

import { CurrentUserStore } from "@stores/index";
import {
  SignupRequired,
  createAccountRequest,
  SignupOptional,
  SignupAuthenticated,
  allowOptionalProp,
} from "@interfaces/index";
import { SignupDataHolder } from "@classes/index";
import { SignupoptionalPage } from "src/app/welcome/signupoptional/signupoptional.page";
import { UploadTaskSnapshot } from "@angular/fire/storage/interfaces";

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
  createFirebaseAccount(email: string, password: string): Observable<UserCredentialType> {
    // return this.http
    //   .post<AuthResponseData>(
    //     `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${environment.firebase.apiKey}`,
    //     { email: email, password: password, returnSecureToken: true }
    //   )
    return from(this.afAuth.createUserWithEmailAndPassword(email, password)).pipe(
      // tap(this.initializeLocalStorage.bind(this)),
      switchMap(
        () =>
          this.afAuth.signInWithEmailAndPassword(
            email,
            password
          ) as unknown as Promise<UserCredentialType>
      )
    );
  }

  /**
   * Creates user documents on firestore with info from signup process,
   * and stores its pictures in Firebase storage
   * @param data object containing all of the data from all parts of the signup process
   */
  async createFirestoreAccount(): Promise<void> {
    return combineLatest([this.signupData, this.afAuth.user])
      .pipe(
        take(1),
        switchMap(async ([dataStored, user]) => {
          await user?.reload();
          await user.getIdToken(true); // to refresh the token
          return [dataStored, user] as [SignupDataHolder, FirebaseUser];
        }),
        switchMap(([dataStored, user]) => {
          if (!user) {
            console.error("Big mistake right here");
            return throwError("NO USER AUTHENTICATED");
          }
          const creationRequestData: createAccountRequest = {
            firstName: dataStored.firstName,
            sexualPreference: dataStored.sexualPreference,
            gender: dataStored.gender,
            dateOfBirth: new Date(dataStored.dateOfBirth).toISOString(),
            university: dataStored.university,
            degree: dataStored.degree,
            biography: dataStored.biography,
            course: dataStored.course,
            society: dataStored.society,
            areaOfStudy: dataStored.areaOfStudy,
            // onCampus: dataStored.onCampus,
            societyCategory: dataStored.societyCategory,
            interests: dataStored.interests,
            questions: dataStored.questions,
            socialMediaLinks: dataStored.socialMediaLinks,
          };

          return concat(
            this.storePictures(dataStored.pictures, user.uid),
            this.afFunctions.httpsCallable("createAccount")(creationRequestData)
          ).pipe(last());
        })
      )
      .toPromise();
  }

  initializeUser() {
    return this.afAuth.user
      .pipe(
        take(1),
        concatMap((user) => {
          if (!user) {
            console.error("That's a big no no");
            return of();
          }
          console.log("we out here fam");
          return concat(this.removeLocalStorage(), this.currentUserStore.fillStore());
        })
      )
      .toPromise();
  }

  /**
   * Stores the pictures provided in the Firebase storage of the user
   */
  private storePictures(
    pictures: string[],
    uid: string
  ): Observable<UploadTaskSnapshot[]> {
    if (!uid) return;
    const pictureStorers$ = pictures.map(async (picture, index) => {
      const filePath = `profilePictures/${uid}/${index}`;
      const ref = this.afStorage.ref(filePath);

      const res = await fetch(picture);

      const blob = await res.blob();

      return ref.put(blob);
    });

    return forkJoin(pictureStorers$).pipe(
      catchError((err) => {
        // here we are assuming that if there is an error then that means
        console.log("Error while attempting to store pictures: ", err);
        return of([]);
      })
    );

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

    if (!empty) return Storage.set({ key: "signupData", value: JSON.stringify(data) });
  }

  /**
   * Removes data in local storage under key "signupData"
   */
  async removeLocalStorage() {
    return Storage.remove({ key: "signupData" });
  }

  /**
   * get the data in local storage under key "signupData" and stores it in the
   * signupData observable
   */
  async getLocalStorage() {
    const storageContent = JSON.parse((await Storage.get({ key: "signupData" })).value);

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
    const user = await this.afAuth.currentUser;

    if (!user) {
      return this.router.navigateByUrl("welcome/signupauth");
    }

    // get the information stored on local storage to signupData observable (if there is any)
    await this.getLocalStorage();

    // get the stage of completion of the signup process of the user
    const stage = this.signupStage;

    // this check of whether stage is not falsy is to make sure that we are only
    // redirected to a stage if the signup process has been initialized
    if (stage) {
      return this.router.navigateByUrl(`welcome/signup${stage}`);
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
