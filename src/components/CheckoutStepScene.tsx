import type { ReactNode } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';

export type CheckoutStepDirection = 1 | -1;

export default function CheckoutStepScene({ step, direction, onEntered, children }: {
  step: number;
  direction: CheckoutStepDirection;
  onEntered: () => void;
  children: ReactNode;
}) {
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  const distance = reduceMotion ? 0 : 24;
  const variants: Variants = {
    enter: (travel: CheckoutStepDirection) => ({ x: distance * travel, opacity: 0 }),
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: reduceMotion ? .26 : .4, ease: [.22, 1, .36, 1] },
    },
    exit: (travel: CheckoutStepDirection) => ({
      x: distance * -travel,
      opacity: 0,
      transition: { duration: reduceMotion ? .12 : .18, ease: [.4, 0, 1, 1] },
    }),
  };

  return (
    <motion.section
      className="checkout-step-scene"
      data-checkout-step={step}
      data-motion-mode={reduceMotion ? 'reduced' : 'full'}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="visible"
      exit="exit"
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
      onAnimationComplete={definition => {
        if (definition === 'visible' && isPresent) onEntered();
      }}
    >
      {children}
    </motion.section>
  );
}
