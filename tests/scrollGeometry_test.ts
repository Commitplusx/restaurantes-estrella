import { assertAlmostEquals, assertEquals } from 'jsr:@std/assert';
import { cinematicTravel, mediaTravelBudget, mediaViewportProgress } from '../src/lib/scrollGeometry.ts';

Deno.test('photographs share section scroll but have independent viewport depth', () => {
  const section = { height: 4000, viewport: 800 };
  const upper = { top: 500, width: 320, height: 200 };
  const lower = { ...upper, top: 1500 };
  // The upper image is centered in the screen while the lower has not entered.
  assertAlmostEquals(mediaViewportProgress(1000 / 4800, section, upper), .5);
  assertEquals(mediaViewportProgress(1000 / 4800, section, lower), 0);
  // A card gets the same pose at the same screen position in a much longer menu.
  assertAlmostEquals(mediaViewportProgress(1000 / 16800, { ...section, height: 16000 }, upper), .5);
});
Deno.test('invalid and detached layouts return a neutral pose; valid travel clamps at edges', () => {
  const section={height:1000,viewport:700}, media={top:0,width:112,height:112};
  assertEquals(mediaViewportProgress(0,section,media),0);
  assertEquals(mediaViewportProgress(1,section,media),1);
  assertEquals(mediaViewportProgress(NaN,section,media),.5);
  assertEquals(mediaViewportProgress(.5,{height:0,viewport:700},media),.5);
  assertEquals(mediaViewportProgress(.5,section,{...media,height:0}),.5);
});
Deno.test('phone and desktop photos reserve space for both scroll and pointer movement', () => {
  for(const size of [{width:88,height:100},{width:112,height:112},{width:420,height:210}]) {
    const budget=mediaTravelBudget({...size,top:0},18,4);
    assertEquals(budget.insetY >= budget.travel+budget.pointer,true);
    assertEquals(budget.insetX >= budget.pointer,true);
    assertEquals(size.width - budget.insetX*2 > 0,true);
    assertEquals(size.height - budget.insetY*2 > 0,true);
    assertEquals(budget.travel<=18 && budget.pointer<=4,true);
  }
  assertEquals(mediaTravelBudget({top:0,width:0,height:0},18,4).travel,0);
  assertEquals(mediaTravelBudget({top:0,width:1,height:1},18,4).insetY,0);
});
Deno.test('cinematic movement is monotonic and reversible, with no velocity overshoot', () => {
  let previous=-18;
  for(let i=0;i<=100;i++) {
    const value=cinematicTravel(i/100,18);
    assertEquals(value>=previous && Math.abs(value)<=18,true);
    assertAlmostEquals(value,-cinematicTravel(1-i/100,18));
    previous=value;
  }
  assertEquals(cinematicTravel(.5,18),0);
  assertEquals(cinematicTravel(Infinity,18),0);
  assertEquals(cinematicTravel(-20,18),-18);
  assertEquals(cinematicTravel(20,18),18);
});
