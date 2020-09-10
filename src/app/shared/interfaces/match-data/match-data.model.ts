import { socialFeatures, physicalFeatures, IDarray } from "../profile";

export interface matchObject {
  userID: string;
  PI: number;
  socialFeatures: socialFeatures;
  physicalFeatures: physicalFeatures;
  bannedUsers: IDarray;
  likedUsers: IDarray;
}
