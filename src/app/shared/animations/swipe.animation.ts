import { ElementRef } from "@angular/core";
import { Profile } from "@classes/profile.class";
import { AnimationController } from "@ionic/angular";
import { firstValueFrom, Observable, delay } from "rxjs";
import {
  SCButtonHideAnimation,
  SCButtonUnhideAnimation,
} from "./hide-search-criteria.animation";

export const SwipeAnimation = (
  storeTasks$: (profile: Profile) => Observable<any>,
  profile: Profile,
  likeDiv: ElementRef<any>,
  searchCriteriaButtonRef: ElementRef<any>
) => {
  const appearEasing = "cubic-bezier(0.5, 1, 0.89, 1)";
  const appearDuration = 400;

  const disappearEasing = "cubic-bezier(0.5, 0, 0.75, 0)";
  const disappearDuration = 600;

  const appearAnimation = new AnimationController()
    .create("appearAnimation")
    .addElement(likeDiv.nativeElement)
    .easing(appearEasing)
    .duration(appearDuration)
    .beforeStyles({
      display: "flex",
    })
    .fromTo("opacity", "0", "1")
    .addAnimation(
      SCButtonHideAnimation(searchCriteriaButtonRef, appearEasing, appearDuration)
    );

  const disappearAnimation = new AnimationController().create("disappearAnimation");

  disappearAnimation
    .addElement(likeDiv.nativeElement)
    .easing(disappearEasing)
    .duration(disappearDuration)
    .fromTo("opacity", "1", "0")
    .afterStyles({
      display: "none",
    })
    .addAnimation(
      SCButtonUnhideAnimation(searchCriteriaButtonRef, disappearEasing, disappearDuration)
    );

  const playAnimation = async () => {
    await appearAnimation.play();
    await firstValueFrom(storeTasks$(profile).pipe(delay(800)));
    await disappearAnimation.play();
  };

  return playAnimation;
};
