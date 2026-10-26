"use client";

import { Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";
import { createElement, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Character } from "@/characters/Character";
import { reactionFor } from "@/characters/reactions";
import type { Expression } from "@/characters/types";
import { GemIcon, HeartIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { Modal } from "@/components/ui/Modal";
import { RichText } from "@/components/ui/RichText";
import { isGraded, type Exercise } from "@/content/registry";
import { getView } from "@/content/registry.client";
import { canCheck, currentExercise, lessonStats, progress, type LessonMode } from "@/engine/lesson";
import { useLessonStore } from "@/engine/store";
import type { CompletionSummary, LessonCompletionInput, RefillResult } from "@/engine/summary";
import { GAME } from "@/game/config";
import { useHotkeys } from "@/lib/keyboard";
import { cn } from "@/lib/cn";
import { hashString } from "@/lib/rng";
import { play } from "@/sound/sfx";
import { FeedbackFooter } from "./FeedbackFooter";
import { LessonTopBar } from "./LessonTopBar";
import { PromptHeader } from "./PromptHeader";
import { LessonResults } from "./LessonResults";

export interface LessonPlayerProps {
  packId: string;
  lessonId: string;
  title: string;
  mode: LessonMode;
  exercises: Exercise[];
  /** Current hearts, or null for unlimited. */
  hearts: number | null;
  gems: number;
  exitHref: string;
  /** Preview mode (admin): nothing is saved. */
  preview?: boolean;
  onComplete(input: LessonCompletionInput): Promise<CompletionSummary>;
  /** Called when the learner quits or fails, so lost hearts are saved. */
  onAbandon(input: { heartsLost: number }): Promise<void>;
  /** Buy a refill; heartsLost = hearts lost this lesson that the server doesn't know about yet. */
  onRefillHearts(input: { heartsLost: number }): Promise<RefillResult>;
}

export function LessonPlayer(props: LessonPlayerProps) {
  const { exercises, mode, hearts: initialHearts } = props;
  const router = useRouter();
  const lesson = useLessonStore((s) => s.lesson);
  const [quitOpen, setQuitOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [gems, setGems] = useState(props.gems);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [refilling, startRefill] = useTransition();
  const [refillError, setRefillError] = useState<string | null>(null);
  const completedRef = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const [scrolledUnder, setScrolledUnder] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_E2E === "1") {
      void import("@/engine/testHooks").then((m) => m.install());
    }
  }, []);

  // Start (or restart) only when the session itself changes. A server re-render
  // (dev hot reload, router.refresh, regenerated hearts) hands us new prop
  // objects with the same content, and must not throw away a lesson in progress.
  const sessionKey = `${props.lessonId}|${mode}|${exercises.map((e) => e.id).join(",")}`;
  const sessionRef = useRef({ exercises, mode, initialHearts });
  useEffect(() => {
    sessionRef.current = { exercises, mode, initialHearts };
  });
  useEffect(() => {
    const session = sessionRef.current;
    useLessonStore.getState().start(session.exercises, { mode: session.mode, hearts: session.initialHearts });
    completedRef.current = false;
    return () => useLessonStore.getState().reset();
  }, [sessionKey]);

  const exercise = lesson ? currentExercise(lesson) : null;
  const graded = exercise ? isGraded(exercise) : true;
  const status = lesson?.status ?? "answering";
  const seed = useMemo(
    () => (exercise && lesson ? hashString(`${exercise.id}:${lesson.position}`) : 0),
    [exercise, lesson],
  );

  // Sounds on result.
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === "answering" && graded) {
      if (status === "correct") play(lesson && lesson.combo > 0 && lesson.combo % 5 === 0 ? "combo" : "correct");
      if (status === "incorrect") play("wrong");
    }
    if (status === "complete" && prevStatus.current !== "complete") play("complete");
    if (status === "failed" && prevStatus.current !== "failed") play("fail");
    prevStatus.current = status;
  }, [status, graded, lesson]);

  // Save on completion.
  useEffect(() => {
    if (!lesson || lesson.status !== "complete" || completedRef.current) return;
    completedRef.current = true;
    const elapsed = Date.now() - useLessonStore.getState().startedAt;
    setDurationMs(elapsed);
    const input: LessonCompletionInput = {
      packId: props.packId,
      lessonId: props.lessonId,
      mode,
      stats: lessonStats(lesson),
      durationMs: elapsed,
    };
    props
      .onComplete(input)
      .then(setSummary)
      .catch(() => setSaveError("We couldn't save this lesson. Check your connection and try again."));
  }, [lesson, mode, props]);

  // Lift the footer with a shadow while exercise content continues below it,
  // so a tall exercise never looks like it ends at the footer's edge.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const measure = () => setScrolledUnder(main.scrollHeight - main.scrollTop - main.clientHeight > 4);
    measure();
    main.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(main);
    if (main.firstElementChild) resize.observe(main.firstElementChild);
    return () => {
      main.removeEventListener("scroll", measure);
      resize.disconnect();
    };
  }, [lesson?.position, status]);

  const onChange = useCallback((response: unknown) => useLessonStore.getState().respond(response), []);

  const doCheck = useCallback(() => {
    const s = useLessonStore.getState();
    if (!s.lesson || !canCheck(s.lesson)) return;
    const ex = currentExercise(s.lesson);
    s.check();
    setHintOpen(false);
    // Ungraded cards (info) go straight on.
    if (ex && !isGraded(ex)) useLessonStore.getState().advance();
  }, []);

  const onSubmit = useCallback(() => {
    // Self-grading exercises (e.g. match_pairs) finish on their own.
    requestAnimationFrame(doCheck);
  }, [doCheck]);

  const doContinue = useCallback(() => {
    useLessonStore.getState().advance();
  }, []);

  const doSkip = useCallback(() => {
    useLessonStore.getState().skip();
    setHintOpen(false);
  }, []);

  const quit = useCallback(async () => {
    const s = useLessonStore.getState().lesson;
    if (s && s.heartsLost > 0 && !props.preview) await props.onAbandon({ heartsLost: s.heartsLost });
    router.push(props.exitHref);
  }, [props, router]);

  const modalOpen = quitOpen || status === "failed";
  const failed = status === "failed";
  const keepLearningRef = useRef<HTMLButtonElement>(null);
  const refillRef = useRef<HTMLButtonElement>(null);
  const noThanksRef = useRef<HTMLButtonElement>(null);

  // The Modal focuses its panel when it opens; move focus on to the main action
  // (this effect runs after the child Modal's), so Enter/Space work right away.
  useEffect(() => {
    if (quitOpen) keepLearningRef.current?.focus();
  }, [quitOpen]);
  useEffect(() => {
    if (!failed) return;
    const refill = refillRef.current;
    (refill && !refill.disabled ? refill : noThanksRef.current)?.focus();
  }, [failed]);

  // While a dialog is open, keys must not reach the exercise behind it (digits
  // would pick answers, Backspace would remove tiles...). Stopping propagation
  // at the window's capture phase keeps default actions, so Enter/Space still
  // press the focused dialog button and Tab still moves focus.
  useEffect(() => {
    if (!modalOpen) return;
    const block = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
    };
    window.addEventListener("keydown", block, true);
    return () => window.removeEventListener("keydown", block, true);
  }, [modalOpen]);

  // Opening the hint (by click or H) records it for the engine.
  const toggleHint = () => {
    if (!hintOpen) useLessonStore.getState().hint();
    setHintOpen(!hintOpen);
  };

  useHotkeys(
    {
      Enter: () => {
        const s = useLessonStore.getState().lesson;
        if (!s) return;
        if (s.status === "answering") doCheck();
        else if (s.status === "correct" || s.status === "incorrect") doContinue();
      },
      Escape: () => setQuitOpen(true),
      h: () => {
        if (exercise?.hint && status === "answering") toggleHint();
      },
    },
    { enabled: !modalOpen && status !== "complete", allowInInputs: ["Enter", "Escape"] },
  );

  if (!lesson) return <div className="min-h-dvh bg-bg" />;

  if (lesson.status === "complete") {
    return (
      <LessonResults
        stats={lessonStats(lesson)}
        durationMs={durationMs}
        summary={summary}
        error={saveError}
        preview={props.preview}
        onRetrySave={() => {
          setSaveError(null);
          completedRef.current = false;
          useLessonStore.setState({ lesson: { ...lesson } });
        }}
        onDone={() => {
          router.push(props.exitHref);
          router.refresh();
        }}
      />
    );
  }

  const expression: Expression =
    status === "correct" ? "happy" : status === "incorrect" ? "sad" : lesson.combo >= 5 ? "celebrate" : "neutral";
  const answerStatus: "answering" | "correct" | "incorrect" =
    status === "failed" || status === "complete" ? "incorrect" : status;
  const failedCharacter = exercises.find((e) => e.characterId)?.characterId ?? "lumi";

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <LessonTopBar progress={progress(lesson)} hearts={lesson.hearts} combo={lesson.combo} onQuit={() => setQuitOpen(true)} />

      <main
        ref={mainRef}
        className="flex min-h-0 flex-1 justify-center overflow-y-auto px-8 py-8 [scrollbar-gutter:stable_both-edges] [@media(max-height:840px)]:py-5"
      >
        {exercise && (
          <div
            key={`${lesson.position}-${exercise.id}`}
            className="flex w-full max-w-[720px] animate-rise-in flex-col gap-7 [@media(max-height:840px)]:gap-5"
          >
            <div className={cn("flex justify-between gap-4", exercise.characterId ? "items-center" : "items-start")}>
              <PromptHeader exercise={exercise} expression={expression} />
              {exercise.hint && (
                // Stays in the layout after checking (just hidden) so the prompt doesn't reflow.
                <button
                  type="button"
                  onClick={toggleHint}
                  aria-expanded={hintOpen}
                  aria-keyshortcuts="H"
                  disabled={status !== "answering"}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-brand transition-colors duration-150 hover:bg-brand-soft",
                    exercise.characterId ? "mb-6" : "mt-1",
                    hintOpen && "bg-brand-soft",
                    status !== "answering" && "invisible",
                  )}
                >
                  <Lightbulb className="size-4" strokeWidth={2.5} /> Hint <Kbd className="h-5 min-w-5 text-[11px]">H</Kbd>
                </button>
              )}
            </div>
            {hintOpen && exercise.hint && status === "answering" && (
              <div
                role="note"
                className="-mt-2 flex animate-pop-in items-start gap-2.5 rounded-2xl border-2 border-dashed border-brand/40 bg-brand-soft px-4 py-3 text-[15px] font-semibold text-ink [transform-origin:top_right] [@media(max-height:840px)]:-mt-1"
              >
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2.5} aria-hidden />
                <RichText text={exercise.hint} />
              </div>
            )}
            {createElement(getView(exercise.type), {
              exercise,
              status: answerStatus,
              onChange,
              onSubmit,
              seed,
            })}
          </div>
        )}
      </main>

      {exercise && status !== "failed" && (
        <FeedbackFooter
          status={answerStatus}
          grade={lesson.lastGrade}
          explanation={exercise.explanation}
          canCheck={canCheck(lesson)}
          graded={graded}
          praiseSeed={seed}
          onCheck={doCheck}
          onSkip={doSkip}
          onContinue={doContinue}
          raised={scrolledUnder}
        />
      )}

      <Modal open={quitOpen} onClose={() => setQuitOpen(false)} label="Quit lesson?">
        <div className="flex flex-col items-center text-center">
          <Character id={failedCharacter} expression="sad" size={110} />
          <h2 className="mt-3 font-display text-2xl font-semibold">Wait, don&apos;t go!</h2>
          <p className="mt-2 text-ink-soft">You&apos;ll lose your progress in this lesson if you quit now.</p>
          <div className="mt-6 grid w-full gap-3">
            <Button ref={keepLearningRef} size="lg" block onClick={() => setQuitOpen(false)}>
              Keep learning
            </Button>
            <Button variant="ghost" size="lg" block className="text-wrong" onClick={quit}>
              End session
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={status === "failed"} onClose={quit} label="Out of hearts">
        <div className="flex flex-col items-center text-center">
          <Character id={failedCharacter} expression={reactionFor("failed", failedCharacter).expression} size={110} />
          <h2 className="mt-3 font-display text-2xl font-semibold">You ran out of hearts</h2>
          <p className="mt-2 text-ink-soft">Refill to keep going, or take a break — hearts come back over time.</p>
          <div className="mt-5 flex items-center gap-1">
            {Array.from({ length: GAME.hearts.max }, (_, i) => (
              <HeartIcon key={i} size={30} muted />
            ))}
          </div>
          <div className="mt-6 grid w-full gap-3">
            <Button
              ref={refillRef}
              variant="gem"
              size="lg"
              block
              disabled={gems < GAME.hearts.refillCost || refilling}
              onClick={() =>
                startRefill(async () => {
                  setRefillError(null);
                  try {
                    const heartsLost = useLessonStore.getState().lesson?.heartsLost ?? 0;
                    const result = await props.onRefillHearts({ heartsLost });
                    if (result.ok) {
                      setGems(result.gems);
                      useLessonStore.getState().refill(result.hearts);
                    } else {
                      setGems(result.gems);
                      setRefillError(result.error ?? "Couldn't refill your hearts. Try again.");
                    }
                  } catch {
                    setRefillError("Couldn't reach the server. Check your connection and try again.");
                  }
                })
              }
            >
              {refilling ? (
                "Refilling…"
              ) : (
                <>
                  Refill for
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-gem-dark">
                    <GemIcon size={18} /> {GAME.hearts.refillCost}
                  </span>
                </>
              )}
            </Button>
            {refillError && (
              <p role="alert" className="animate-rise-in text-sm font-bold text-wrong-ink">
                {refillError}
              </p>
            )}
            <Button ref={noThanksRef} variant="ghost" size="lg" block onClick={quit}>
              No thanks
            </Button>
            <p className="text-xs font-semibold text-muted">
              You have <GemIcon size={14} className="inline align-[-2px]" /> {gems}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
