import { ElementRef } from "@angular/core";
import { Profile } from "@classes/profile.class";
import { AnimationController } from "@ionic/angular";
import { firstValueFrom, Observable, delay } from "rxjs";
// import * as anime from "animejs"

export const SwipeAnimation = (
  storeTasks$: (profile: Profile) => Observable<any>,
  profile: Profile,
  likeDiv: ElementRef<any>
) => {
  const appearAnimation = new AnimationController().create("appearAnimation");
  appearAnimation
    .addElement(likeDiv.nativeElement)
    .easing("cubic-bezier(0.5, 1, 0.89, 1)")
    .duration(1000)
    .beforeStyles({
      display: "flex",
    })
    .fromTo("opacity", "0", "1");

  const disappearAnimation = new AnimationController().create("disappearAnimation");

  disappearAnimation
    .addElement(likeDiv.nativeElement)
    .easing("cubic-bezier(0.5, 0, 0.75, 0)")
    .duration(1000)
    .fromTo("opacity", "1", "0")
    .afterStyles({
      display: "none",
    });

  const playAnimation = async () => {
    await appearAnimation.play();
    await firstValueFrom(storeTasks$(profile).pipe(delay(300)));
    await disappearAnimation.play();
  };

  return playAnimation;
};
