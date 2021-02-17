import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SignupoptionalPage } from './signupoptional.page';

describe('SignupoptionalPage', () => {
  let component: SignupoptionalPage;
  let fixture: ComponentFixture<SignupoptionalPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignupoptionalPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupoptionalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
