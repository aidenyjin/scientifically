import type { CharacterId, Expression, Reaction, ReactionEvent } from "./types";

/*
 * Built-in UI copy: short, in-character lines for every engine/game event.
 * (Course dialogue comes from the AI; these never teach content.)
 * Each entry is [expression, line]; keep lines to 8 words or fewer.
 */
type Pool = readonly (readonly [Expression, string])[];
type Pools = Record<ReactionEvent, Pool>;

const lumi: Pools = {
  correct: [
    ["happy", "Yes! That's the solution."],
    ["happy", "Spot on, lab partner!"],
    ["happy", "Nailed it. Science approves!"],
    ["celebrate", "Correct! My gills are tingling!"],
  ],
  incorrect: [
    ["thinking", "Not quite. Every mistake is data."],
    ["thinking", "Close! Let's re-run that experiment."],
    ["surprised", "Oops! Even scientists spill things."],
    ["sad", "Aww, so close!"],
  ],
  combo5: [
    ["celebrate", "Five in a row!"],
    ["celebrate", "Five straight! Chain reaction!"],
    ["happy", "That's a hot streak, lab partner!"],
    ["celebrate", "Five for five. I'm so proud!"],
  ],
  combo10: [
    ["celebrate", "Ten in a row — unstoppable!"],
    ["surprised", "Ten?! You're off the charts!"],
    ["celebrate", "Ten straight. Nobel committee, take note!"],
    ["celebrate", "Double digits! I can't contain myself!"],
  ],
  lessonComplete: [
    ["celebrate", "Lesson complete!"],
    ["happy", "That's a wrap. Brilliant work!"],
    ["celebrate", "Another lesson in the bag!"],
    ["celebrate", "You did it! Gills up!"],
  ],
  perfect: [
    ["celebrate", "Flawless!"],
    ["celebrate", "Perfect score. Textbook results!"],
    ["surprised", "Zero mistakes?! Peer review: stunning."],
    ["celebrate", "Not a single error bar!"],
  ],
  failed: [
    ["sad", "Out of hearts. Let's regroup."],
    ["sad", "Rough run. Every scientist has those."],
    ["sad", "Let's rest and try again soon."],
    ["thinking", "Hearts empty, but your brain's full!"],
  ],
  streakExtended: [
    ["celebrate", "Streak extended!"],
    ["happy", "Another day, another discovery!"],
    ["celebrate", "Your streak grows like a crystal!"],
    ["happy", "Day after day. That's real science!"],
  ],
  streakLost: [
    ["sad", "Streak reset. We'll rebuild it together."],
    ["thinking", "Fresh start, fresh data!"],
    ["sad", "Every streak starts at day one."],
    ["happy", "No streak? No problem. Let's begin!"],
  ],
  dailyGoal: [
    ["celebrate", "Daily goal reached!"],
    ["celebrate", "Goal hit! What a reaction!"],
    ["happy", "Daily dose of science: complete!"],
    ["celebrate", "Goal smashed. Take a bow!"],
  ],
  levelUp: [
    ["celebrate", "Level up! You've evolved!"],
    ["celebrate", "New level unlocked. Onward, scientist!"],
    ["surprised", "Look at you, levelling up!"],
    ["happy", "Level up! Your lab coat fits better."],
  ],
  leaguePromoted: [
    ["celebrate", "Promoted! The next league awaits!"],
    ["celebrate", "Promotion! Pack your lab coat!"],
    ["surprised", "Up a league? Remarkable!"],
    ["happy", "Moving up. They won't know what hit them!"],
  ],
  idle: [
    ["neutral", "Ready when you are, lab partner."],
    ["happy", "Let's discover something today."],
    ["thinking", "Hmm, what shall we explore?"],
    ["sleepy", "Science never sleeps... mostly."],
  ],
};

