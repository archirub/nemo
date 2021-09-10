import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { IonicModule } from "@ionic/angular";

import { ChatBoardComponent } from "./chat-board.component";

describe("ChatBoardComponent", () => {
  let component: ChatBoardComponent;
  let fixture: ComponentFixture<ChatBoardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ChatBoardComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
