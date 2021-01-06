import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// For local testing, uncomment the 5 lines below, and comment out "admin.initializeApp();"

// const serviceAccount = require("../nemo-dev-1b0bc-firebase-adminsdk-d8ozt-60b942febb.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://nemo-dev-1b0bc.firebaseio.com",
// });

interface requestData {
  amount: number;
}

export const getUIDs = functions
  .region("europe-west2")
  .https.onCall(async (data: requestData, context) => {
    const userCount: number = data.amount ? data.amount : 10;
    const userToFetchCount: number = Math.floor(userCount * 1.5);

    const usersFetchedQuery: admin.auth.ListUsersResult = await admin
      .auth()
      .listUsers(userToFetchCount);
    const usersFetched: admin.auth.UserRecord[] = usersFetchedQuery.users;

    const UIDsToSend: string[] = [];
    await Promise.all(
      usersFetched.map(async (user) => {
        const userProfile = await admin
          .firestore()
          .collection("profiles")
          .doc(user.uid)
          .get();

        if (!userProfile.exists) {
          UIDsToSend.push(user.uid);
        }
      })
    );

    return UIDsToSend;
  });
