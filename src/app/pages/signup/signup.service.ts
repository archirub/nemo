import { Injectable } from "@angular/core";

import { SignupMap, SignupOptional, SignupRequired } from "@interfaces/index";

@Injectable({
  providedIn: "root",
})
export class SignupService {
  signupForm: SignupMap;

  constructor() {
    this.signupForm = {
      firstName: null,
      lastName: null,
      dateOfBirth: null,
      pictures: null,
      university: null,
      biography: null,
      course: null,
      society: null,
      areaOfStudy: null,
      societyCategory: null,
      interests: null,
      questions: null,
      location: null,
    };
  }

  updateRequiredFields(fields: SignupRequired) {
    for (const field in fields) {
      if (!field) return console.error("Missing field value", fields);
    }

    this.signupForm.firstName = fields.firstName;
    this.signupForm.lastName = fields.lastName;
    this.signupForm.dateOfBirth = fields.dateOfBirth;
    this.signupForm.pictures = fields.pictures;
    this.signupForm.university = fields.university;
  }

  updateOptionalFields(fields: SignupOptional) {
    for (const field in fields) {
      if (!field) return console.error("Missing field value", fields);
    }

    this.signupForm.biography = fields.biography;
    this.signupForm.course = fields.course;
    this.signupForm.society = fields.society;
    this.signupForm.areaOfStudy = fields.areaOfStudy;
    this.signupForm.societyCategory = fields.societyCategory;
    this.signupForm.interests = fields.interests;
    this.signupForm.questions = fields.questions;
    this.signupForm.location = fields.location;
  }

  async submitToDatabase() {}

  checkFields() {
    const f = this.signupForm;

    for (const field in f) {
      if (!field) return console.error("Missing field value", f);
    }

    if (!f.firstName || typeof f.firstName !== "string") return console.error();
    if (!f.lastName || typeof f.lastName !== "string") return console.error();
    if (!f.dateOfBirth || f.dateOfBirth instanceof Date) return console.error();
  }
}
