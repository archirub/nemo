import * as admin from "firebase-admin";

// admin.initializeApp();
import * as serviceAccount from "../nemo-dev-1b0bc-firebase-adminsdk-d8ozt-60b942febb.json";
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
  databaseURL: "https://nemo-dev-1b0bc.firebaseio.com",
});

export * from "./get-match-data-user-info.function";
// export * from "./increment-md-uid-count"; // can deal with that later on (system for when you start getting a lot of users and so potential overflow of the limit size of individual Firestore documents)
export * from "./profile-editing-by-user";
export * from "./chat-deletion-by-user";
export * from "./report-user";

export * from "./duplicate-data-updating/index";
export * from "./account-management/index";
export * from "./app-development/index";
export * from "./swipe-stack-management/index";
// export * from "./test-notification";
export * from "./notifications/index";