const nova: Pools = {
  correct: [
    ["happy", "Stellar answer!"],
    ["celebrate", "Correct! Shining like a supernova!"],
    ["happy", "Right on, cosmically speaking."],
    ["happy", "That answer's out of this world!"],
  ],
  incorrect: [
    ["thinking", "Hmm, slightly off orbit."],
    ["sad", "Not quite. Even stars wobble."],
    ["surprised", "Missed by a few light-years!"],
    ["thinking", "Let's recalibrate the telescope."],
  ],
  combo5: [
    ["celebrate", "Five in a row. A constellation!"],
    ["celebrate", "Five stars, perfectly aligned!"],
    ["happy", "You're reaching escape velocity!"],
    ["happy", "Five! Like a tiny galaxy forming."],
  ],
  combo10: [
    ["surprised", "Ten in a row?! Astronomical!"],
    ["celebrate", "Ten! That's a whole star cluster!"],
    ["celebrate", "Ten straight. You've reached orbit!"],
    ["celebrate", "Ten in a row. Pure starlight!"],
  ],
  lessonComplete: [
    ["happy", "Lesson complete. The universe approves."],
    ["celebrate", "Mission accomplished, star sailor!"],
    ["happy", "Another lesson, beautifully orbited."],
    ["celebrate", "Touchdown! Lesson complete!"],
  ],
  perfect: [
    ["celebrate", "Perfect! Not one stray photon."],
    ["surprised", "Flawless, like a total eclipse."],
    ["celebrate", "A perfect run. Simply cosmic."],
    ["celebrate", "Zero errors across the whole universe!"],
  ],
  failed: [
    ["sad", "Out of fuel. Let's refuel and relaunch."],
    ["sad", "Even rockets need a second launch."],
    ["sad", "Lost signal. We'll reconnect soon."],
    ["thinking", "Let's drift a while, then retry."],
  ],
  streakExtended: [
    ["celebrate", "Streak extended. Steady as an orbit!"],
    ["happy", "Another trip around the sun!"],
    ["celebrate", "Your streak burns like a star."],
    ["happy", "Day after day, like clockwork planets."],
  ],
  streakLost: [
    ["sad", "Streak ended. But stars are reborn."],
    ["thinking", "A new orbit begins today."],
    ["sad", "Every galaxy started small."],
    ["happy", "Let's light a brand-new star."],
  ],
  dailyGoal: [
    ["celebrate", "Daily goal reached! Over the moon!"],
    ["celebrate", "Goal achieved. Stellar effort!"],
    ["happy", "Today's goal: safely in orbit."],
    ["surprised", "Goal reached? I'm starstruck!"],
  ],
  levelUp: [
    ["celebrate", "Level up! You're going supernova!"],
    ["celebrate", "New level. Higher orbit unlocked!"],
    ["surprised", "Look at you, ascending!"],
    ["happy", "Level up! The stars noticed."],
  ],
  leaguePromoted: [
    ["celebrate", "Promoted to a whole new galaxy!"],
    ["celebrate", "Up a league! Lightspeed ahead!"],
    ["surprised", "New league, new constellations to meet!"],
    ["happy", "Promotion! Your star is rising."],
  ],
  idle: [
    ["thinking", "Stars outnumber every grain of sand."],
    ["neutral", "Space is big. Let's explore it."],
    ["happy", "Ready for liftoff?"],
    ["sleepy", "Just counting stars... a billion..."],
  ],
};

