import { allowOptionalProp } from "./shared.model";
import { SignupOptional, SignupRequired, SignupAuthenticated } from "./signup.model";

export interface AuthResponseData {
  kind: string;
  idToken: string;
  email: string;
  refreshToken: string;
  localId: string;
  expiresIn: string;
  registered?: boolean;
}

export type signupDataHolder = SignupAuthenticated &
  allowOptionalProp<SignupRequired> &
  allowOptionalProp<SignupOptional>;
