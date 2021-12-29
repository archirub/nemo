import * as admin from "firebase-admin";

import { notFoundDocumentError } from "../../supporting-functions/error-handling/generic-errors";

import {
  SwipeCapDocument,
  SwipeCapGeneralDocument,
} from "../../../../src/app/shared/interfaces/index";

export async function swipeCapREAD(
  transaction: FirebaseFirestore.Transaction,
  currentUserID: string
): Promise<{
  swipeCap: SwipeCapDocument | null;
  swipeCapGeneral: SwipeCapGeneralDocument;
}> {
  const swipeCapGet = transaction.get(
    admin
      .firestore()
      .collection("profiles")
      .doc(currentUserID)
      .collection("private")
      .doc("swipeCap") as FirebaseFirestore.DocumentReference<SwipeCapDocument>
  );
  const maxDailySwipesGet = transaction.get(
    admin
      .firestore()
      .collection("general")
      .doc("swipeCap") as FirebaseFirestore.DocumentReference<SwipeCapGeneralDocument>
  );

  const [swipeCapDoc, swipeCapGeneralDoc] = await Promise.all([
    swipeCapGet,
    maxDailySwipesGet,
  ]);

  if (!swipeCapGeneralDoc.exists)
    notFoundDocumentError("general/", "swipeCap", currentUserID);

  const swipeCapGeneral = swipeCapGeneralDoc.data();
  const swipeCap: SwipeCapDocument | null = swipeCapDoc.exists
    ? swipeCapDoc.data()
    : null;

  return { swipeCap, swipeCapGeneral };
}

export function swipeCapWRITE(
  transaction: FirebaseFirestore.Transaction,
  currentUserID: string,
  choiceCount: number,
  swipeCapReadReturn: {
    swipeCap: SwipeCapDocument | null;
    swipeCapGeneral: SwipeCapGeneralDocument;
  }
) {
  const minSwipes = 0;
  const maxSwipes = swipeCapReadReturn?.swipeCapGeneral?.maxSwipes ?? 20;
  const increaseRateHour = swipeCapReadReturn?.swipeCapGeneral?.increaseRatePerHour ?? 1;

  // default to maxSwipes and current time bc assuming if there is no swipe doc that means it's the first time the user swipes
  // so it yet has to be created
  const lastRecorded = swipeCapReadReturn?.swipeCap?.date?.toDate() ?? new Date();
  const prevSwipesLeft = swipeCapReadReturn?.swipeCap?.swipesLeft ?? maxSwipes;

  const now = new Date();
  const timeElapsedMilli = now.getTime() - lastRecorded.getTime();
  const increaseRateMilli = increaseRateHour / (3600 * 1000);

  let newSwipesLeft = prevSwipesLeft - choiceCount + timeElapsedMilli * increaseRateMilli;
  newSwipesLeft = Math.max(minSwipes, newSwipesLeft);
  newSwipesLeft = Math.min(maxSwipes, newSwipesLeft);

  const swipeCapData: SwipeCapDocument = {
    swipesLeft: newSwipesLeft,
    date: admin.firestore.Timestamp.fromDate(now),
  };

  transaction.set(
    admin
      .firestore()
      .collection("profiles")
      .doc(currentUserID)
      .collection("private")
      .doc("swipeCap"),
    swipeCapData
  );
}