const pip: Pools = {
  correct: [
    ["celebrate", "YES! Correct! Wow!"],
    ["happy", "Right!! My mitochondria are buzzing!"],
    ["celebrate", "Correct! I could divide with joy!"],
    ["happy", "Woo! That's right!"],
  ],
  incorrect: [
    ["surprised", "Oh no! Not quite!"],
    ["thinking", "Hmm! Let's try another pathway!"],
    ["sad", "Aww! So close!"],
    ["surprised", "Oops! Cells mutate too, it's fine!"],
  ],
  combo5: [
    ["celebrate", "Five in a row!! Amazing!!"],
    ["celebrate", "Five! I'm wobbling with excitement!"],
    ["happy", "Five straight! You're multiplying!"],
    ["surprised", "Wow wow wow! Five!"],
  ],
  combo10: [
    ["surprised", "TEN?! I'm going to split!"],
    ["celebrate", "Ten in a row! Incredible!!"],
    ["celebrate", "Ten! You're a whole organism now!"],
    ["celebrate", "TEN! Best day of my life cycle!"],
  ],
  lessonComplete: [
    ["celebrate", "Done! That was SO fun!"],
    ["celebrate", "Lesson complete! Again? Again!"],
    ["celebrate", "You did it! Wheee!"],
    ["happy", "Finished! My nucleus is glowing!"],
  ],
  perfect: [
    ["celebrate", "PERFECT! Not one mistake!!"],
    ["surprised", "Flawless! I'm literally vibrating!"],
    ["celebrate", "Perfect score! Best. Lesson. Ever!"],
    ["celebrate", "No errors! Genetic perfection!"],
  ],
  failed: [
    ["sad", "Oh no, out of hearts!"],
    ["sad", "Aww! Let's regrow and retry!"],
    ["sad", "Rest time! Then round two!"],
    ["happy", "That's okay! Cells bounce back!"],
  ],
  streakExtended: [
    ["celebrate", "Streak extended! Yay yay yay!"],
    ["happy", "Another day! You're growing!"],
    ["celebrate", "The streak's alive! Like me!"],
    ["happy", "Daily practice! So healthy!"],
  ],
  streakLost: [
    ["sad", "Oh no! The streak's gone!"],
    ["happy", "Fresh start! Like a brand-new cell!"],
    ["sad", "We'll grow it back! Promise!"],
    ["surprised", "Day one again! Exciting, actually!"],
  ],
  dailyGoal: [
    ["celebrate", "Daily goal! You did it!!"],
    ["celebrate", "Goal reached! Celebration time!"],
    ["surprised", "Wow! Goal complete already!"],
    ["happy", "Goal done! I'm so proud!"],
  ],
  levelUp: [
    ["celebrate", "LEVEL UP! You evolved!"],
    ["celebrate", "New level! Wheee!"],
    ["surprised", "Level up?! Amazing!!"],
    ["happy", "You're growing so fast!"],
  ],
  leaguePromoted: [
    ["celebrate", "Promoted!! Next league, here we come!"],
    ["celebrate", "Up a league! Woo!"],
    ["surprised", "A new league?! So exciting!"],
    ["happy", "Promotion! You're thriving!"],
  ],
  idle: [
    ["happy", "Let's learn something! Anything!"],
    ["thinking", "You're made of trillions of cells!"],
    ["surprised", "Ooh! What's next?"],
    ["neutral", "Just wobbling. Ready when you are!"],
  ],
};

const bond: Pools = {
  correct: [
    ["neutral", "Correct. As expected."],
    ["happy", "Accurate. I'm quietly impressed."],
    ["happy", "That checks out."],
    ["neutral", "Right. Balanced and precise."],
  ],
  incorrect: [
    ["neutral", "Incorrect. Let's not dwell."],
    ["thinking", "Not quite. Recheck the reagents."],
    ["sad", "That reaction didn't balance."],
    ["surprised", "Hm. An unexpected product."],
  ],
  combo5: [
    ["happy", "Five in a row. Statistically notable."],
    ["celebrate", "Five. I'm almost excited."],
    ["happy", "A stable chain is forming."],
    ["neutral", "Five correct. Very efficient."],
  ],
  combo10: [
    ["surprised", "Ten. That is genuinely impressive."],
    ["celebrate", "Ten in a row. I'm reacting."],
    ["celebrate", "Ten. Don't tell anyone I cheered."],
    ["happy", "Ten straight. A polymer of success."],
  ],
  lessonComplete: [
    ["happy", "Lesson complete. Results recorded."],
    ["happy", "Done. Efficiently, I might add."],
    ["celebrate", "Reaction complete. Yield: excellent."],
    ["neutral", "That's that. Well done."],
  ],
  perfect: [
    ["celebrate", "Perfect. One hundred percent yield."],
    ["surprised", "No errors. I'm... moved."],
    ["celebrate", "Flawless. Textbook stoichiometry."],
    ["happy", "Perfect score. Noted, with approval."],
  ],
  failed: [
    ["sad", "Out of hearts. Reaction halted."],
    ["sad", "Well. That didn't go to plan."],
    ["sad", "Hearts depleted. Refill or regroup."],
    ["thinking", "Next time, we titrate more carefully."],
  ],
  streakExtended: [
    ["happy", "Streak extended. Consistency suits you."],
    ["neutral", "Another day. Reliably done."],
    ["celebrate", "The streak holds. Strong bonds."],
    ["happy", "Daily habit confirmed."],
  ],
  streakLost: [
    ["sad", "Streak broken. Bonds can re-form."],
    ["neutral", "Back to zero. Clean slate."],
    ["thinking", "A setback. Statistically temporary."],
    ["sad", "Pity. Let's rebuild it."],
  ],
  dailyGoal: [
    ["happy", "Daily goal met. Satisfactory."],
    ["happy", "Goal reached. I approve."],
    ["celebrate", "Target achieved, precisely."],
    ["celebrate", "Goal done. Mild applause."],
  ],
  levelUp: [
    ["celebrate", "Level up. Higher energy state."],
    ["happy", "You've levelled up. Noted."],
    ["surprised", "Excited state reached. Literally."],
    ["neutral", "New level. Try to stay grounded."],
  ],
  leaguePromoted: [
    ["happy", "Promoted. Reasonably exciting."],
    ["surprised", "New league. An element of surprise."],
    ["celebrate", "You've moved up. Well bonded."],
    ["neutral", "Promotion confirmed. Proceed."],
  ],
  idle: [
    ["neutral", "I'm stable. Are you?"],
    ["neutral", "Ready to react."],
    ["thinking", "Thinking about electrons. As usual."],
    ["sleepy", "Low energy state. Wake me."],
  ],
};

