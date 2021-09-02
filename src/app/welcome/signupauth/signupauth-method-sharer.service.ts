import { Injectable } from "@angular/core";

// necessary to use the "goStraightToEmailVerification" method from the signupauth page
// inside the global-state-management service. Indeed, we cannot import a page into a service,
// nor can we move the page's method to the global-state-management service as it acts on functionalities
// of the page itself

@Injectable({
  providedIn: "root",
})
export class SignupAuthMethodSharer {
  public goStraightToEmailVerification: () => Promise<void>;

  public defineGoStraightToEmailVerification(fn: () => Promise<void>) {
    this.goStraightToEmailVerification = fn;
  }
}
