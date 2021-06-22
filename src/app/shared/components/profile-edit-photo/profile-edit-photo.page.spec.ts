import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { IonicModule } from "@ionic/angular";

import { ProfileEditPhotoPage } from "./profile-edit-photo.page";

describe("ProfileEditPhotoPage", () => {
  let component: ProfileEditPhotoPage;
  let fixture: ComponentFixture<ProfileEditPhotoPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ProfileEditPhotoPage],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEditPhotoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
