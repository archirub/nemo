import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  reportUserRequest,
  dateMap,
  UserReportOnDatabase,
} from "./../../src/app/shared/interfaces/index";

import { runWeakUserIdentityCheck } from "./supporting-functions/user-validation/user.checker";
import { sanitizeData } from "./supporting-functions/data-validation/main";

// TODO - REQUIRES MODIFICATION ONCE WE HAVE A COLLECTION WHERE REPORTED USERS GO, IT WILL SIMPLY
// NEED TO BE ADDED THERE IF "ADD", AND A PROPERTY OF THE DOC SUCH AS active SHOULD BE TURNED
// TO FALSE IF IT SAYS "REMOVE"

// To call when the user reports someone.

export const reportUser = functions
  .region("europe-west2")
  .https.onCall(async (request: reportUserRequest, context): Promise<void> => {
    runWeakUserIdentityCheck(context);

    const uid = context?.auth?.uid as string;

    const sanitizedRequest = sanitizeData("reportUser", request) as reportUserRequest;

    const report = sanitizedRequest.report;

    // const user = await admin.auth().getUser(uid);
    // const reporteduser = await admin.auth().getUser(report.userReportedID);

    const mdMainRef = admin.firestore().collection("matchData").doc(uid);
    const mdDatingRef = admin
      .firestore()
      .collection("matchData")
      .doc(uid)
      .collection("pickingData")
      .doc("dating");

    const newReportDocRef = admin.firestore().collection("userReports").doc();

    // uncomment once friend feature is implemented
    // const mdFriendRef = admin
    //   .firestore()
    //   .collection("matchData")
    //   .doc(uid)
    //   .collection("pickingData")
    //   .doc("friend");

    const batch = admin.firestore().batch();

    const reportDocumentData: UserReportOnDatabase = {
      userReportingID: uid,
      userReportedID: report.userReportedID,
      descriptionByUserReporting: report.descriptionByUserReporting,
      state: "not-seen",
      actionTaken: "not-yet-taken",
    };

    const reportedDateMap: dateMap = {
      exists: true,
      date: admin.firestore.Timestamp.fromDate(new Date()) as admin.firestore.Timestamp,
    };

    batch.set(newReportDocRef, reportDocumentData);

    batch.update(mdMainRef, {
      [`reportedUsers.${report.userReportedID}`]: reportedDateMap,
    });

    batch.update(mdDatingRef, {
      [`reportedUsers.${report.userReportedID}`]: reportedDateMap,
    });

    // uncomment once friend feature is implemented
    // batch.update(mdFriendRef, {
    //   [`reportedUsers.${reporteduid}`]: reportedDateMap,
    // });

    await batch.commit();
  });
