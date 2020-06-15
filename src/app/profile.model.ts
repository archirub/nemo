interface Traits {
  skinTone: string;
  hairColor: string;
  height: string;
  gender: string;
}

export class Profile {
  constructor(
    public id: string,
    public firstName: string,
    public lastName: string,
    public email: string,
    public birthDate: Date,
    public mainPictureUrl: string,
    public traits: Traits = {
      skinTone: undefined,
      hairColor: undefined,
      height: undefined,
      gender: undefined,
    }
  ) {}

  age() {
    const currentTime = new Date();
    return Math.trunc(
      (currentTime.getTime() - this.birthDate.getTime()) /
        (1000 * 3600 * 24 * 365)
    );
  }
}
