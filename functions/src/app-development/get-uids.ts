import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { runAdminUserIdentityCheck } from "../supporting-functions/user-validation/user.checker";

// FOR DEVELOPMENT PURPOSES ONLY - necessary in mock-data-management to get the uids of authenticated
// users, which is only possible with the admin SDK for security purposes.

interface requestData {
  amount: number;
}

export const getUIDs = functions
  .region("europe-west2")
  .https.onCall(async (data: requestData, context) => {
    runAdminUserIdentityCheck(context);

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
