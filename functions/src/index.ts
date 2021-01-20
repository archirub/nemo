import * as admin from "firebase-admin";

admin.initializeApp();
// import * as serviceAccount from "../nemo-dev-1b0bc-firebase-adminsdk-d8ozt-60b942febb.json";
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount as any),
//   databaseURL: "https://nemo-dev-1b0bc.firebaseio.com",
// });

export * from "./generate-swipe-stack.function";
export * from "./get-uids";
export * from "./get-match-data-user-info.function";
export * from "./register-swipe-choices.function";
