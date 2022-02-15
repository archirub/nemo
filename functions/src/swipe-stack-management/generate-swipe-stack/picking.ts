import {
  mdDatingPickingFromDatabase,
  mdFriendPickingFromDatabase,
  uidChoiceMap,
} from "../../../../src/app/shared/interfaces/index";
import * as functions from "firebase-functions";

/**
 * returns a whole number picked according to a normal distribution around mean
 * with no picks above "upper", below "lower" or in "forbiddenValues".
 *
 * Make sure lower boundary is higher than -1.
 *
 * returns -1 if arguments provided are wrong
 * @param mean mean of distribution
 * @param lower lowest allowed value
 * @param upper highest allowed value
 * @param iteration counts # of retries of a given pick attempt
 * @param forbiddenValues array of values gaussian can't pick
 */
export function randomFromGaussian(
  mean: number,
  lower: number,
  upper: number,
  variance: number,
  threshold: number = 50,
  iteration: number = 0
  // forbiddenValues: number[]
): number {
  if (mean > upper || mean < lower) {
    // eslint-disable-next-line no-param-reassign
    mean = upper;
  }
  if (mean < lower) {
    // eslint-disable-next-line no-param-reassign
    mean = lower;
  }

  if (iteration >= threshold) {
    functions.logger.warn(
      `Maximum number of iterations (${iteration}/${threshold}) exceeded while picking from Gaussian. mean ${mean}, variance ${variance}, lower and upper boundaries ${lower}, ${upper}`
    );
    return -1;
  }

  // eslint-disable-next-line no-param-reassign
  iteration += 1;

  // Picking from uniform random distribution
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  // Converting to standardized normal distribution
  let pick = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

  // Adjusting variance and mean
  pick *= (upper - lower) / variance;
  pick += mean;
  pick = Math.round(pick);

  // Retry if pick isn't between boundaries
  if (pick > upper || pick < lower)
    //  || forbiddenValues.includes(pick))
    return randomFromGaussian(
      mean,
      lower,
      upper,
      variance,
      threshold,
      iteration
      // forbiddenValues
    );

  // assuming scale is indexes of an array, then returns a whole number
  // so that it's in index format already
  return Math.round(pick);
}

/**
 * Returns a random selection from the groups provided according to their respective weightings
 *
 * @param groups weight groups
 * @param weightings weightings corresponding to each group
 * @param countWanted number of picks wanted
 */
export function randomWeightedPick(
  groups: uidChoiceMap[][] | undefined,
  weightings: number[] | undefined,
  countWanted: number | undefined
): Array<uidChoiceMap> | undefined {
  if (!groups || !weightings || !countWanted) return;
  if (groups.length !== weightings.length) return;

  const pickedItems: { [uid: string]: uidChoiceMap } = {};
  const countAvailable: number = groups
    .map((group) => group.length)
    .reduce((a, b) => a + b, 0);

  // Makes sure loop doesn't run indefinitely
  const countDesired: number = Math.min(countAvailable, countWanted);

  while (Object.keys(pickedItems).length < countDesired) {
    const indexOfPick: number = aliasSampler(weightings);

    const groupOfPick: uidChoiceMap[] = groups[indexOfPick];

    const pick: uidChoiceMap =
      groupOfPick[Math.floor(Math.random() * groupOfPick.length)];

    // appends to array if not yet in array and pick isn't null
    if (pick && !pickedItems.hasOwnProperty(pick.uid)) pickedItems[pick.uid] = pick;

    // removing item from the group to reduce unnecessary loops
    groupOfPick.filter((item) => item !== pick);
  }

  return Object.entries(pickedItems).map((keyValue) => keyValue[1]);
}

/**
 * Returns a random sampler for the discrete probability distribution
 * defined by the given array
 * @param inputProbabilities The array of input probabilities to use.
 *   The array's values must be Numbers, but can be of any magnitude
 * @returns A function with no arguments that, when called, returns
 *   a number between 0 and inputProbabilities.length with respect to
 *   the weights given by inputProbabilities.
 */
