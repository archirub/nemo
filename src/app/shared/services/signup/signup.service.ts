import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { AngularFireStorage } from "@angular/fire/storage";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireAuth } from "@angular/fire/auth";
import { UploadTaskSnapshot } from "@angular/fire/storage/interfaces";

import {
  BehaviorSubject,
  Observable,
  forkJoin,
  concat,
  combineLatest,
  lastValueFrom,
  firstValueFrom,
  defer,
} from "rxjs";
import { concatMapTo, first, last, switchMap, switchMapTo, tap } from "rxjs/operators";

import { CurrentUserStore } from "@stores/index";

import { SignupDataHolder } from "@classes/index";
import {
  SignupRequired,
  createAccountRequest,
  SignupOptional,
  allowOptionalProp,
  CustomError,
} from "@interfaces/index";
import { FirebaseUser, FireAuthUserCredential } from "./../../interfaces/firebase.model";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { SignupLocalStorageService } from "./signup-local-storage.service";

@Injectable({
  providedIn: "root",
})
export class SignupService {
  signupData$ = new BehaviorSubject<SignupDataHolder>(new SignupDataHolder({}));

  /**
   * null indicates that the authentication hasn't be done, in other words,
   * that the signup process hasn't been initialized.
   */
  get signupStage(): null | "required" | "optional" {
    const signupData = this.signupData$.value;

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

    let requiredIsDone = true;

    // these checks are quite bad, but might be sufficient
    requiredProperties.forEach((prop) => {
      if (!signupData[prop]) requiredIsDone = false;
    });

    return requiredIsDone ? "optional" : "required";
  }

  constructor(
    private router: Router,

    private afAuth: AngularFireAuth,
    private afFunctions: AngularFireFunctions,
    private afStorage: AngularFireStorage,

    private currentUserStore: CurrentUserStore, // private signupOptionalPage: SignupOptionalPage, // private signupRequiredPage: SignupRequiredPage

    private signupLocalStorer: SignupLocalStorageService,
    private errorHandler: GlobalErrorHandler
  ) {}

  /**
   * Creates the account in Firebase authentification, initializes
   * the signData observable and stores its content on the local storage
   */
  createFirebaseAccount(
    email: string,
    password: string
  ): Observable<FireAuthUserCredential> {
    return defer(() => this.afAuth.createUserWithEmailAndPassword(email, password)).pipe(
      switchMapTo(defer(() => this.afAuth.signInWithEmailAndPassword(email, password))),
      this.errorHandler.convertErrors("firebase-auth"),
      this.errorHandler.handleErrors()
    );
  }

  /**
   * Creates user documents on firestore with info from signup process,
   * and stores its pictures in Firebase storage
   * @param data object containing all of the data from all parts of the signup process
   */
  async createFirestoreAccount(): Promise<any> {
    return lastValueFrom(
      combineLatest([this.signupData$, this.afAuth.user])
        .pipe(
          tap(([_, user]) => {
            if (!user) throw new CustomError("local/check-auth-state", "local");
          }),
          first(),
          switchMap(async ([dataStored, user]) => {
            await user?.reload();
            await user.getIdToken(true); // to refresh the token
            return [dataStored, user] as [SignupDataHolder, FirebaseUser];
          }),
          switchMap(([dataStored, user]) => {
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
              societyCategory: dataStored.societyCategory,
              interests: dataStored.interests,
              questions: dataStored.questions,
              socialMediaLinks: dataStored.socialMediaLinks,
            };

            return concat(
              this.storePictures(dataStored.pictures, user.uid).pipe(
                this.errorHandler.convertErrors("firebase-storage"),
                this.errorHandler.handleErrors()
              ),
              this.afFunctions
                .httpsCallable("createAccount")(creationRequestData)
                .pipe(
                  this.errorHandler.convertErrors("cloud-functions"),
                  this.errorHandler.handleErrors()
                )
            ).pipe(last());
          })
        )
        .pipe(this.errorHandler.handleErrors())
    );
  }

  initializeUser() {
    return firstValueFrom(
      this.afAuth.user.pipe(
        tap((user) => {
          if (!user) throw new CustomError("local/check-auth-state", "local");
        }),
        first(),
        concatMapTo(
          concat(this.signupLocalStorer.removeStorage(), this.currentUserStore.activate$)
        ),
        this.errorHandler.handleErrors()
      )
    );
  }

  /**
   * Checks the signup information contained by the local storage. Based how much data it contains,
   * redirects to the correct signup stage
   */
  async checkAndRedirect() {
    const user = await this.errorHandler.getCurrentUser();

    if (!user) {
      return this.router.navigateByUrl("welcome/signupauth");
    }

    // get the information stored on local storage to signupData observable (if there is any)
    await this.signupLocalStorer.getStorage(this.signupData$);

    // get the stage of completion of the signup process of the user
    const stage = this.signupStage;

    // this check of whether stage is not falsy is to make sure that we are only
    // redirected to a stage if the signup process has been initialized
    if (stage) {
      return this.router.navigateByUrl(`welcome/signup${stage}`);
    }
  }

  /**
   * Adds the given data to the service's observable and to the local storage.
   * Only modifies the properties provided in "additionalData", leaves the others unchanged
   */
  async addToDataHolders(
    additionalData: allowOptionalProp<SignupRequired> & allowOptionalProp<SignupOptional>
  ) {
    const observableData = await firstValueFrom(this.signupData$);

    for (let key of Object.keys(additionalData)) {
      observableData[key] = additionalData[key];
    }

    await this.signupLocalStorer.updateStorage(observableData);

    this.signupData$.next(observableData);
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
      this.errorHandler.convertErrors("firebase-storage"),
      this.errorHandler.handleErrors()
    );
  }

  // used in signup required and signup optional
  async getLocalStorage() {
    return this.signupLocalStorer.getStorage(this.signupData$);
  }

  /**
   * Resets the signup data holder by passing a new value to the behaviorSubject
   */
  resetDataHolder() {
    this.signupData$.next(new SignupDataHolder({}));
  }
}
