# tinyact

Super Tiny React Alternative

## example

```js
import { createElement as h, render, useState } from 'tinyact';

/** @jsx h */

function Counter() {
  const [n, setState] = useState(1)
  return (
    <h1 onClick={() => setState(() => n + 1)}>
      Count: {n}
    </h1>
  )
}

const container = document.getElementById("app");
render(<Counter />, container);
```