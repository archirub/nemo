import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const SwipeAnimation = (
  likeDiv: ElementRef<any>, 
) => {
  const appearAnimation = new AnimationController().create("appearAnimation");
  appearAnimation
    .addElement(likeDiv.nativeElement)
    .easing("ease-in-out")
    .duration(3000)
    .beforeStyles({
      display: "flex",
    })
    .keyframes([
      { offset: 0, opacity: '0' }, //from 0 to 1
      { offset: 0.1, opacity: '1' },
      { offset: 0.8, opacity: '1' }, //from 1 to 0
      { offset: 1, opacity: '0' }
    ])
    .afterStyles({
      display: "none",
    });

    return appearAnimation;
};