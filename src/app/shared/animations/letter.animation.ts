import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
import _ from "lodash";
// import * as anime from "animejs"

export const FlyingLetterAnimation = (
  letter: ElementRef,
  ) => {
  const startXPosition = -15;
  const endXPosition = 105;

  // Moving off-screen
  const letterAnimation = new AnimationController().create("letterAnimation");
  letterAnimation
    .addElement(letter.nativeElement)
    .easing("ease-out")
    .duration(1000)
    .fromTo(
      "transform",
      `translateX(${startXPosition}vw)`,
      `translateX(${endXPosition}vw)`
    )
    .beforeStyles({
      display: "block",
    });

  return letterAnimation;
};
