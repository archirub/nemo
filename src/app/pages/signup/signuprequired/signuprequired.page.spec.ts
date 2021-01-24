import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SignuprequiredPage } from './signuprequired.page';

describe('SignuprequiredPage', () => {
  let component: SignuprequiredPage;
  let fixture: ComponentFixture<SignuprequiredPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignuprequiredPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(SignuprequiredPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