const volt: Pools = {
  correct: [
    ["celebrate", "Zap! Correct!"],
    ["happy", "Boom, nailed it. Next!"],
    ["happy", "Right! Fast and sharp!"],
    ["celebrate", "Yes! Full charge!"],
  ],
  incorrect: [
    ["surprised", "Short circuit! Try again!"],
    ["thinking", "Nope. Quick reset!"],
    ["sad", "Bzzt. Not that one."],
    ["surprised", "Wrong wire! Shake it off!"],
  ],
  combo5: [
    ["celebrate", "Five! You're conducting!"],
    ["celebrate", "Five in a row. High voltage!"],
    ["happy", "Charging up! Five straight!"],
    ["celebrate", "Five! Keep the current flowing!"],
  ],
  combo10: [
    ["celebrate", "TEN! Maximum power!"],
    ["surprised", "Ten in a row! Lightning fast!"],
    ["celebrate", "Ten! You're overclocked!"],
    ["celebrate", "Ten straight! Off the meter!"],
  ],
  lessonComplete: [
    ["celebrate", "Done! That was quick!"],
    ["celebrate", "Lesson complete. Circuit closed!"],
    ["happy", "Finished! Next one? Next one!"],
    ["celebrate", "Zap! All done!"],
  ],
  perfect: [
    ["celebrate", "Perfect! Zero resistance!"],
    ["celebrate", "Flawless! Pure energy!"],
    ["surprised", "No mistakes?! Electrifying!"],
    ["celebrate", "Perfect run! Full voltage!"],
  ],
  failed: [
    ["sad", "Power's out! Recharge time."],
    ["sad", "Battery drained. Quick recharge?"],
    ["sad", "Fizzled out. Reboot soon!"],
    ["thinking", "Blackout! We'll spark back!"],
  ],
  streakExtended: [
    ["celebrate", "Streak extended! Still charged!"],
    ["happy", "Another day! Keep the current going!"],
    ["celebrate", "Streak's live! Zzzap!"],
    ["happy", "Daily spark: delivered!"],
  ],
  streakLost: [
    ["sad", "Streak's down. Reboot!"],
    ["thinking", "Circuit broke. Reconnect today!"],
    ["surprised", "Zero again? Quick restart!"],
    ["sad", "Lost the spark. Reignite it!"],
  ],
  dailyGoal: [
    ["celebrate", "Goal hit! Lightning speed!"],
    ["happy", "Daily goal: done and dusted!"],
    ["celebrate", "Fully charged for today!"],
    ["happy", "Goal smashed! What's next?"],
  ],
  levelUp: [
    ["celebrate", "Level up! Power surge!"],
    ["celebrate", "New level! Amping up!"],
    ["surprised", "Whoa, level up! Fast!"],
    ["happy", "Level up! More watts!"],
  ],
  leaguePromoted: [
    ["celebrate", "Promoted! Higher voltage league!"],
    ["celebrate", "Up a league! Zoom!"],
    ["surprised", "New league?! Go, go, go!"],
    ["happy", "Promotion! Shortest path to the top!"],
  ],
  idle: [
    ["happy", "Come on, come on. Let's go!"],
    ["neutral", "Buzzing. Ready. Waiting. Buzzing."],
    ["thinking", "Shortest path? Start now!"],
    ["sleepy", "Low battery... zzz."],
  ],
};

