import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  addOrRemoveReportedRequest,
  dateMap,
} from "../../../src/app/shared/interfaces/index";
import { runWeakUserIdentityCheck } from "../supporting-functions/user-validation/user.checker";
import { sanitizeData } from "../supporting-functions/data-validation/main";

// REQUIES MODIFICATION ONCE WE HAVE A COLLECTION WHERE REPORTED USERS GO, IT WILL SIMPLY
// NEED TO BE ADDED THERE IF "ADD", AND A PROPERTY OF THE DOC SUCH AS active SHOULD BE TURNED
// TO FALSE IF IT SAYS "REMOVE"

// To call when the user reports someone.

export const addOrRemoveReported = functions
  .region("europe-west2")
  .https.onCall(async (request: addOrRemoveReportedRequest, context): Promise<void> => {
    runWeakUserIdentityCheck(context);

    const uid = context?.auth?.uid as string;

    const sanitizedRequest = sanitizeData(
      "addOrRemoveReported",
      request
    ) as addOrRemoveReportedRequest;

    const action = sanitizedRequest.action;
    const reporteduid = sanitizedRequest.reporteduid;

    const user = await admin.auth().getUser(uid);
    const reporteduser = await admin.auth().getUser(reporteduid);

    const mdMainRef = admin.firestore().collection("matchData").doc(uid);
    const mdDatingRef = admin
      .firestore()
      .collection("matchData")
      .doc(uid)
      .collection("pickingData")
      .doc("dating");

    // uncomment once friend feature is implemented
    // const mdFriendRef = admin
    //   .firestore()
    //   .collection("matchData")
    //   .doc(uid)
    //   .collection("pickingData")
    //   .doc("friend");

    const batch = admin.firestore().batch();

    if (action === "add") {
      const reportedDateMap: dateMap = {
        exists: true,
        date: admin.firestore.Timestamp.fromDate(new Date()) as any,
      };

      batch.update(mdMainRef, {
        [`reportedUsers.${reporteduid}`]: reportedDateMap,
      });

      batch.update(mdDatingRef, {
        [`reportedUsers.${reporteduid}`]: reportedDateMap,
      });

      // uncomment once friend feature is implemented
      // batch.update(mdFriendRef, {
      //   [`reportedUsers.${reporteduid}`]: reportedDateMap,
      // });
    } else if (action === "remove") {
      batch.update(mdMainRef, {
        [`reportedUsers.${reporteduid}`]: admin.firestore.FieldValue.delete(),
      });

      batch.update(mdDatingRef, {
        [`reportedUsers.${reporteduid}`]: admin.firestore.FieldValue.delete(),
      });

      // uncomment once friend feature is implemented
      // batch.update(mdFriendRef, {
      //   [`reportedUsers.${reporteduid}`]: admin.firestore.FieldValue.delete(),
      // });
    }
    await batch.commit();
  });
