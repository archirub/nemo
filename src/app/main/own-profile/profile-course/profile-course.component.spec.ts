import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { IonicModule } from "@ionic/angular";

import { ProfileCourseComponent } from "./profile-course.component";

describe("ProfileCourseComponent", () => {
  let component: ProfileCourseComponent;
  let fixture: ComponentFixture<ProfileCourseComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ProfileCourseComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileCourseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
