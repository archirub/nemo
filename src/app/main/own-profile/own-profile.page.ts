import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  Renderer2,
} from "@angular/core";
import {
  AlertController,
  IonTextarea,
  LoadingController,
  ModalController,
  Animation,
} from "@ionic/angular";
import { Router } from "@angular/router";

import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  forkJoin,
  lastValueFrom,
  Observable,
  of,
  ReplaySubject,
  Subscription,
} from "rxjs";
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
  startWith,
  share,
} from "rxjs/operators";
import { isEqual, isEqualWith } from "lodash";
import Sortable, { Options as SortableOptions } from "sortablejs";

import { ProfileCardComponent } from "@components/index";
import { InterestsModalComponent } from "./interests-modal/interests-modal.component";

import { CurrentUserStore } from "@stores/index";
import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { TabElementRefService } from "../tab-menu/tab-element-ref.service";

import { AppUser, Profile } from "@classes/index";
import {
  FishSwimAnimation,
  ToggleAppearAnimation,
  IntEnterAnimation,
  IntLeaveAnimation,
} from "@animations/index";
import {
  searchCriteriaOptions,
  editableProfileFields,
  MAX_PROFILE_QUESTIONS_COUNT,
  questionsOptions,
  assetsInterestsPath,
  Interests,
  MAX_PROFILE_PICTURES_COUNT,
  QuestionAndAnswer,
} from "@interfaces/index";

@Component({
  selector: "app-own-profile",
  templateUrl: "./own-profile.page.html",
  styleUrls: ["./own-profile.page.scss"],
})
export class OwnProfilePage implements OnInit, AfterViewInit {
  interestIcons = assetsInterestsPath;
  societyCategoryOptions = searchCriteriaOptions.societyCategory;
  areaOfStudyOptions = searchCriteriaOptions.areaOfStudy;
  loadingAnimation: Animation;
  toggleDivEnterAnimation: Animation;
  toggleDivLeaveAnimation: Animation;
  sortableHolder: Sortable;
  pageView: string; //Whether on view or edit

  // These intermediate variables (editableFields and profilePictures) are required
  // to allow the user to modify these fields without the backend being affected right away,
  // but only once they click confirm
  editableFields: editableProfileFields = this.emptyEditableFields;

  subs = new Subscription();

  //TUTORIAL SETTING
  ownProfileTutorial = true;

  @ViewChild("bioInput") bio: IonTextarea;
  @ViewChild("bioClose", { read: ElementRef }) bioClose: ElementRef;
  @ViewChild("profileCard") profileCard: ProfileCardComponent;
  @ViewChild("profileContainer", { read: ElementRef }) profileContainer: ElementRef;
  @ViewChild("fish", { read: ElementRef }) fishRef: ElementRef;
  @ViewChild("toggleDiv", { read: ElementRef }) toggleDiv: ElementRef;

  private profilePicturesRef$ = new ReplaySubject<ElementRef>(1);
  @ViewChild("profilePictures", { read: ElementRef }) set profilePicturesRefSetter(
    ref: ElementRef
  ) {
    if (ref) this.profilePicturesRef$.next(ref);
  }

  private editingInProgress = new BehaviorSubject<boolean>(false);

  private viewIsReady$ = new BehaviorSubject<boolean>(false);
  private profilePictures = new BehaviorSubject<string[]>([]); // only contains urls (no empty elements)

  pageIsReady$: Observable<boolean>;
  onPageReadyHandler$: Observable<any>;
  editingInProgress$ = this.editingInProgress.asObservable().pipe(distinctUntilChanged());
  profilePictures$ = this.profilePictures.asObservable();
  userFromStore$ = this.currentUserStore.user$; // used in template

  profilePicturesWithEmpty$ = this.profilePictures
    .asObservable()
    .pipe(
      map((pics) =>
        pics.concat(Array(MAX_PROFILE_PICTURES_COUNT - (pics?.length ?? 0)).fill(""))
      )
    ); // # of elements is exactly MAX_PROFILE_PICTURES_COUNT

