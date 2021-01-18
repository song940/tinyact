import { createElement as h, render, 
  useMemo,
  useState,
  useReducer,
  useEffect,
  useCallback,
} from '../src/index.js';

/** @jsx h */

function reducer(n, action) {
  switch (action.type) {
    case 'increment':
      return n + 1;
    case 'decrement':
      return n - 1;
    default:
      throw new Error();
  }
}

function Counter() {
  const [n, setState] = useState(0);
  // const [n, dispatch] = useReducer(reducer, 0);
  useEffect(() => {
    console.log('did mount');
  }, []);
  useMemo(() => {
    console.log('memo', n);
  }, [ n ]);
  return (
    <h1>
      <p>Count: {n}</p>
      <button onClick={() => setState(n + 1)} >click</button>
      <button onClick={() => dispatch({type: 'decrement'})}>-</button>
      <button onClick={() => dispatch({type: 'increment'})}>+</button>
    </h1>
  )
}

const container = document.getElementById("app")
render(<Counter />, container)