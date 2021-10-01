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

import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  from,
  interval,
  Observable,
  of,
  Subscription,
  timer,
} from "rxjs";
import { AppUser, Profile } from "@classes/index";
import { CurrentUserStore } from "@stores/index";
import { ProfileCardComponent } from "@components/index";
import { ProfileCourseComponent } from "./profile-course/profile-course.component";
import {
  AlertController,
  IonTextarea,
  LoadingController,
  ModalController,
} from "@ionic/angular";
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
  concatMap,
  distinctUntilChanged,
  first,
  map,
  switchMap,
  take,
  tap,
  withLatestFrom,
  delay,
  filter,
  share,
  debounceTime,
} from "rxjs/operators";
import {
  searchCriteriaOptions,
  editableProfileFields,
  MAX_PROFILE_QUESTIONS_COUNT,
  questionsOptions,
  assetsInterestsPath,
  Interests,
  MAX_PROFILE_PICTURES_COUNT,
} from "@interfaces/index";
import { isEqual, isEqualWith } from "lodash";
import Sortable, { Options as SortableOptions } from "sortablejs";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { Animation } from "@ionic/angular";

function nullAndEmptyStrEquiv(value1, value2) {
  if ((value1 == null || value1 === "") && (value2 == null || value2 === "")) {
    return true;
  }
}
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
  @ViewChild("fish", { read: ElementRef }) fishRef: ElementRef;

  @ViewChildren("answers") answers: QueryList<ProfileAnswerComponent>;

  @ViewChild("toggleDiv", { read: ElementRef }) toggleDiv: ElementRef;
  @ViewChild("profilePictures", { read: ElementRef }) profilePicturesRef: ElementRef;

  subs = new Subscription();

  private ownPicturesSub: Subscription;
  picsLoaded$: Observable<boolean>;

  private editingInProgress = new BehaviorSubject<boolean>(false);
  editingInProgress$ = this.editingInProgress.pipe(distinctUntilChanged());
  private editingAnimationLogicSub: Subscription;

  private viewIsReady$ = new BehaviorSubject<boolean>(false);
  get pageIsReady$() {
    return combineLatest([this.viewIsReady$, this.storeReadiness.ownProfile$]).pipe(
      map(([a, b]) => a && b),
      distinctUntilChanged()
    );
  }

  get emptyEditableFields() {
    return {
      biography: null,
      course: null,
      areaOfStudy: null,
      society: null,
      societyCategory: null,
      interests: [],
      questions: [],
    };
  }

  getUrlFromHTML(element: Element): string {
    return window
      .getComputedStyle(element)
      .backgroundImage.slice(4, -1)
      .replace(/"/g, "");
  }

  // these intermediate values (editableFields and profilePictures) are required
  // to allow the user to modify these fields without the backend being affected right away,
  // but only once he/she clicks confirm
  editableFields: editableProfileFields = this.emptyEditableFields;
  private profilePictures = new BehaviorSubject<string[]>([]); // only contains urls (no empty elements)
  profilePictures$ = this.profilePictures.asObservable();
  profilePicturesWithEmpty$ = this.profilePictures
    .asObservable()
    .pipe(
      map((pics) =>
        pics.concat(Array(MAX_PROFILE_PICTURES_COUNT - (pics?.length ?? 0)).fill(""))
      )
    ); // also contains empty fields at the end so that the # of elements is exactly MAX_PROFILE_PICTURES_COUNT

  profilePicturesFromStore$ = this.ownPicturesService.urls$;
  userFromStore$ = this.currentUserStore.user$;

  loadingAnimation: Animation;
  toggleDivEnterAnimation: Animation;
  toggleDivLeaveAnimation: Animation;

  interestIcons = assetsInterestsPath;
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
    private renderer: Renderer2,
    private alertCtrl: AlertController,
    private storeReadiness: StoreReadinessService
  ) {}

  intEnterAnimation;
  intLeaveAnimation;
  pPictures: string[];

  ngOnInit() {
    this.profilePicturesFromStore$
      .pipe(map((urls) => this.updateProfilePictures(urls)))
      .subscribe();
    this.userFromStore$.pipe(map((user) => this.updateEditableFields(user))).subscribe();
    // this.picsLoaded$ = this.ownPicturesService.isReady$.pipe(
    //   tap((allPicturesLoaded) => (allPicturesLoaded ? this.stopAnimation() : null))
    // );
    this.editingAnimationLogicSub = this.editingAnimationLogic().subscribe();
    this.readinessHandler();
  }

  ngAfterViewInit() {
    // assuming that if this.fish is undefined it is because
    // #fish isn't rendered as picsLoaded$ is already true
    if (this.fishRef) this.startLoadingAnimation();

    this.viewIsReady$.next(true);
  }

  readinessHandler(): void {
    this.subs.add(
      this.pageIsReady$
        .pipe(
          filter((isReady) => isReady),
          take(1),
          switchMap(() => this.stopLoadingAnimation()),
          tap(() => this.initPictureSortability())
        )
        .subscribe()
    );
  }

  startLoadingAnimation() {
    this.loadingAnimation = FishSwimAnimation(this.fishRef);
    this.loadingAnimation.play();
  }

  async stopLoadingAnimation() {
    return new Promise((resolve) => {
      this.loadingAnimation?.destroy();

      setTimeout(() => {
        // This is essentially a lifecycle hook for after the UI appears
        // this.toggleDivEnterAnimation = ToggleAppearAnimation(this.toggleDiv);
        this.profileCard.updatePager(0);

        //Build modal setup once UI has entered
        setTimeout(() => {
          this.intEnterAnimation = IntEnterAnimation(
            this.tabElementRef.tabsRef,
            this.profileContainer
          );
          this.intLeaveAnimation = IntLeaveAnimation(
            this.tabElementRef.tabsRef,
            this.profileContainer
          );
          resolve(null);
        }, 50);
      }, 100);
    });
  }

  deletePicture(index: number) {
    return this.profilePicturesWithEmpty$
      .pipe(
        first(),
        map((pics) => {
          pics.splice(index, 1);
          this.profilePictures.next(pics);
        }),
        map(() => this.editingTriggered())
      )
      .toPromise();
  }

  initPictureSortability() {
    const sortable = Sortable.create(this.profilePicturesRef.nativeElement, {
      onUpdate: (event) => {
        let newUrls = Array.from(event.target.children)
          .map((c) => this.getUrlFromHTML(c.children[1].children[0].children[0]))
          .filter((u) => !!u);

        this.profilePictures.next(newUrls);

        return this.editingTriggered();
      },
      draggable: ".draggable-elements",
      onMove: (event) => {
        return event.related.className.indexOf("not-draggable-elements") === -1;
      },
    });
  }

  async presentInterestsModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: InterestsModalComponent,
      componentProps: {
        interests: this.editableFields?.interests,
      },
      enterAnimation: this.intEnterAnimation,
      leaveAnimation: this.intLeaveAnimation,
    });
    modal.onWillDismiss().then(() => this.editingTriggered());

    return modal.present();
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

      this.editableFields[field] =
        typeof data[field] === "object"
          ? JSON.parse(JSON.stringify(data[field]))
          : data[field];
    });
  }

  userToEditableFields(user: AppUser): editableProfileFields {
    const fields = this.emptyEditableFields;

    Object.keys(fields).forEach((field) => {
      const fieldValue = user[field];
      if (fieldValue && typeof fieldValue === "object") {
        fields[field] = JSON.parse(JSON.stringify(fieldValue));
      } else {
        fields[field] = user[field];
      }
    });

    return fields;
  }

  updateProfilePictures(urls: string[]) {
    this.profilePictures.next(JSON.parse(JSON.stringify(urls)));
  }

  changePictureIndex(oldIndex: number, newIndex: number) {
    return this.profilePicturesWithEmpty$
      .pipe(
        first(),
        map((pics) => {
          this.array_move(pics, oldIndex, newIndex);
          this.profilePictures.next(pics.filter((p) => !!p));
          return pics;
        }),
        delay(400),
        concatMap(() => this.editingTriggered())
      )
      .toPromise();
  }

  array_move(arr: any[], old_index: number, new_index: number) {
    if (new_index >= arr.length) {
      var k = new_index - arr.length + 1;
      while (k--) {
        arr.push(undefined);
      }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
  }

  goToSettings() {
    return this.editingInProgress$
      .pipe(
        take(1),
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
  async toggleChange(option) {
    const editor = document.getElementById("editing");
    const profile = document.getElementById("profile");

    if (option == "edit") {
      this.renderer.setStyle(editor, "display", "flex");
      this.renderer.setStyle(profile, "display", "none");
    } else if (option == "view") {
      this.renderer.setStyle(editor, "display", "none");
      this.renderer.setStyle(profile, "display", "flex");
      let index = await this.profileCard.slides.getActiveIndex();
      this.profileCard.updatePager(index);
    }
  }

  async editingTriggered() {
    return this.userFromStore$
      .pipe(
        map((user) => this.userToEditableFields(user)),
        withLatestFrom(this.profilePicturesWithEmpty$, this.profilePicturesFromStore$),
        map(
          ([fieldsInStore, pictures, picturesFromStore]) =>
            !isEqualWith(fieldsInStore, this.editableFields, nullAndEmptyStrEquiv) ||
            !isEqual(
              pictures.filter((pic) => !!pic),
              picturesFromStore
            )
        ),
        map((isDifferent) =>
          isDifferent
            ? this.editingInProgress.next(true)
            : this.editingInProgress.next(false)
        )
      )

      .toPromise();
  }

  async cancelProfileEdit(): Promise<void> {
    await this.userFromStore$
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

  async presentInvalidPartsMessage() {
    const invalidParts = this.invalidParts;

    const societyMessage =
      "Your society and its category must be either both filled or empty.";
    const courseMessage =
      "Your course and its category must be either both filled or empty.";
    const questionsMessage =
      "Make sure all of your questions contain both a selection and an answer.";
    const message = `${invalidParts.includes("society") ? societyMessage : ""}
    ${invalidParts.includes("course") ? courseMessage : ""}
    ${invalidParts.includes("questions") ? questionsMessage : ""}
    `;

    const alert = await this.alertCtrl.create({
      header: `Looks like ${invalidParts.join(", ")} ${
        invalidParts.length === 1 ? "is" : "are"
      } invalid.`,
      message: `${message}`,
      buttons: ["Okay"],
    });

    return alert.present();
  }

  async confirmProfileEdit(): Promise<void> {
    if (this.invalidParts.length > 0) return this.presentInvalidPartsMessage();

    const loading = await this.loadingCtrl.create({ backdropDismiss: false });
    await loading.present();

    await forkJoin([
      this.currentUserStore.updateFieldsOnDatabase(this.editableFields),
      this.ownPicturesService.updatePictures(
        await this.profilePicturesWithEmpty$.pipe(first()).toPromise()
      ),
    ])
      .pipe(
        map(() => this.editingInProgress.next(false)),
        switchMap(() => loading.dismiss())
      )
      .toPromise();

    this.profileCard.buildInterestSlides(this.profileCard.profile);
  }

  get invalidParts(): ("society" | "questions" | "course")[] {
    const isFilled = (v) => typeof v === "string" && v.length > 0;
    const isEmpty = (v) => !v;
    const bothNullOrFilled = (v1, v2) =>
      (isFilled(v1) && isFilled(v2)) || (isEmpty(v1) && isEmpty(v2));

    const invalidParts: ("society" | "questions" | "course")[] = [];
    if (
      !bothNullOrFilled(this.editableFields.society, this.editableFields.societyCategory)
    )
      invalidParts.push("society");
    if (!bothNullOrFilled(this.editableFields.course, this.editableFields.areaOfStudy))
      invalidParts.push("course");
    let questionsIsValid = true;
    this.editableFields.questions.forEach((QandA) =>
      !bothNullOrFilled(QandA.answer, QandA.question) ? (questionsIsValid = false) : null
    );
    if (!questionsIsValid) invalidParts.push("questions");

    return invalidParts;
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
    return this.profilePicturesWithEmpty$
      .pipe(
        first(),
        map((profilePictures) => {
          profilePictures[$event.index] = $event.photoUrl;
          this.profilePictures.next(profilePictures);
        }),
        map(() => {
          this.editingInProgress.next(true);
          this.detector.detectChanges();
        })
      )
      .toPromise();
  }

  ngOnDestroy() {
    this.ownPicturesSub?.unsubscribe();
    this.editingAnimationLogicSub?.unsubscribe();
  }
}
