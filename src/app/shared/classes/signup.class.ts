import { AreaOfStudy, Baseline, Degree, Full, Gender, Interest, profilePictureUrls, QuestionAndAnswer, SexualPreference, SignupAuth, SignupOptional, SignupRequired, SocietyCategory, SwipeMode } from "@interfaces/index";


export class AuthUser implements SignupAuth {

    constructor(myMap: SignupAuth) {
        this.email = myMap.email;
        this.uid = myMap.uid;
        this.token = myMap.token;
        this.tokenExpirationDate = myMap.tokenExpirationDate
    }

    private _email: string;
    private _uid: string;
    private _token: string;
    private _tokenExpirationDate: string;

    public get email(): string {
        return this._email;
    }
    public set email(value: string) {
        this._email = value;
    }
    public get uid(): string {
        return this._uid;
    }
    public set uid(value: string) {
        this._uid = value;
    }
    public get token(): string {
        return this._token;
    }
    public set token(value: string) {
        this._token = value;
    }
    public get tokenExpirationDate(): string {
        return this._tokenExpirationDate;
    }
    public set tokenExpirationDate(value: string) {
        this._tokenExpirationDate = value;
    }
}

export class BaselineUser extends AuthUser implements SignupRequired {
    constructor(myMap: Baseline) {
        super(myMap);
        this.firstName = myMap.firstName;
        this.dateOfBirth = myMap.dateOfBirth;
        this.university = myMap.university; 
        this.gender = myMap.gender;
        this.sexualPreference = myMap.sexualPreference,
        this.swipeMode = myMap.swipeMode
    }

    private _firstName: string;
    private _dateOfBirth: string;
    private _university: string;
    private _gender: Gender;
    private _sexualPreference: SexualPreference;
    private _pictures: profilePictureUrls; //add in contructer + getter and setter methods

    private _swipeMode: SwipeMode;

    public get firstName(): string {
        return this._firstName;
    }
    public set firstName(value: string) {
        this._firstName = value;
    }
    public get dateOfBirth(): string {
        return this._dateOfBirth;
    }
    public set dateOfBirth(value: string) {
        this._dateOfBirth = value;
    }
    public get university(): string {
        return this._university;
    }
    public set university(value: string) {
        this._university = value;
    }
    public get gender(): Gender {
        return this._gender;
    }
    public set gender(value: Gender) {
        this._gender = value;
    }
    public get sexualPreference(): SexualPreference {
        return this._sexualPreference;
    }
    public set sexualPreference(value: SexualPreference) {
        this._sexualPreference = value;
    }
    public get swipeMode(): SwipeMode {
        return this._swipeMode;
    }
    public set swipeMode(value: SwipeMode) {
        this._swipeMode = value;
    }
}

export class FullUser extends BaselineUser implements SignupOptional {
    constructor(myMap: Full) {
        super(myMap);
        this.biography = myMap.biography;
        this.course = myMap.course;
        this.society = myMap.society;
        this.areaOfStudy = myMap.areaOfStudy;
        this.interests = myMap.interests;
        this.questions = myMap.questions;
        this.onCampus = myMap.onCampus;
    }
    private _biography: string;
    private _course: string;
    private _society: string;
    private _areaOfStudy: AreaOfStudy;
    private _degree: Degree;
    private _societyCategory: SocietyCategory;
    private _interests: Interest[];
    private _questions: QuestionAndAnswer[];
    private _onCampus: boolean;

    public get biography(): string {
        return this._biography;
    }
    public set biography(value: string) {
        this._biography = value;
    }
    public get course(): string {
        return this._course;
    }
    public set course(value: string) {
        this._course = value;
    }
    public get society(): string {
        return this._society;
    }
    public set society(value: string) {
        this._society = value;
    }
    public get areaOfStudy(): AreaOfStudy {
        return this._areaOfStudy;
    }
    public set areaOfStudy(value: AreaOfStudy) {
        this._areaOfStudy = value;
    }
    public get degree(): Degree {
        return this._degree;
    }
    public set degree(value: Degree) {
        this._degree = value;
    }
    public get societyCategory(): SocietyCategory {
        return this._societyCategory;
    }
    public set societyCategory(value: SocietyCategory) {
        this._societyCategory = value;
    }
    public get interests(): Interest[] {
        return this._interests;
    }
    public set interests(value: Interest[]) {
        this._interests = value;
    }
    public get questions(): QuestionAndAnswer[] {
        return this._questions;
    }
    public set questions(value: QuestionAndAnswer[]) {
        this._questions = value;
    }
    public get onCampus(): boolean {
        return this._onCampus;
    }
    public set onCampus(value: boolean) {
        this._onCampus = value;
    }
}
