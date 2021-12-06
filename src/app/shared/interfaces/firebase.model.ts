import * as firebase from "firebase/app";
import "firebase/firestore";
import "firebase/auth";

export const Timestamp = firebase.default.firestore.Timestamp;
export const EmailAuthProvider = firebase.default.auth.EmailAuthProvider;

export type FirebaseUser = firebase.default.User;
export type UserCredentialType = firebase.default.auth.UserCredential;
export type TimestampType = firebase.default.firestore.Timestamp;

export type FirestoreErrorType = firebase.default.firestore.FirestoreError;
export type FirestoreErrorCodeType = firebase.default.firestore.FirestoreErrorCode;

export type AuthErrorType = firebase.default.auth.AuthError;
export type FirebaseAuthErrorType = firebase.default.auth.Error;

export type FirebaseStorageErrorType = firebase.default.storage.FirebaseStorageError;

export type CloudFunctionsErrorType = FirestoreErrorType;