function aliasSampler(inputProbabilities: number[]) {
  let probabilities: number[];
  const aliases: number[] = [];

  // First copy and type-check the input probabilities,
  // also taking their sum.
  probabilities = inputProbabilities.map((probability, i) => {
    if (Number.isNaN(Number(probability))) {
      throw new TypeError("Non-numerical value in distribution at index " + i);
    }
    return Number(probability);
  });
  const probsum = inputProbabilities.reduce(function (sum, p) {
    return sum + p;
  }, 0);

  // Scale all of the probabilities such that their average is 1
  // (i.e. if all of the input probabilities are the same, then they
  // are all set to 1 by this procedure)
  const probMultiplier = inputProbabilities.length / probsum;
  probabilities = probabilities.map(function (p, i) {
    return p * probMultiplier;
  });

  // Sort the probabilities into overFull and underFull queues
  const overFull: number[] = [],
    underFull: number[] = [];
  probabilities.forEach((probability, i) => {
    if (probability > 1) overFull.push(i);
    else if (probability < 1) underFull.push(i);
    else if (probability !== 1) {
      throw new Error(
        "User program has disrupted JavaScript defaults " +
          "and prevented this function from executing correctly."
      );
    }
  });

  // Construct the alias table.
  // In each iteration, the remaining space in an underfull cell
  // will be filled by surplus space from an overfull cell, such
  // that the underfull cell becomes exactly full.
  // The overfull cell will then be reclassified as to how much
  // probability it has left.
  while (overFull.length > 0 || underFull.length > 0) {
    if (overFull.length > 0 && underFull.length > 0) {
      aliases[underFull[0]] = overFull[0];
      probabilities[overFull[0]] += probabilities[underFull[0]] - 1;
      underFull.shift();
      if (probabilities[overFull[0]] > 1) overFull.push(overFull.shift() as number);
      else if (probabilities[overFull[0]] < 1) underFull.push(overFull.shift() as number);
      else overFull.shift();
    } else {
      // Because the average of all the probabilities is 1, mathematically speaking,
      // this block should never be reached. However, because of rounding errors
      // posed by floating-point numbers, a tiny bit of surplus can be left over.
      // The error is typically neglegible enough to ignore.
      const notEmptyArray = overFull.length > 0 ? overFull : underFull;
      notEmptyArray.forEach(function (i) {
        probabilities[i] = 1;
      });
      notEmptyArray.length = 0;
    }
  }

  // Finally, create and return the sampler. With the creation of the alias table,
  // each box now represents a biased coin whose possibilities are either it or
  // its corresponding alias (the overfull cell it took from). The sampler picks
  // one of these coins with equal probability for each, then flips it and returns
  // the result.

  const index = Math.floor(Math.random() * probabilities.length);
  return Math.random() < probabilities[index] ? index : aliases[index];
}

/** Created separate function for that instead of leaving in main of pickFromDemographicArrays
 * So that the function can be recalled if the person is already in array
 */
export function pickIndex(
  indexesAlreadyPicked: { [index: number]: true },
  mean: number,
  lowerBound: number,
  upperBound: number,
  variance: number
): number {
  const indexPicked: number = randomFromGaussian(mean, lowerBound, upperBound, variance);

  // checks if index hasn't already been picked, if randomFromGaussian didn't return an error,
  // and if number of indexes already picked isn't larger than the number of values available
  if (
    indexesAlreadyPicked.hasOwnProperty(indexPicked) &&
    indexPicked !== -1 &&
    Object.keys(indexesAlreadyPicked).length < Math.round(upperBound - lowerBound)
  ) {
    return pickIndex(indexesAlreadyPicked, mean, lowerBound, upperBound, variance);
  }
  return indexPicked;
}

export function pickFromSCArray(
  uids: FirebaseFirestore.DocumentSnapshot<
    mdDatingPickingFromDatabase | mdFriendPickingFromDatabase
  >[],
  variance: number,
  numberOfPicks: number
): FirebaseFirestore.DocumentSnapshot<
  mdDatingPickingFromDatabase | mdFriendPickingFromDatabase
>[] {
  // For storing indexes picked per demographic. Stored as object rather than array
  // for most efficiently checking if index has already been picked
  const indexesPicked: { [index: number]: true } = {};

  // PICK INDEXES
  Array.from({ length: numberOfPicks }).forEach(() => {
    // So that mean is at perfect SC match
    const mean: number = uids.length - 1;

    const upperBound: number = mean;
    const lowerBound = 0;

    // HAVE TO HANDLE IF RANDOMFROMGAUSSIAN RETURNS -1 (i.e. there was a problem)
    const indexPicked: number = pickIndex(
      indexesPicked,
      mean,
      lowerBound,
      upperBound,
      variance
    );

    // temporary fix
    if (indexPicked !== -1) {
      // Saves index to object
      indexesPicked[indexPicked] = true;
    }
  });

  // RETURN UIDs CORRESPONDING TO INDEXES PICKED
  const uidsPicked: FirebaseFirestore.DocumentSnapshot<
    mdDatingPickingFromDatabase | mdFriendPickingFromDatabase
  >[] = [];
  for (const i in indexesPicked) {
    uidsPicked.push(uids[i]);
  }

  // to remove duplicates but is it even necessary? I think only people with "trans"
  // as their gender can be in different arrays, so maybe just do that at the very very end
  // and just once
  return uidsPicked;
}
