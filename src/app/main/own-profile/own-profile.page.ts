import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  AfterViewInit,
  Renderer2,
} from "@angular/core";

import { BehaviorSubject, forkJoin, from, Observable, of, Subscription } from "rxjs";
import { AppUser, Profile } from "@classes/index";
import { CurrentUserStore } from "@stores/index";
import { AddPhotoComponent, ProfileCardComponent } from "@components/index";
import { ProfileCourseComponent } from "./profile-course/profile-course.component";
import { IonTextarea, LoadingController, ModalController } from "@ionic/angular";
import { Router } from "@angular/router";
import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";
import { ProfileAnswerComponent } from "./profile-answer/profile-answer.component";
import {
  FishSwimAnimation,
  ToggleAppearAnimation,
  IntEnterAnimation,
  IntLeaveAnimation,
} from "@animations/index";

import { TabElementRefService } from "../tab-menu/tab-element-ref.service";
import { InterestsModalComponent } from "./interests-modal/interests-modal.component";

import {
  distinctUntilChanged,
  map,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import {
  searchCriteriaOptions,
  editableProfileFields,
  MAX_PROFILE_QUESTIONS_COUNT,
  questionsOptions,
  assetsInterestsPath,
  Interests,
  QuestionAndAnswer,
} from "@interfaces/index";
import { CdkDragDrop, transferArrayItem } from "@angular/cdk/drag-drop";

@Component({
  selector: "app-own-profile",
  templateUrl: "./own-profile.page.html",
  styleUrls: ["./own-profile.page.scss"],
})
export class OwnProfilePage implements OnInit, AfterViewInit {
  // @ViewChild(AddPhotoComponent) photo: AddPhotoComponent;
  @ViewChild("bioInput") bio: IonTextarea;
  @ViewChild("bioClose", { read: ElementRef }) bioClose: ElementRef;
  @ViewChild("depts") depts: ProfileCourseComponent;
  @ViewChild("socs") socs: ProfileCourseComponent;

  @ViewChild("profileCard") profileCard: ProfileCardComponent;
  @ViewChild("profileContainer", { read: ElementRef }) profileContainer: ElementRef;
  @ViewChild("fish", { read: ElementRef }) fish: ElementRef;

  @ViewChildren("answers") answers: QueryList<ProfileAnswerComponent>;

  @ViewChild("toggleDiv", { read: ElementRef }) toggleDiv: ElementRef;

  appUser$: Observable<AppUser>;

  private ownPicturesSub: Subscription;
  picsLoaded$: Observable<boolean>;

  private editingInProgress = new BehaviorSubject<boolean>(false);
  editingInProgress$ = this.editingInProgress.pipe(distinctUntilChanged());
  private editingAnimationLogicSub: Subscription;

  // these intermediate values (editableFields and profilePictures) are required
  // to allow the user to modify these fields without the backend being affected right away,
  // but only once he/she clicks confirm
  editableFields: editableProfileFields = {
    biography: null,
    course: null,
    areaOfStudy: null,
    society: null,
    societyCategory: null,
    interests: [],
    questions: [],
  };
  profilePictures: string[] = [];

  fishSwimAnimation;
  toggleDivEnterAnimation;
  toggleDivLeaveAnimation;

  interestIcons = assetsInterestsPath; //Interest icons
  societyCategoryOptions = searchCriteriaOptions.societyCategory;
  areaOfStudyOptions = searchCriteriaOptions.areaOfStudy;

  constructor(
    private currentUserStore: CurrentUserStore,
    private router: Router,
    private ownPicturesService: OwnPicturesStore,
    private detector: ChangeDetectorRef,
    private tabElementRef: TabElementRefService,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private renderer: Renderer2
  ) {
    this.appUser$ = this.currentUserStore.user$;
  }

  interestModal: HTMLIonModalElement;
  intEnterAnimation;
  intLeaveAnimation;

  ngOnInit() {
    this.editingInProgress$.subscribe((a) => console.log("editing in progress", a));

    this.ownPicturesService.urls$
      .pipe(map((urls) => this.updateProfilePictures(urls)))
      .subscribe();
    this.currentUserStore.user$
      .pipe(map((user) => this.updateEditableFields(user)))
      .subscribe();

    this.picsLoaded$ = this.ownPicturesService.allPicturesLoaded$.pipe(
      tap((allPicturesLoaded) => (allPicturesLoaded ? this.stopAnimation() : null))
    );

    this.editingAnimationLogicSub = this.editingAnimationLogic().subscribe();
  }

  ngAfterViewInit() {
    // assuming that if this.fish is undefined it is because
    // #fish isn't rendered as picsLoaded$ is already true
    if (this.fish) {
      this.fishSwimAnimation = FishSwimAnimation(this.fish);
      this.fishSwimAnimation.play();
    }
  }

  stopAnimation() {
    this.fishSwimAnimation?.destroy();

    setTimeout(() => {
      // This is essentially a lifecycle hook for after the UI appears
      this.toggleDivEnterAnimation = ToggleAppearAnimation(this.toggleDiv);
      this.profileCard.updatePager(0);
    }, 50);

    //Build modal setup once UI has entered
    setTimeout(() => {
      this.intEnterAnimation = IntEnterAnimation(
        this.tabElementRef.tabRef,
        this.profileContainer
      );
      this.intLeaveAnimation = IntLeaveAnimation(
        this.tabElementRef.tabRef,
        this.profileContainer
      );

      this.buildIntModal();
    }, 100);
  }

  async buildIntModal(): Promise<void> {
    this.modalCtrl
      .create({
        component: InterestsModalComponent,
        componentProps: {
          interests: this.editableFields?.interests,
        },
        enterAnimation: this.intEnterAnimation,
        leaveAnimation: this.intLeaveAnimation,
      })
      .then((m) => {
        this.interestModal = m;
        this.onInterestsModalDismiss(this.interestModal);
      });
  }

  async presentIntModal(): Promise<void> {
    if (!this.interestModal) {
      await this.buildIntModal();
    }

    return this.interestModal.present();
  }

  // Used to preload modal as soon as the previous SC window was dismissed
  onInterestsModalDismiss(modal: HTMLIonModalElement) {
    modal.onDidDismiss().then(() => {
      this.editingTriggered();

      this.interestModal = undefined;
    });
  }

  /**
   * Get interest icon path by parsing interest name
   **/
  getPicturePath(interestName: Interests): string {
    const formattedName = interestName.replace(/\s/g, "").toLowerCase();
    return "/assets/interests/" + formattedName + ".svg";
  }

  get questionsNotPicked(): string[] {
    const questionsPicked = this.editableFields?.questions.map((QandA) => QandA.question);
    return questionsOptions.filter((option) => !questionsPicked.includes(option));
  }

  updateEditableFields(data: AppUser | Profile | editableProfileFields): void {
    Object.keys(this.editableFields).forEach((field) => {
      if (!data?.[field]) return;

      if (typeof data[field] === "object") {
        // for reference of user's objects and editableFields' objects to be different
        this.editableFields[field] = JSON.parse(JSON.stringify(data[field]));
      } else {
        this.editableFields[field] = data[field];
      }
    });
  }

  updateProfilePictures(urls: string[]) {
    this.profilePictures = JSON.parse(JSON.stringify(urls));
  }

  dragAndDropPhotos(event: CdkDragDrop<string[]>) {
    transferArrayItem(
      this.profilePictures,
      event.previousContainer.data,
      event.previousIndex,
      event.currentIndex
    );

    let newPhotoArray = event.previousContainer.data;
  }

  goToSettings() {
    return this.editingInProgress$
      .pipe(
        switchMap((inProgress) =>
          !inProgress ? this.router.navigateByUrl("/main/settings") : of("")
        )
      )
      .toPromise();
  }

  displayExit(section) {
    if (section === "bio" && this.bio.value !== "") {
      this.renderer.setStyle(this.bioClose.nativeElement, "display", "block");
    } else if (this.bio.value === "") {
      this.renderer.setStyle(this.bioClose.nativeElement, "display", "none");
    }
  }

  clearInput(section) {
    if (section === "bio") {
      this.bio.value = "";
      this.renderer.setStyle(this.bioClose.nativeElement, "display", "none");
      //this.profile.biography = "";
    }
  }

  /* Nemo toggle selection function */
  toggleChange(option) {
    const editor = document.getElementById("editing");
    const profile = document.getElementById("profile");

    if (option == "edit") {
      this.renderer.setStyle(editor, "display", "flex");
      this.renderer.setStyle(profile, "display", "none");
    } else if (option == "view") {
      this.renderer.setStyle(editor, "display", "none");
      this.renderer.setStyle(profile, "display", "flex");
    }
  }

  editingTriggered() {
    this.editingInProgress.next(true);
  }

  async cancelProfileEdit(): Promise<void> {
    await this.currentUserStore.user$
      .pipe(
        withLatestFrom(this.ownPicturesService.urls$),
        take(1),
        map(([user, urls]) => {
          this.updateEditableFields(user);
          this.updateProfilePictures(urls);
        }),
        map(() => this.editingInProgress.next(false))
      )
      .toPromise();

    this.displayExit("bio");
  }

  async confirmProfileEdit(): Promise<void> {
    const loading = await this.loadingCtrl.create({ backdropDismiss: false });
    await loading.present();

    await forkJoin([
      this.currentUserStore.updateFieldsOnDatabase(this.editableFields),
      this.ownPicturesService.updatePictures(this.profilePictures),
    ])
      .pipe(
        map(() => this.editingInProgress.next(false)),
        switchMap(() => loading.dismiss())
      )
      .toPromise();

    this.profileCard.buildInterestSlides(this.profileCard.profile);
  }

  async actOnProfileEditing($event: "cancel" | "save") {
    if ($event === "cancel") return this.cancelProfileEdit();
    if ($event === "save") return this.confirmProfileEdit();
  }

  /**
   * Triggered by profile-answer change
   * If receives an array with 'delete' as first entry, deletes question
   * Either way triggers editing
   **/
  questionsEdit(emitted: any) {
    if (emitted[0] === "delete") {
      //Event signifies delete question
      let loc = this.editableFields.questions.indexOf(emitted);
      this.editableFields.questions.splice(loc, 1); //Remove from question array
    }

    this.editingTriggered();
  }

  addQuestion() {
    if (this.reachedMaxQuestionsCount) return;

    setTimeout(() => {
      this.toggleDivEnterAnimation = ToggleAppearAnimation(this.toggleDiv);
      this.toggleDivEnterAnimation.play();
    }, 250);

    this.editableFields.questions.push({ question: null, answer: null });
    this.editingTriggered();
  }

  editingAnimationLogic(): Observable<any> {
    return this.editingInProgress$.pipe(
      switchMap((inProgress) =>
        this.toggleDiv ? ToggleAppearAnimation(this.toggleDiv).play() : of()
      )
    );
  }

  get reachedMaxQuestionsCount(): boolean {
    return this.questionsCount >= MAX_PROFILE_QUESTIONS_COUNT;
  }

  get questionsCount(): number {
    return this.editableFields?.questions?.length ?? 0;
  }

  onPicturePicked($event: { photoUrl: string; index: number }) {
    this.profilePictures[$event.index] = $event.photoUrl;
    this.editingInProgress.next(true);
    this.detector.detectChanges();
  }

  ngOnDestroy() {
    this.ownPicturesSub?.unsubscribe();
    this.editingAnimationLogicSub?.unsubscribe();
  }
}
