import { useEffect, useMemo, useRef, useState } from "react";
import type { Step } from "../model/types";
import { compileStep, PlaybackClock, sample } from "./engine";
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(mq.matches);
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, []);
  return reduced;
}
export function usePlayback(
  steps: Step[],
  raw: boolean,
  initialStepId?: string,
) {
  const plans = useMemo(
    () => steps.map((step) => compileStep(step, raw)),
    [steps, raw],
  );
  const previousPlans = useRef(plans);
  const initialIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === initialStepId),
  );
  const clock = useRef(new PlaybackClock());
  const index = useRef(initialIndex);
  const engaged = useRef(false);
  const [view, setView] = useState({
    index: initialIndex,
    time: 0,
    playing: false,
    engaged: false,
    speed: 1,
  });
  const reduced = useReducedMotion();
  const publish = () =>
    setView({
      index: index.current,
      time: clock.current.elapsed,
      playing: clock.current.playing,
      engaged: engaged.current,
      speed: clock.current.speed,
    });
  const pause = () => {
    clock.current.pause(performance.now());
    publish();
  };
  useEffect(() => {
    index.current = previousPlans.current === plans ? initialIndex : 0;
    previousPlans.current = plans;
    clock.current.reset(performance.now());
    engaged.current = false;
    publish();
  }, [plans]); // La sélection de lecture remplace la timeline entière.
  useEffect(() => {
    if (reduced) {
      clock.current.pause(performance.now());
      engaged.current = false;
      publish();
    }
  }, [reduced]);
  useEffect(() => {
    if (!view.playing || reduced || !plans.length) return;
    let frame = 0;
    const tick = (now: number) => {
      clock.current.tick(now);
      while (clock.current.elapsed >= plans[index.current].duration) {
        if (index.current === plans.length - 1) {
          clock.current.pause(now);
          clock.current.elapsed = plans[index.current].duration;
          publish();
          return;
        }
        clock.current.elapsed -= plans[index.current].duration;
        index.current++;
      }
      publish();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [view.playing, plans, reduced]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [plans]);
  function toggle() {
    if (reduced || !plans.length) return;
    const now = performance.now();
    if (clock.current.playing) {
      pause();
      return;
    }
    if (
      index.current === plans.length - 1 &&
      clock.current.elapsed >= plans[index.current].duration
    ) {
      index.current = 0;
      clock.current.reset(now);
    }
    if (!engaged.current) {
      clock.current.reset(now);
      engaged.current = true;
    }
    clock.current.resume(now);
    publish();
  }
  function select(next: number) {
    index.current = Math.max(0, Math.min(steps.length - 1, next));
    clock.current.reset(performance.now());
    engaged.current = false;
    publish();
  }
  function scrub(time: number) {
    clock.current.pause(performance.now());
    clock.current.seek(
      Math.min(plans[index.current].duration, Math.max(0, time)),
      performance.now(),
    );
    engaged.current = true;
    publish();
  }
  function speed(value: number) {
    clock.current.setSpeed(value, performance.now());
    publish();
  }
  const current = plans[view.index];
  return {
    ...view,
    reduced,
    plan: current,
    state: current
      ? view.engaged && !reduced
        ? sample(current, view.time)
        : current.step.afterState
      : undefined,
    toggle,
    pause,
    select,
    scrub,
    setSpeed: speed,
    restart: () => select(0),
  };
}