const terra: Pools = {
  correct: [
    ["happy", "Correct. Solid as bedrock."],
    ["happy", "That's right. Nicely done."],
    ["happy", "Right answer. Rock steady."],
    ["celebrate", "Well found, like a fossil."],
  ],
  incorrect: [
    ["thinking", "Not quite. No rush."],
    ["thinking", "Hmm. Let's dig a little deeper."],
    ["sad", "That's alright. Canyons took ages too."],
    ["neutral", "Close. Erosion takes time as well."],
  ],
  combo5: [
    ["happy", "Five in a row. Steady layers."],
    ["happy", "Five. You're building strata."],
    ["celebrate", "A fine run. Five."],
    ["celebrate", "Five correct. Mountains rise slowly."],
  ],
  combo10: [
    ["surprised", "Ten. That's tectonic."],
    ["celebrate", "Ten in a row. Monumental."],
    ["celebrate", "Ten. A whole mountain range."],
    ["surprised", "Ten! Even I'm moved."],
  ],
  lessonComplete: [
    ["happy", "Lesson complete. Well weathered."],
    ["happy", "Done. One more layer laid."],
    ["celebrate", "Complete. Steady progress, always."],
    ["happy", "Finished. Take a calm breath."],
  ],
  perfect: [
    ["celebrate", "Perfect. Polished like a gem."],
    ["surprised", "Flawless. A rare mineral indeed."],
    ["celebrate", "No mistakes. Crystal clear."],
    ["happy", "Perfect. Patience pays off."],
  ],
  failed: [
    ["sad", "Out of hearts. Rest a while."],
    ["sad", "Even mountains erode. Try again."],
    ["sad", "Let's pause. The rocks will wait."],
    ["thinking", "A rough patch. It'll smooth out."],
  ],
  streakExtended: [
    ["happy", "Streak extended. Layer upon layer."],
    ["happy", "Another day. Slow and steady."],
    ["celebrate", "Your streak grows like a stalagmite."],
    ["celebrate", "Consistent as the tides."],
  ],
  streakLost: [
    ["sad", "Streak ended. Rocks reform."],
    ["neutral", "No worry. Time is on our side."],
    ["thinking", "A new layer begins today."],
    ["sad", "Start again. Gently."],
  ],
  dailyGoal: [
    ["happy", "Daily goal reached. Well earned."],
    ["happy", "Goal met. Time for a calm cuppa."],
    ["celebrate", "Today's goal: settled."],
    ["celebrate", "Goal reached. Solid work."],
  ],
  levelUp: [
    ["celebrate", "Level up. Uplift in progress."],
    ["happy", "A new level. Steady climb."],
    ["celebrate", "Level up. The mountains approve."],
    ["surprised", "Oh! Level up. Lovely."],
  ],
  leaguePromoted: [
    ["celebrate", "Promoted. A higher plateau."],
    ["happy", "Up a league. Earned slowly, kept long."],
    ["happy", "New league. Onward, gently."],
    ["surprised", "Promotion! Even I'm rumbling."],
  ],
  idle: [
    ["neutral", "Take your time. I'm a rock."],
    ["sleepy", "Just here, weathering nicely."],
    ["happy", "Ready when you are."],
    ["thinking", "Pondering the last ice age."],
  ],
};

const POOLS: Record<CharacterId, Pools> = { lumi, nova, pip, bond, volt, terra };

/** Every line a character has for an event (for previews and tests). */
export function reactionPool(event: ReactionEvent, characterId: CharacterId): Reaction[] {
  return POOLS[characterId][event].map(([expression, line]) => ({ expression, line }));
}

/** Pick a reaction for an event. Same `seed` → same line; seeds step through the pool. */
export function reactionFor(event: ReactionEvent, characterId: CharacterId, seed = 0): Reaction {
  const pool = POOLS[characterId][event];
  const n = pool.length;
  const s = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const [expression, line] = pool[((s % n) + n) % n];
  return { expression, line };
}
