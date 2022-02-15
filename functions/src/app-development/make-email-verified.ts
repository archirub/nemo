// import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";

// export const makeEmailVerified = functions
//   .region("europe-west2")
//   .https.onCall(async (data: {}, context): Promise<any> => {
//     if (!context.auth) return;

//     await admin.auth().updateUser(context.auth.uid, { emailVerified: true });
//   });
