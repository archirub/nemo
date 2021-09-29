import * as firebase from "firebase/app";
import "firebase/firestore";

export const Timestamp = firebase.default.firestore.Timestamp;
console.log("firebase defualt", firebase as any);

// export const EmailAuthProvider = firebase.default.auth.;
// export const FirestoreError = firebase.default.firestore;

export type TimestampType = firebase.default.firestore.Timestamp;
export type FirestoreErrorType = firebase.default.firestore.FirestoreError;
export type AuthErrorType = firebase.default.auth.AuthError;
export type UserCredentialType = firebase.default.auth.UserCredential;
