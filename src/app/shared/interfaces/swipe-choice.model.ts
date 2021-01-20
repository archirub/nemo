import { Profile } from "@classes/index";

export const swipeChoiceOptions = ["yes", "no", "super"] as const;
export type swipeChoice = typeof swipeChoiceOptions[number];

export interface profileChoiceMap {
  profile: Profile;
  choice: swipeChoice;
}

export interface uidChoiceMap {
  uid: string;
  choice: swipeChoice;
}
