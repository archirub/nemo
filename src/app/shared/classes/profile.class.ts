import {
  profile,
  SocialMediaLink,
  QuestionAndAnswer,
  UniversityName,
  // OnCampus,
  Degree,
  Interests,
  SocietyCategory,
  AreaOfStudy,
} from "@interfaces/index";

export class Profile implements profile {
  uid: string;
  firstName: string;
  dateOfBirth: Date;
  pictureUrls: string[];
  pictureCount: number | null;
  biography: string;
  university: UniversityName;
  course: string;
  society: string;
  societyCategory: SocietyCategory;
  areaOfStudy: AreaOfStudy;
  interests: Interests[];
  questions: QuestionAndAnswer[];
  //  onCampus: OnCampus;
  degree: Degree;
  socialMediaLinks: SocialMediaLink[];

  constructor(
    uid: string,
    firstName: string,
    dateOfBirth: Date,
    pictureUrls: string[],
    pictureCount: number | null,
    biography: string,
    university: UniversityName,
    course: string,
    society: string,
    societyCategory: SocietyCategory,
    areaOfStudy: AreaOfStudy,
    interests: Interests[],
    questions: QuestionAndAnswer[],
    // onCampus: OnCampus,
    degree: Degree,
    socialMediaLinks: SocialMediaLink[]
  ) {
    this.uid = uid;
    this.firstName = firstName;
    this.dateOfBirth = dateOfBirth;
    this.pictureUrls = pictureUrls;
    this.pictureCount = pictureCount;
    this.biography = biography;
    this.university = university;
    this.course = course;
    this.society = society;
    this.societyCategory = societyCategory;
    this.areaOfStudy = areaOfStudy;
    this.interests = interests;
    this.questions = questions;
    // this.onCampus = onCampus;
    this.degree = degree;
    this.socialMediaLinks = socialMediaLinks;
  }

  age() {
    const currentTime = new Date();
    return Math.trunc(
      (currentTime.getTime() - this.dateOfBirth.getTime()) / (1000 * 3600 * 24 * 365)
    );
  }
}
