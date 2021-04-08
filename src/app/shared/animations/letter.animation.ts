import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const FlyingLetterAnimation = (
  letter: ElementRef,
) => {
  const startXPosition = -15;
  //const startYPosition = 20;
  const endXPosition = 105;
  //const endYPosition = 20;
  //const ROTATION = -15;

  // Moving off-screen
  const moveAnimation = new AnimationController().create('moveAnimation')
  moveAnimation
    .addElement(letter.nativeElement)
    .easing("ease-out")
    .duration(1000)
    .fromTo(
      "transform",
      `translateX(${startXPosition}vw)`,
      `translateX(${endXPosition}vw)`
    )
    .beforeStyles({
        display: 'block',
    })

  return moveAnimation;
};