import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SignupauthPage } from './signupauth.page';

describe('SignupauthPage', () => {
  let component: SignupauthPage;
  let fixture: ComponentFixture<SignupauthPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignupauthPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupauthPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
