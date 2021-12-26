import { BehaviorSubject, forkJoin, map, switchMap, tap } from "rxjs";
import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { CustomError } from "@interfaces/error-handling.model";
import { privateProfileFromDatabase } from "@interfaces/profile.model";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

type SwipeState = "init" | "";

@Injectable({
  providedIn: "root",
})
export class SwipeCapService {
  maxSwipes$ = new BehaviorSubject<number>(null);
  swipeCount$ = new BehaviorSubject<number>(null);
  state$ = new BehaviorSubject<SwipeState>("init");

  constructor(
    private fs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private errorHandler: GlobalErrorHandler
  ) {}

  fetchSwipeInfo() {
    const uid$ = this.afAuth.user.pipe(
      tap((u) => {
        if (!u) throw new CustomError("local/check-auth-state", "local");
      }),
      map((u) => u.uid),
      this.errorHandler.handleErrors()
    );
    const maxSwipes$ = this.fs.collection("general").doc<number>("maxSwipes").get();
    const fetchSwipeCount = (uid: string) =>
      this.fs
        .collection("profiles")
        .doc(uid)
        .collection("private")
        .doc<privateProfileFromDatabase>("private")
        .get();

    return uid$.pipe(switchMap((uid) => forkJoin([maxSwipes$, fetchSwipeCount(uid)])));
  }
}
