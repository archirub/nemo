import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { mdMainFromDatabase } from "../../src/app/shared/interfaces/index";

/**
 * Upon update detected in a matchData document:
 * counts the total number of uids across all uid map fields
 * ( "reportedUsers", "dislikedUsers","fdislikedUsers","fmatchedUsers","matchedUsers"),
 * and sets the property "uidCount" of that document to that value.
 */

export const updateUidCountMatchData = functions
  .region("europe-west2")
  .firestore.document("matchData/{uid}")
  .onUpdate(async (change, context) => {
    const uid = context.params.uid;
    const v = change.after.data() as mdMainFromDatabase;

    let totalCount = 0;

    // loops through fields of the document that have shape "{[uid: string]: dateMap}""
    (
      [
        "reportedUsers",
        "dislikedUsers",
        "fdislikedUsers",
        "fmatchedUsers",
        "matchedUsers",
      ] as const
    ).forEach((propName) => {
      // gets number of uids from length of object
      let count = Object.keys(v[propName]).length;

      // case where object has no length property i.e. doesn't exist
      if (typeof count !== "number") {
        count = 0;
      }
      totalCount += count;
    });

    // commits changes
    await admin.firestore().collection("matchData").doc(uid).update({
      uidCount: totalCount,
    });
  });
