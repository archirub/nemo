import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, Observable, of } from "rxjs";
import { filter, first, map, switchMap, take } from "rxjs/operators";

import {
  universitiesAllowedDocument,
  UniversityInfo,
  UniversityName,
} from "@interfaces/universities.model";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { CustomError } from "@interfaces/error-handling.model";

@Injectable({
  providedIn: "root",
})
export class UniversitiesStore {
  private universities = new BehaviorSubject<UniversityInfo[]>(null);
  universities$ = this.universities.asObservable();

  optionsList$ = this.universities$.pipe(
    map((universities) => (universities ? universities.map((info) => info.name) : []))
  );

  constructor(
    private firestore: AngularFirestore,
    private errorHandler: GlobalErrorHandler
  ) {}

  fetchUniversities(): Observable<any> {
    return this.universities$.pipe(
      first(),
      switchMap((universities) => {
        if (Array.isArray(universities)) return of("");

        return this.firestore
          .collection("admin")
          .doc("universitiesAllowed")
          .get()
          .pipe(
            this.errorHandler.convertErrors("firestore"),
            map((snapshot) => (snapshot.exists ? snapshot.data() : null)),
            map((data: universitiesAllowedDocument) => {
              if (!data) throw new CustomError("local/cannot-recover", "local");

              this.universities.next(data.list);
            }),
            this.errorHandler.handleErrors()
          );
      })
    );
  }

  /**
   * If result is null, then that means no match was found
   */
  getUniversityFromEmail(email: string): Observable<UniversityName | null> {
    return this.universities$.pipe(
      filter((u) => !!u),
      map(
        (universities) =>
          universities
            .map((info) => (email.endsWith(info.emailDomain) ? info.name : null))
            .filter(Boolean)[0] ?? null
      )
    );
  }
}
