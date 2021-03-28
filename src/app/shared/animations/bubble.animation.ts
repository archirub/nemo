import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const YesBubbleAnimation = (
  bubble: ElementRef,
  X: number,
  Y: number,
) => {
  const startXPosition = X - 50;
  const startYPosition = Y - 45;
  const endXPosition = X - 70;
  const endYPosition = Y - 80;
  const ROTATION = -15;

  // Moving off-screen
  const moveAnimation = new AnimationController().create('moveAnimation')
  moveAnimation
    .addElement(bubble.nativeElement)
    .easing("ease-out")
    .duration(400)
    .beforeStyles({
        "display": "block"
    })
    .fromTo(
      "transform",
      `translate(${startXPosition}px, ${startYPosition}px) rotate(0deg)`,
      `translate(${endXPosition}px, ${endYPosition}px) rotate(${ROTATION}deg)`
    )
    .afterStyles({
        "display": "none",
    });

  return moveAnimation;
};

export const NoBubbleAnimation = (
    bubble: ElementRef,
    X: number,
    Y: number,
  ) => {
    const startXPosition = X - 50;
    const startYPosition = Y - 45;
    const endXPosition = X - 30;
    const endYPosition = Y - 80;
    const ROTATION = 15;
  
    // Moving off-screen
    const moveAnimation = new AnimationController().create('moveAnimation')
    moveAnimation
      .addElement(bubble.nativeElement)
      .easing("ease-out")
      .duration(400)
      .beforeStyles({
          "display": "block"
      })
      .fromTo(
        "transform",
        `translate(${startXPosition}px, ${startYPosition}px) rotate(0deg)`,
        `translate(${endXPosition}px, ${endYPosition}px) rotate(${ROTATION}deg)`
      )
      .afterStyles({
          "display": "none",
      });
  
    return moveAnimation;
  };