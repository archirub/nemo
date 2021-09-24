import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const SwipeYesAnimation = (card: ElementRef<any>, screenWidth: number) => {
  const startXPosition = card.nativeElement.getBoundingClientRect().x;
  const endXPosition = startXPosition + screenWidth + 100;
  const halfDistance = (endXPosition - startXPosition) / 2;
  const ROTATION = 15;
  const halfRotation = ROTATION / 2;

  // Moving off-screen
  const moveAnimation = new AnimationController().create("moveAnimation");
  moveAnimation
    .addElement(card.nativeElement)
    .easing("ease-out")
    .duration(750)
    .keyframes([
      { offset: 0, transform: `translateX(${startXPosition}px) rotate(0deg)` },
      {
        offset: 0.65,
        transform: `translateX(${halfDistance}px) rotate(${halfRotation}deg)`,
      },
      { offset: 1, transform: `translateX(${endXPosition}px) rotate(${ROTATION}deg)` },
    ]);

  return moveAnimation;
};

export const SwipeNoAnimation = (card: ElementRef<any>, screenWidth: number) => {
  const startXPosition = card.nativeElement.getBoundingClientRect().x;
  const endXPosition = startXPosition - screenWidth - 100;
  const halfDistance = (endXPosition + startXPosition) / 2;
  const ROTATION = -15;
  const halfRotation = ROTATION / 2;

  // Moving off-screen
  const moveAnimation = new AnimationController().create("moveAnimation");
  moveAnimation
    .addElement(card.nativeElement)
    .easing("ease-out")
    .duration(750)
    .keyframes([
      { offset: 0, transform: `translateX(${startXPosition}px) rotate(0deg)` },
      {
        offset: 0.65,
        transform: `translateX(${halfDistance}px) rotate(${halfRotation}deg)`,
      },
      { offset: 1, transform: `translateX(${endXPosition}px) rotate(${ROTATION}deg)` },
    ]);

  return moveAnimation;
};
