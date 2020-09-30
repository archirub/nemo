import { Injectable } from "@angular/core";
import { Profile } from "@classes/index";

@Injectable({
  providedIn: "root",
})
export class FakeDataService {
  private faker = require("faker");

  constructor() {}

  // generateProfile() {
  //   return new Profile(
  //     this.faker.random.uuid(),
  //     this.faker.name.firstName(),
  //     this.faker.name.lastName(),
  //     this.faker.internet.email(),
  //     new Date(this.faker.date.between("1995-01-01", "2002-12-31")),
  //     this.faker.image.avatar()
  //   );
  //   // const biography: string = this.generateSentence();
  //   // return {
  //   //   firstName: this.faker.name.firstName(),
  //   //   lastName: this.faker.name.lastName(),
  //   //   dateOfBirth: new Date(
  //   //     this.faker.date.between("1995-01-01", "2002-12-31")
  //   //   ),
  //   //   pictures: { 0: this.faker.image.avatar() },
  //   //   biography: biography,
  //   //   socialFeatures: { university: "UCL", course: null, societies: null },
  //   //   matches: [],
  //   //   hasMatchDocument: null,
  //   // };
  // }

  // generateProfiles(amount: number): Profile[] {
  //   return Array.from({ length: amount }, () => {
  //     return this.generateProfile();
  //   });
  // }

  generateSentence(): string {
    return this.faker.lorem.paragraph();
  }

  generateSentences(amount: number): string[] {
    return Array.from({ length: amount }, () => {
      return this.generateSentence();
    });
  }
}
