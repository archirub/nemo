import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SignupToAppPage } from './signup-to-app.page';

describe('SignupToAppPage', () => {
  let component: SignupToAppPage;
  let fixture: ComponentFixture<SignupToAppPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignupToAppPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupToAppPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
