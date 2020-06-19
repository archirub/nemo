import { Injectable } from "@angular/core";
import { Profile } from "../profile.model";

@Injectable({
  providedIn: "root",
})
export class FakeDataService {
  private faker = require("faker");

  constructor() {}

  generateProfile() {
    return new Profile(
      this.faker.random.uuid(),
      this.faker.name.firstName(),
      this.faker.name.lastName(),
      this.faker.internet.email(),
      new Date(this.faker.date.between("1995-01-01", "2002-12-31")),
      this.faker.image.avatar()
    );
  }

  generateProfiles(amount: number): Profile[] {
    return Array.from({ length: amount }, () => {
      return this.generateProfile();
    });
  }

  generateSentence(): string {
    return this.faker.lorem.paragraph();
  }
}
