import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, PartialObserver } from "rxjs";
import { delay, flatMap, map, take, tap } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";

import { AngularFireAuth } from "@angular/fire/auth";
import { AuthResponseData, signupDataHolder } from "@interfaces/auth-response.model";
import {
  SignupRequired,
  createAccountRequest,
  successResponse,
  SignupOptional,
  SignupAuthenticated,
} from "@interfaces/index";
import { CameraPhoto, Plugins } from "@capacitor/core";
import { from } from "rxjs";
import { SignupDataHolder } from "@classes/signup.class";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireStorage } from "@angular/fire/storage";
import { allowOptionalProp } from "@interfaces/shared.model";
import { Router } from "@angular/router";
@Injectable({
  providedIn: "root",
})
export class SignupService {
  signupData = new BehaviorSubject<SignupDataHolder>(
    new SignupDataHolder({
      email: null,
      uid: null,
      token: null,
      tokenExpirationDate: null,
    })
  );

  constructor(
    private http: HttpClient,
    private afAuth: AngularFireAuth,
    private afFunctions: AngularFireFunctions,
    private afStorage: AngularFireStorage,
    private router: Router
  ) {}

  /**
   * Creates the account in Firebase authentification, initializes
   * the signData observable and stores its content on the local storage
   * @param email
   * @param password
   * @returns
   */
  createFirebaseAccount(email: string, password: string): Observable<AuthResponseData> {
    console.log("createFirebaseAccount");
    return this.http
      .post<AuthResponseData>(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${environment.firebase.apiKey}`,
        { email: email, password: password, returnSecureToken: true }
      )
      .pipe(tap(this.initializeLocalStorage.bind(this)));
  }

  /**
   * Used right after the Firebase account has been created to store
   * locally (and on the app in an Observable) relevant data
   */
  async initializeLocalStorage(d: AuthResponseData) {
    console.log("initializeSignupStorage", d);

    if (!d.idToken) {
      return;
    }
    const expTime = new Date(new Date().getTime() + +d.expiresIn * 1000); // returns exp time in milliseconds
    const data = new SignupDataHolder({
      email: d.email,
      uid: d.localId,
      token: d.idToken,
      tokenExpirationDate: expTime.toISOString(),
    });
    await this.updateLocalStorage(data);
    this.signupData.next(data);
  }

  /**
   * Creates user documents on firestore with info from signup process,
   * and stores its pictures in Firebase storage
   * @param data object containing all of the data from all parts of the signup process
   */
  createFirestoreAccount(): Observable<successResponse> {
    const dataStored = this.signupData.value;
    const creationRequestData: createAccountRequest = {
      uid: dataStored.uid,
      firstName: dataStored.firstName,
      sexualPreference: dataStored.sexualPreference,
      gender: dataStored.gender,
      dateOfBirth: dataStored.dateOfBirth,
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
    };
    return this.afFunctions
      .httpsCallable("createAccount")(creationRequestData)
      .pipe(
        // error handling:
        //   - if the error is due to misformat in data, then don't retry (with same data at least,
        //    inform the user that there is a problem with regards to that, and which fields are a problem)
        //   - if the error is due to connection error or something of the sort, retry
        //   - if the error is due to an error inside of the cloud function, then retry maybe
        // (basically retry only if the error is due to connection error. )
        // easiest option is to just retry a bunch of times regardless of the case, and if it doesn't work
        // just display an error message
        take(1),
        tap(() => from(this.storePictures(dataStored.pictures, dataStored.uid)))
      );
  }

  /**
   * Stores the pictures provided in the Firebase storage of the user
   */
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
   */
  async updateLocalStorage(data: SignupDataHolder) {
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

    const authProperties: (keyof SignupAuthenticated)[] = [
      "email",
      "uid",
      "token",
      "tokenExpirationDate",
    ];
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
    authProperties.forEach((prop) => {
      if (!signupData[prop]) authIsDone = false;
    });

    requiredProperties.forEach((prop) => {
      if (!signupData[prop]) requiredIsDone = false;
    });

    if (!authIsDone) return null;
    if (!requiredIsDone) return "required";
    return "optional";
  }
}
