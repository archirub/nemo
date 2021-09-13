import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import {
  universitiesAllowedDocument,
  UniversityInfo,
  UniversityName,
} from "@interfaces/universities.model";
import { BehaviorSubject, Observable, of } from "rxjs";
import { filter, map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class UniversitiesStore {
  private universities = new BehaviorSubject<UniversityInfo[]>(null);
  public universities$ = this.universities.asObservable();

  constructor(private firestore: AngularFirestore) {}

  fetchUniversities(): Observable<any> {
    if (this.universities.getValue() !== null) return of("");

    return this.firestore
      .collection("admin")
      .doc("universitiesAllowed")
      .get()
      .pipe(
        map((snapshot) => (snapshot.exists ? snapshot.data() : null)),
        map((data: universitiesAllowedDocument) => {
          console.log("universities fetched");
          if (!data) return console.error("Document does not exist.");

          this.universities.next(data.list);
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

  get optionsList$(): Observable<UniversityName[]> {
    return this.universities$.pipe(
      map((universities) => (universities ? universities.map((info) => info.name) : []))
    );
  }
}
