import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  mdFromDatabase,
  profileFromDatabase,
  userSnippet,
  chatFromDatabase,
  mdDatingPickingFromDatabase,
  dateMap,
} from "../../../src/app/shared/interfaces/index";
import { sortUIDs } from "./main";
interface uidDocRefMap {
  uid: string;
  dateMap: dateMap;
  mainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>;
  datingRef: FirebaseFirestore.DocumentReference<mdDatingPickingFromDatabase>;
}

export async function handleDatingYesChoices(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  currentUserID: string,
  yesuids: string[],
  superuids: string[],
  date: admin.firestore.Timestamp
) {
  if (!currentUserID || !yesuids || !superuids || !batch || !targetMatchDataMainRef)
    throw new functions.https.HttpsError(
      "invalid-argument",
      "handleNoChoices could not be executed due to missing / invalid arguments."
    );
  const targetMatchDataDatingRef = admin
    .firestore()
    .collection("matchData")
    .doc(currentUserID)
    .collection("pickingData")
    .doc("dating");

  const notMatchedYesUsers: uidDocRefMap[] = [];
  const notMatchedSuperUsers: uidDocRefMap[] = [];
  const matchedUsers: uidDocRefMap[] = [];

  const alluids: string[] = yesuids.concat(superuids);

  try {
    await Promise.all(
      alluids.map(async (uid) => {
        const matchDataDatingDoc = (await admin
          .firestore()
          .collection("matchData")
          .doc(uid)
          .collection("pickingData")
          .doc("dating")
          .get()) as FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>;
        const matchDataMainRef = admin
          .firestore()
          .collection("matchData")
          .doc(uid) as FirebaseFirestore.DocumentReference<mdFromDatabase>;
        if (!matchDataDatingDoc.exists)
          return functions.logger.warn("matchData doc doesn't exist for", uid);

        if (!matchDataDatingDoc.exists) return;

        const matchData = matchDataDatingDoc.data() as mdDatingPickingFromDatabase;

        const uidRefMap: uidDocRefMap = {
          uid,
          dateMap: {
            exists: true,
            date: date as any,
          },
          datingRef: matchDataDatingDoc.ref,
          mainRef: matchDataMainRef,
        };

        // Check whether targetID is in user's liked or superliked array
        const isLiked =
          matchData.likedUsers[currentUserID]?.exists ||
          matchData.superLikedUsers[currentUserID]?.exists;

        // If targetID is, then add to match otherwise add to like or super
        if (isLiked) {
          matchedUsers.push(uidRefMap);
        } else {
          // If other's ID was from normal likes, add them there, otherwise add to super
          if (superuids.indexOf(uid) === -1) {
            notMatchedYesUsers.push(uidRefMap);
          } else {
            notMatchedSuperUsers.push(uidRefMap);
          }
        }
      })
    );

    handleDatingNotMatchUsers(
      batch,
      targetMatchDataDatingRef,
      notMatchedYesUsers,
      notMatchedSuperUsers
    );

    handleDatingMatchUsers(batch, targetMatchDataMainRef, currentUserID, matchedUsers);

    return matchedUsers.map((map) => map.uid);
  } catch (e) {
    throw new functions.https.HttpsError(
      "internal",
      `Could not handle yes choices of ${currentUserID}: ${e}`
    );
  }
}

function handleDatingMatchUsers(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  targetuid: string,
  uidRefs: uidDocRefMap[]
) {
  uidRefs.forEach((uidref) => {
    // UPDATING MATCHEDUSERS FIELD OF TARGET USER
    batch.update(targetMatchDataMainRef, {
      [`matchedUsers.${uidref.uid}`]: uidref.dateMap,
    });

    // UPDATING MATCHEDUSERS AND LIKEDUSERS FIELDS OF EACH NEW MATCH
    // Here we use the datemap of the other user but it works just as well
    batch.update(uidref.mainRef, {
      [`matchedUsers.${targetuid}`]: uidref.dateMap,
    });
    batch.update(uidref.datingRef, {
      [`likedUsers.${targetuid}`]: FirebaseFirestore.FieldValue.delete(),
    });
  });
}

function handleDatingNotMatchUsers(
  batch: FirebaseFirestore.WriteBatch,
  targetMatchDataDatingRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  notMatchedYesUsers: uidDocRefMap[],
  notMatchedSuperUsers: uidDocRefMap[]
) {
  if (notMatchedYesUsers.length > 0) {
    notMatchedYesUsers.forEach((uidref) => {
      batch.update(targetMatchDataDatingRef, {
        [`likedUsers.${uidref.uid}`]: uidref.dateMap,
      });
    });
  }

  if (notMatchedSuperUsers.length > 0) {
    notMatchedSuperUsers.forEach((uidref) => {
      batch.update(targetMatchDataDatingRef, {
        [`superLikedUsers.${uidref.uid}`]: uidref.dateMap,
      });
    });
  }
}

type profileSnapshot = FirebaseFirestore.DocumentSnapshot<profileFromDatabase>;

export async function createDatingChatDocuments(
  targetuid: string,
  matcheduids: string[]
) {
  if (!targetuid || !matcheduids || matcheduids.length < 1)
    functions.logger.warn("Missing parameter in createChatDocuments");

  let targetUserProfile: profileSnapshot | undefined;
  let matchedUsersProfile: profileSnapshot[] = [];

  const targetUserProfileCall = admin
    .firestore()
    .collection("profiles")
    .doc(targetuid)
    .get();
  const matchedUsersProfileCall = matcheduids.map(async (uid) => {
    return await admin.firestore().collection("profiles").doc(uid).get();
  });

  await Promise.all([targetUserProfileCall, ...matchedUsersProfileCall]).then(
    (snapshots) => {
      targetUserProfile = snapshots[0] as profileSnapshot;
      matchedUsersProfile = snapshots.slice(1) as profileSnapshot[];
    }
  );

  await Promise.all(
    matchedUsersProfile.map(async (matchedUserProfile) => {
      if (!matchedUserProfile.exists)
        return functions.logger.warn(
          `The following user does not have a profile doc:${matchedUserProfile.id}`
        );

      // Had to do this check inside arrow function otherwise typescript shouts because it doesn't
      // detect I checked outside of the arrow function's scope
      if (
        !targetUserProfile ||
        !targetUserProfile.exists ||
        !matchedUserProfile ||
        !matchedUserProfile.exists
      )
        return;

      const targetUserData = targetUserProfile.data() as profileFromDatabase;
      const matchedUserData = matchedUserProfile.data() as profileFromDatabase;

      const uids = sortUIDs([targetUserProfile.id, matchedUserProfile?.id]);
      // FIX, ADD RIGHT PICTURES LOGIC
      const userSnippets: userSnippet[] = [
        {
          uid: targetUserProfile.id,
          name: targetUserData.firstName,
        },
        {
          uid: matchedUserProfile.id,
          name: matchedUserData.firstName,
        },
      ];

      const chat: chatFromDatabase = {
        uids,
        userSnippets,
      };

      await admin.firestore().collection("chats").add(chat);
    })
  );
}