  fillUserFromStoreHandler$ = this.userFromStore$.pipe(
    map((user) => this.updateEditableFields(user))
  );

  fillPicturesFromStoreHandler$ = this.ownPicturesService.urls$.pipe(
    map((urls) => this.updateProfilePictures(urls))
  );

  dataFillingHandler$ = combineLatest([
    this.fillUserFromStoreHandler$,
    this.fillPicturesFromStoreHandler$,
  ]).pipe(
    startWith(false),
    map(() => true)
  );

  editingAnimationHandler$ = this.editingInProgress$.pipe(
    switchMap((inProgress) =>
      this.toggleDiv ? ToggleAppearAnimation(this.toggleDiv).play() : of()
    )
  );

  // this systems allows that, after each modification of the profilePictures array,
  // The current Sortable object is destroyed a new one is instanciated for that new array
  // Doing so completely removed the bugs present
  pictureDragginHandler$ = this.profilePictures$.pipe(
    switchMap(() => this.profilePicturesRef$.pipe(first())),
    tap((pPicturesRef) => this.resetPictureDragging(pPicturesRef)),
    share()
  );

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

  get questionsNotPicked(): string[] {
    const questionsPicked = this.editableFields?.questions.map((QandA) => QandA.question);
    return questionsOptions.filter((option) => !questionsPicked.includes(option));
  }

  get reachedMaxQuestionsCount(): boolean {
    const questionsCount = this.editableFields?.questions?.length ?? 0;
    return questionsCount >= MAX_PROFILE_QUESTIONS_COUNT;
  }

  getPageIsReady() {
    return combineLatest([
      this.viewIsReady$,
      this.dataFillingHandler$,
      this.storeReadiness.ownProfile$,
    ]).pipe(
      map(([a, b, c]) => !!a && !!b && !!c),
      distinctUntilChanged(),
      tap((a) => console.log("page is ready", a))
    );
  }

  getOnPageReadyHandler() {
    return this.pageIsReady$.pipe(
      tap((a) => console.log("isReady a", a)),
      filter((isReady) => isReady),
      first(),
      tap(() => this.stopLoadingAnimation()),
      tap(() => this.subs.add(this.pictureDragginHandler$.subscribe()))
    );
  }

  constructor(
    private router: Router,
    private renderer: Renderer2,
    private detector: ChangeDetectorRef,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,

    private currentUserStore: CurrentUserStore,
    private ownPicturesService: OwnPicturesStore,

    private tabElementRef: TabElementRefService,
    private storeReadiness: StoreReadinessService
  ) {}

  ngOnInit() {
    this.subs.add(this.dataFillingHandler$.subscribe());
  }

  ngAfterViewInit() {
    this.pageIsReady$ = this.getPageIsReady(); // this format is needed because the ViewChild "profileCard" only gets defined after view init
    this.onPageReadyHandler$ = this.getOnPageReadyHandler(); // same here (this one depends on pageIsReady$ so needs to be defined after it is defined)
    this.subs.add(this.onPageReadyHandler$.subscribe());

    this.subs.add(this.editingAnimationHandler$.subscribe());

    // assuming that if this.fish is undefined it is because
    // #fish isn't rendered as picsLoaded$ is already true
    if (this.fishRef) this.startLoadingAnimation();

    this.viewIsReady$.next(true);
  }

  async actOnProfileEditing($event: "cancel" | "save") {
    if ($event === "cancel") return this.cancelProfileEdit();
    if ($event === "save") return this.confirmProfileEdit();
  }

  startLoadingAnimation() {
    this.loadingAnimation = FishSwimAnimation(this.fishRef);
    this.loadingAnimation.play();
  }

  stopLoadingAnimation() {
    this.loadingAnimation?.destroy();
  }

  // deletes the picture at the given index
  deletePicture(index: number): Promise<void> {
    return lastValueFrom(
      this.profilePicturesWithEmpty$.pipe(
        first(),
        map((pics) => {
          pics.splice(index, 1);
          this.profilePictures.next(pics);
        }),
        switchMap(() => this.editingTriggered())
      )
    );
  }

