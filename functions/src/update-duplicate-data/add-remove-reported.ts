import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  addOrRemoveReportedRequest,
  successResponse,
  dateMap,
} from "../../../src/app/shared/interfaces/index";

// REQUIES MODIFICATION ONCE WE HAVE A COLLECTION WHERE REPORTED USERS GO, IT WILL SIMPLY
// NEED TO BE ADDED THERE IF "ADD", AND A PROPERTY OF THE DOC SUCH AS active SHOULD BE TURNED
// TO FALSE IF IT SAYS "REMOVE"

export const addOrRemoveReported = functions.region("europe-west2").https.onCall(
  async (data: addOrRemoveReportedRequest, context): Promise<successResponse> => {
    const action = data.action;
    const uid = data.uid;
    const reporteduid = data.reporteduid;
    const description = data.description;

    if (!["add", "remove"].includes(action)) return { successful: false };
    try {
      const user = await admin.auth().getUser(uid).catch();
      const reporteduser = await admin.auth().getUser(reporteduid);
    } catch (e) {
      console.error(
        `one of these uids doesn't correspond to any account: ${uid} ${reporteduid}, ${e}`
      );
      return { successful: false };
    }

    const mdMainRef = admin.firestore().collection("matchData").doc(uid);
    const mdDatingRef = admin
      .firestore()
      .collection("matchData")
      .doc(uid)
      .collection("pickingData")
      .doc("dating");
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
        date: admin.firestore.Timestamp.fromDate(new Date()),
      };

      batch.update(mdMainRef, {
        [`reportedUsers.${reporteduid}`]: reportedDateMap,
      });

      batch.update(mdDatingRef, {
        [`reportedUsers.${reporteduid}`]: reportedDateMap,
      });

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

      // batch.update(mdFriendRef, {
      //   [`reportedUsers.${reporteduid}`]: admin.firestore.FieldValue.delete(),
      // });
    }
    try {
      await batch.commit();
      return { successful: true };
    } catch (e) {
      return { successful: false };
    }
  }
);
