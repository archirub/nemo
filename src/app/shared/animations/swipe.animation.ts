import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const SwipeYesAnimation = (
  card: ElementRef<any>,
  screenWidth: number,
) => {
  const startXPosition = card.nativeElement.getBoundingClientRect().x;
  const endXPosition = startXPosition + screenWidth + 100;
  const ROTATION = 15;

  // Moving off-screen
  const moveAnimation = new AnimationController().create('moveAnimation')
  moveAnimation
    .addElement(card.nativeElement)
    .easing("ease-out")
    .duration(400)
    .fromTo(
      "transform",
      `translateX(${startXPosition}px) rotate(0deg)`,
      `translateX(${endXPosition}px) rotate(${ROTATION}deg)`
    );

  return moveAnimation;
};

export const SwipeNoAnimation = (
  card: ElementRef<any>,
  screenWidth: number,
) => {
  const startXPosition = card.nativeElement.getBoundingClientRect().x;
  const endXPosition = startXPosition - screenWidth - 100;
  const ROTATION = -15;

  // Moving off-screen
  const moveAnimation = new AnimationController().create('moveAnimation')
  moveAnimation
    .addElement(card.nativeElement)
    .easing("ease-out")
    .duration(400)
    .fromTo(
      "transform",
      `translateX(${startXPosition}px) rotate(0deg)`,
      `translateX(${endXPosition}px) rotate(${ROTATION}deg)`
    );

  return moveAnimation;
};