import * as firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";

export const Timestamp = firebase.default.firestore.Timestamp;
export const EmailAuthProvider = firebase.default.auth.EmailAuthProvider;

export type FirebaseUser = firebase.default.User;
export type TimestampType = firebase.default.firestore.Timestamp;
export type FirestoreErrorType = firebase.default.firestore.FirestoreError;
export type AuthErrorType = firebase.default.auth.AuthError;
export type UserCredentialType = firebase.default.auth.UserCredential;
