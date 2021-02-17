import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { TabMenuPage } from './tab-menu.page';

describe('TabMenuPage', () => {
  let component: TabMenuPage;
  let fixture: ComponentFixture<TabMenuPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TabMenuPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TabMenuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
