export interface AuthResponseData {
    kind: string,
    idToken: string,
    email: string,
    refreshToken: string,
    localId: string,
    expiresIn: string,
    registered?: boolean
  }