  // Initialises / reinitialises the logic that makes the pictures sortable by dragging
  resetPictureDragging(profilePicturesRef: ElementRef) {
    this.sortableHolder?.destroy();
    this.sortableHolder = Sortable.create(profilePicturesRef.nativeElement, {
      onUpdate: (event) => {
        let newUrls = Array.from(event.target.children)
          .map((c) => {
            return getUrlFromHTML(c?.children[1]?.children[0]?.children[0]);
          })
          .filter((u) => !!u);

        this.profilePictures.next(newUrls);

        return this.editingTriggered();
      },
      draggable: ".draggable-elements",

      onMove: (event) => {
        // return false;
        if (event.related.className.indexOf("not-draggable-elements") > -1) {
          return false;
        }
      },
    });
  }

  async presentInterestsModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: InterestsModalComponent,
      componentProps: {
        interests: this.editableFields?.interests,
      },
      enterAnimation: IntEnterAnimation(
        this.tabElementRef.tabsRef,
        this.profileContainer
      ),
      leaveAnimation: IntLeaveAnimation(
        this.tabElementRef.tabsRef,
        this.profileContainer
      ),
    });
    modal.onWillDismiss().then(() => this.editingTriggered());

    return modal.present();
  }

  //Get interest icon path by parsing interest name (used in template)
  getPicturePath(interestName: Interests): string {
    const formattedName = interestName.replace(/\s/g, "").toLowerCase();
    return "/assets/interests/" + formattedName + ".svg";
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

  // takes a User object and returns an editableProfileFields object with the User object's values
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

  // linked in template to the "onPhotoPicked" emitor from the "add-photo" component
  onPicturePicked($event: { photoUrl: string; index: number }) {
    return firstValueFrom(
      this.profilePicturesWithEmpty$.pipe(
        map((profilePictures) => {
          profilePictures[$event.index] = $event.photoUrl;
          this.profilePictures.next(profilePictures);
        }),
        map(() => {
          this.editingInProgress.next(true);
          this.detector.detectChanges();
        })
      )
    );
  }

  // updates the profile pictures observable which dictates what is shown in the template
  updateProfilePictures(urls: string[]) {
    this.profilePictures.next(JSON.parse(JSON.stringify(urls)));
  }

  // this serves to change the position of a given picture in the picture array
  // by inserting it at a specific location in the array (thereby shifting the position of
  // other pictures in the process)
  changePictureIndex(oldIndex: number, newIndex: number) {
    return lastValueFrom(
      this.profilePicturesWithEmpty$.pipe(
        first(),
        map((pics) => {
          changeElementPosition(pics, oldIndex, newIndex);
          this.profilePictures.next(pics.filter((p) => !!p));
          return pics;
        }),
        delay(400),
        concatMap(() => this.editingTriggered())
      )
    );
  }

  // allows to move to settings only if editing is not in progress
  goToSettings() {
    return lastValueFrom(
      this.editingInProgress$.pipe(
        first(),
        switchMap((inProgress) =>
          !inProgress ? this.router.navigateByUrl("/main/settings") : of("")
        )
      )
    );
  }

  // to show or not the close button of the biography
  displayBioDelete() {
    if (this.bio.value !== "") {
      this.renderer.setStyle(this.bioClose.nativeElement, "display", "block");
    } else {
      this.renderer.setStyle(this.bioClose.nativeElement, "display", "none");
    }
  }

  // to clear the input of the biography
  clearBio() {
    this.bio.value = "";
    this.renderer.setStyle(this.bioClose.nativeElement, "display", "none");
  }

  // to make apperance changes when the option of the toggle is changed between edit and view
  async toggleChange(option) {
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

  // watches whether there is a difference between the info the currentUserStore holds
  // and what is shown in the template. Marks editingInProgress as true or false accordingly
  async editingTriggered() {
    return lastValueFrom(
      this.userFromStore$.pipe(
        map((user) => this.userToEditableFields(user)),
        withLatestFrom(this.profilePicturesWithEmpty$, this.ownPicturesService.urls$),
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
    );
  }

  // used to cancel the editing of the profile by filling the template with the infom from
  // currentUserStore and ownPicturesService
  async cancelProfileEdit(): Promise<void> {
    await lastValueFrom(
      this.userFromStore$.pipe(
        withLatestFrom(this.ownPicturesService.urls$),
        take(1),
        map(([user, urls]) => {
          this.updateEditableFields(user);
          this.updateProfilePictures(urls);
        }),
        map(() => this.editingInProgress.next(false))
      )
    );

    this.displayBioDelete();
  }

  // checks whether any of the parts of the editable fields are invalid.
  // if it is the case, then display a message showing which they are
  async presentInvalidPartsMessage(invalidParts: ("society" | "questions" | "course")[]) {
    const societyMessage =
      "Your society and its category must be either both filled or empty.";
    const courseMessage =
      "Your course and its category must be either both filled or empty.";
    const questionsMessage =
      "Make sure all of your questions contain both a selection and an answer.";

    const message = `
    ${invalidParts.includes("society") ? societyMessage : ""}
    ${invalidParts.includes("course") ? courseMessage : ""}
    ${invalidParts.includes("questions") ? questionsMessage : ""}
    `;

    const header = `
    Looks like ${invalidParts.join(", ")} 
    ${invalidParts.length === 1 ? "is" : "are"} invalid.
    `;

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ["Okay"],
    });

    return alert.present();
  }

  // used to confirm the editing of the profile. It first checks if there are
  // any invalid parts. If there are then it display the invalidPartsMessage
  // otherwise, it shows a loader, then update the fields in the database, updates the pictures
  // and then turns off editing in progress
  async confirmProfileEdit(): Promise<void> {
    const invalidParts = this.getInvalidParts();

    if (invalidParts.length > 0) return this.presentInvalidPartsMessage(invalidParts);

    const loading = await this.loadingCtrl.create({ backdropDismiss: false });
    await loading.present();

    await lastValueFrom(
      forkJoin([
        this.currentUserStore.updateFieldsOnDatabase(this.editableFields),
        this.ownPicturesService.updatePictures(
          await firstValueFrom(this.profilePicturesWithEmpty$)
        ),
      ]).pipe(
        map(() => this.editingInProgress.next(false)),
        switchMap(() => loading.dismiss())
      )
    );

    this.profileCard.buildInterestSlides(this.profileCard.profile);
  }

  // gets the invalid parts of the editable fields
  getInvalidParts(): ("society" | "questions" | "course")[] {
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

  //TUTORIAL EXIT
  exitOwnProfileTutorial() {
    this.ownProfileTutorial = false;
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

  // to add a question
  async addQuestion() {
    if (this.reachedMaxQuestionsCount) return;

    await ToggleAppearAnimation(this.toggleDiv).play();

    this.editableFields.questions.push({ question: null, answer: null });

    await this.editingTriggered();
  }

  // for trackBy of ngFor on questions in template
  trackQuestion(index: number, question: QuestionAndAnswer) {
    return question.question + question.answer;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}

// efficient way to take an item of an array and insert it at a specific other location in the array
function changeElementPosition(arr: any[], old_index: number, new_index: number) {
  if (new_index >= arr.length) {
    var k = new_index - arr.length + 1;
    while (k--) {
      arr.push(undefined);
    }
  }
  arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
}

function getUrlFromHTML(element: Element): string | null {
  return element
    ? window.getComputedStyle(element).backgroundImage.slice(4, -1).replace(/"/g, "")
    : null;
}

// for comparator function in Lodash's isEqual function in "editingTriggered"
function nullAndEmptyStrEquiv(value1, value2) {
  if ((value1 == null || value1 === "") && (value2 == null || value2 === "")) {
    return true;
  }
}
