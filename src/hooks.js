import {
  getLastHook,
  registerHook,
  getCurrentRoot,
  dispatchUpdate,
} from './reconciler.js';

export const useState = initial => {
  const oldHook = getLastHook();
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: []
  };
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => hook.state = action(hook.state));
  const setState = state => {
    hook.queue.push(() => state);
    const currentRoot = getCurrentRoot();
    const rootFiber = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    dispatchUpdate(rootFiber);
  };
  registerHook(hook);
  return [hook.state, setState];
};

export const useReducer = (reducer, initial) => {
  if (!reducer) return useState(initial);
  const [state, setState] = useState(initial);
  const dispatch = action => setState(reducer(state, action));
  return [state, dispatch];
};

export const isChanged = (a, b) => {
  return !a || a.length !== b.length || b.some((v, i) => v !== a[i]);
};

export const useEffect = (cb, deps) => {
  const oldHook = getLastHook();
  const hook = { deps };
  if (!oldHook || isChanged(oldHook.deps, hook.deps)) cb();
  return registerHook(hook);
};

export const useMemo = (cb, deps) => {
  const oldHook = getLastHook();
  const hook = { value: null, deps };
  if (oldHook && !isChanged(oldHook.deps, hook.deps)) {
    hook.value = oldHook.value;
  } else {
    hook.value = cb();
  }
  registerHook(hook);
  return hook.value;
};

export const useCallback = (cb, deps) => {
  return useMemo(() => cb, deps);
};

export const useRef = current => {
  return useMemo(() => ({ current }), [])
};