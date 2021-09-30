import * as admin from "firebase-admin";
import {
  mdFromDatabase,
  profileFromDatabase,
  userSnippet,
  chatFromDatabase,
  mdFriendPickingFromDatabase,
  dateMap,
} from "../../../../src/app/shared/interfaces/index";
import { sortUIDs } from "./main";
import { inexistentDocumentError } from "../../supporting-functions/error-handling/generic-errors";
export interface uidDocRefMapFriend {
  uid: string;
  dateMap: dateMap;
  mainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>;
  friendRef: FirebaseFirestore.DocumentReference<mdFriendPickingFromDatabase>;
}

export async function handleFriendYesChoicesREAD(
  transaction: FirebaseFirestore.Transaction,
  currentUserID: string,
  yesuids: string[],
  date: admin.firestore.Timestamp
): Promise<{
  notMatchedYesUsers: uidDocRefMapFriend[];
  matchedUsers: uidDocRefMapFriend[];
}> {
  const notMatchedYesUsers: uidDocRefMapFriend[] = [];
  const matchedUsers: uidDocRefMapFriend[] = [];

  await Promise.all(
    yesuids.map(async (uid) => {
      const matchDataFriendDoc = (await transaction.get(
        admin
          .firestore()
          .collection("matchData")
          .doc(uid)
          .collection("pickingData")
          .doc("friend")
      )) as FirebaseFirestore.DocumentSnapshot<mdFriendPickingFromDatabase>;
      const matchDataMainRef = admin
        .firestore()
        .collection("matchData")
        .doc(uid) as FirebaseFirestore.DocumentReference<mdFromDatabase>;
      if (!matchDataFriendDoc.exists)
        inexistentDocumentError("matchDataFriend", matchDataFriendDoc.id, currentUserID);

      const matchData = matchDataFriendDoc.data() as mdFriendPickingFromDatabase;

      const uidRefMap: uidDocRefMapFriend = {
        uid,
        dateMap: {
          exists: true,
          date: date as any,
        },
        friendRef: matchDataFriendDoc.ref,
        mainRef: matchDataMainRef,
      };

      // If targetID is in user's liked, then add to match otherwise add to like
      if (matchData.fLikedUsers[currentUserID]?.exists) {
        matchedUsers.push(uidRefMap);
      } else {
        notMatchedYesUsers.push(uidRefMap);
      }
    })
  );

  return {
    notMatchedYesUsers,
    matchedUsers,
  };
}

export function handleFriendYesChoicesWRITE(
  transaction: FirebaseFirestore.Transaction,
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  targetMatchDataDatingRef: FirebaseFirestore.DocumentReference<mdFriendPickingFromDatabase>,
  currentUserID: string,
  notMatchedYesUsers: uidDocRefMapFriend[],
  matchedUsers: uidDocRefMapFriend[]
) {
  handleFriendNotMatchUsers(transaction, targetMatchDataDatingRef, notMatchedYesUsers);

  handleFriendMatchUsers(
    transaction,
    targetMatchDataMainRef,
    currentUserID,
    matchedUsers
  );
}

function handleFriendMatchUsers(
  transaction: FirebaseFirestore.Transaction,
  targetMatchDataMainRef: FirebaseFirestore.DocumentReference<mdFromDatabase>,
  targetuid: string,
  uidRefs: uidDocRefMapFriend[]
) {
  uidRefs.forEach((uidref) => {
    // UPDATING MATCHEDUSERS FIELD OF TARGET USER
    transaction.update(targetMatchDataMainRef, {
      [`fmatchedUsers.${uidref.uid}`]: uidref.dateMap,
    });

    // UPDATING MATCHEDUSERS AND LIKEDUSERS FIELDS OF EACH NEW MATCH
    // Here we use the datemap of the other user but it works just as well
    transaction.update(uidref.mainRef, {
      [`fmatchedUsers.${targetuid}`]: uidref.dateMap,
    });
    transaction.update(uidref.friendRef, {
      [`fLikedUsers.${targetuid}`]: FirebaseFirestore.FieldValue.delete(),
    });
  });
}

function handleFriendNotMatchUsers(
  transaction: FirebaseFirestore.Transaction,
  targetMatchDataFriendRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>,
  notMatchedYesUsers: uidDocRefMapFriend[]
) {
  // UPDATING LIKED USERS ARRAY OF TARGET USER
  if (notMatchedYesUsers.length > 0) {
    notMatchedYesUsers.forEach((uidref) => {
      transaction.update(targetMatchDataFriendRef, {
        [`fLikedUsers.${uidref.uid}`]: uidref.dateMap,
      });
    });
  }
}

export type profileSnapshot = FirebaseFirestore.DocumentSnapshot<profileFromDatabase>;

export async function createFriendChatDocumentsREAD(
  transaction: FirebaseFirestore.Transaction,
  targetuid: string,
  matcheduids: string[]
): Promise<{
  targetUserProfile: profileSnapshot;
  matchedUserProfiles: profileSnapshot[];
}> {
  const targetUserProfileCall = transaction.get(
    admin.firestore().collection("profiles").doc(targetuid)
  );
  const matchedUsersProfileCall = matcheduids.map(async (uid) => {
    return await transaction.get(admin.firestore().collection("profiles").doc(uid));
  });

  const snapshots = await Promise.all([
    targetUserProfileCall,
    ...matchedUsersProfileCall,
  ]);

  const targetUserProfile = snapshots[0] as profileSnapshot;

  snapshots.shift(); // to remove targetUserProfile from snapshots array
  const matchedUserProfiles = snapshots as profileSnapshot[];

  if (!targetUserProfile?.exists)
    inexistentDocumentError("profile", targetUserProfile.id, targetuid);

  return { targetUserProfile, matchedUserProfiles };
}

export function createFriendChatDocumentsWRITE(
  transaction: FirebaseFirestore.Transaction,
  targetUserProfile: profileSnapshot,
  matchedUserProfiles: profileSnapshot[]
) {
  matchedUserProfiles.map((matchedUserProfile) => {
    if (!matchedUserProfile.exists)
      inexistentDocumentError("profile", matchedUserProfile.id, targetUserProfile.id);

    const targetUserData = targetUserProfile.data() as profileFromDatabase;
    const matchedUserData = matchedUserProfile.data() as profileFromDatabase;

    // PICTURE FIXING REQUIRED
    const uids = sortUIDs([targetUserProfile.id, matchedUserProfile?.id]);
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

    const newChatRef = admin.firestore().collection("chats").doc();

    transaction.set(newChatRef, chat);
  });
}
