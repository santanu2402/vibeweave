# Typewriter
**What:** types a few words in turn ("Book wheel time / kiln slots / glaze classes"). **Use for:** one
hero line. **Avoid when:** the message must be read at a glance; never for body copy. (Written from scratch —
no GPL Typed.js dependency.)

**Accessibility:** the server HTML (and no-JS) already holds the final word, and screen readers get every
word once (visually hidden); the animated text is `aria-hidden`. By default it runs one cycle, stops on the
last word and drops the caret, so nothing blinks or moves past ~5s (WCAG 2.2.2) — `loop` keeps it moving
forever and then needs a Pause control. Reduced motion shows the last word statically. Keep it to a few
words inside the headline: the headline itself paints immediately. **Performance:** a single timer.

```tsx
"use client";
import { useEffect, useState } from "react";

type Props = { prefix?: string; words: string[]; typeMs?: number; holdMs?: number; loop?: boolean };

export function Typewriter({ prefix = "", words, typeMs = 60, holdMs = 1400, loop = false }: Props) {
  const [text, setText] = useState(words[words.length - 1]);          // SSR / no-JS: final word
  const [typing, setTyping] = useState(false);                          // caret only while it types
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0, len = 0, deleting = false, timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const word = words[i];
      len += deleting ? -1 : 1;
      setText(word.slice(0, len));
      if (!deleting && len === word.length) {
        if (i === words.length - 1 && !loop) { setTyping(false); return; }  // stop on the last word
        deleting = true; timer = setTimeout(step, holdMs); return;
      }
      if (deleting && len === 0) { deleting = false; i = (i + 1) % words.length; }
      timer = setTimeout(step, deleting ? typeMs / 2 : typeMs);
    };
    setText(""); setTyping(true); timer = setTimeout(step, 400);
    return () => { clearTimeout(timer); setTyping(false); };
  }, [words, typeMs, holdMs, loop]);
  const caret = "after:ml-0.5 after:inline-block after:w-[2px] after:h-[1em] after:align-[-0.1em] after:bg-current after:animate-pulse motion-reduce:after:animate-none";
  return (
    <span>
      {prefix}
      <span aria-hidden="true" className={typing ? caret : undefined}>{text}</span>
      <span className="sr-only">{words.join(", ")}</span>
    </span>
  );
}
```
**Variations:** reserve width with `min-width: <longest word>ch` to avoid layout shift; GSAP TextPlugin or
ScrambleText for a decode effect. Pass a stable `words` array (module constant or `useMemo`) so the
effect doesn't restart on every render.
