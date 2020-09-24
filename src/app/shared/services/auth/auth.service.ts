import { ThrowStmt } from "@angular/compiler";
import { Injectable, OnDestroy } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";
import { BehaviorSubject, Observable, Subscription } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AuthService implements OnDestroy {
  private _userID = new BehaviorSubject<string>(null);
  private _isAuthenticated = new BehaviorSubject<Boolean>(null);

  private isAuthenticated$ = new Subscription();

  public userID: Observable<string> = this._userID.asObservable();
  public isAuthenticated: Observable<
    Boolean
  > = this._isAuthenticated.asObservable();

  constructor(private fs: AngularFirestore, private afAuth: AngularFireAuth) {
    // this._signedIn.next()
    // BELOW IS FOR FOR DEVELOPMENT, UNCOMMENT THE ABOVE FOR NORMAL AUTH
    this.afAuth
      .signInWithEmailAndPassword(
        "archibald.ruban@gmail.com",
        "1q2w3e4r5t6y7u8i9o0p"
      )
      .then(() => {
        this.afAuth.currentUser.then((user) => {
          console.log("ID of logged in user:", user.uid);
          // this._userID.next(user.uid);
        });
      });

    this.isAuthenticated$ = this.afAuth.authState.subscribe((user) => {
      if (user) {
        this._isAuthenticated.next(true);
      } else {
        this._isAuthenticated.next(false);
      }
    });
  }

  async signIn(email: string, password: string) {
    if (!email || !password) return;
    try {
      await this.afAuth.signInWithEmailAndPassword(email, password);

      return true;
    } catch (error) {
      console.log("Sign in failed", error);
      return false;
    }
  }

  async signOut() {
    try {
      await this.afAuth.signOut();
      return true;
    } catch (error) {
      console.log("Sign out failed", error);
      return false;
    }
  }

  async fetchUserID(): Promise<string> {
    const user: firebase.User = await this.afAuth.currentUser;
    const userID: string = user.uid;
    this._userID.next(userID);
    return user.uid;
  }

  ngOnDestroy() {
    this.isAuthenticated$.unsubscribe();
  }
}
