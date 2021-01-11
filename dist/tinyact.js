'use strict';

function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === "object"
          ? child
          : createTextElement(child)
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

function createDom(fiber) {
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  updateDom(dom, {}, fiber.props);
  return dom
}

const isEvent = key => key.startsWith("on");
const isProperty = key =>
  key !== "children" && !isEvent(key);
const isNew = (prev, next) => key =>
  prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next);

function updateDom(dom, prevProps, nextProps) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key =>
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2);
      dom.removeEventListener(
        eventType,
        prevProps[name]
      );
    });

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = "";
    });

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name];
    });

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name
        .toLowerCase()
        .substring(2);
      dom.addEventListener(
        eventType,
        nextProps[name]
      );
    });
}

function commitWork(fiber) {
  if (!fiber) return;
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (
    fiber.effectTag === "PLACEMENT" &&
    fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (
    fiber.effectTag === "UPDATE" &&
    fiber.dom != null) {
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    );
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}

function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

let hookIndex = null;
let wipFiber = null;
let nextUnitOfWork = null;
let currentRoot = null;
let wipRoot = null;
let deletions = null;

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber) {
  if (fiber.type instanceof Function) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child)
    return fiber.child;

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling)
      return nextFiber.sibling;
    nextFiber = nextFiber.parent;
  }
}

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const child = fiber.type(fiber.props);
  const children = [child];
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) fiber.dom = createDom(fiber);
  reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    const sameType =
      oldFiber &&
      element &&
      element.type == oldFiber.type;

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

const dispatchUpdate = fiber => {
  wipRoot = fiber;
  deletions = [];
  return nextUnitOfWork = wipRoot;
};

const render = (vnode, dom) => {
  const rootFiber = {
    dom,
    props: { children: [vnode] },
    alternate: currentRoot,
  };
  return dispatchUpdate(rootFiber);
};

const getCurrentRoot = () => currentRoot;
const getCurrentFiber = () => wipFiber;

const getLastHook = () => {
  const fiber = getCurrentFiber();
  const hook =
    fiber.alternate &&
    fiber.alternate.hooks &&
    fiber.alternate.hooks[hookIndex];
  return hook;
};

const registerHook = hook => {
  wipFiber.hooks.push(hook);
  hookIndex++;
  return hook;
};

const useReducer = (reducer, initial) => {
  const oldHook = getLastHook();
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: []
  };
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = action(hook.state);
  });
  const setState = action => {
    hook.queue.push(action);
    const currentRoot = getCurrentRoot();
    const rootFiber = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    dispatchUpdate(rootFiber);
  };
  registerHook(hook);
  const dispatch = action =>
    setState(reducer(hook.state, action));
  return [hook.state, dispatch];
};

const useState = initial => {
  return useReducer(null, initial);
};

const isChanged = (a, b) => {
  return !a || a.length !== b.length || b.some((v, i) => v !== a[i]);
};

const useEffect = (cb, deps) => {
  const oldHook = getLastHook();
  const hook = { deps };
  if (!oldHook || isChanged(oldHook.deps, hook.deps)) cb();
  return registerHook(hook);
};

const useMemo = (cb, deps) => {
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

const useCallback = (cb, deps) => {
  return useMemo(() => cb, deps);
};

const useRef = current => {
  return useMemo(() => ({ current }), [])
};

exports.createDom = createDom;
exports.createElement = createElement;
exports.createTextElement = createTextElement;
exports.dispatchUpdate = dispatchUpdate;
exports.getCurrentFiber = getCurrentFiber;
exports.getCurrentRoot = getCurrentRoot;
exports.getLastHook = getLastHook;
exports.isChanged = isChanged;
exports.registerHook = registerHook;
exports.render = render;
exports.updateDom = updateDom;
exports.useCallback = useCallback;
exports.useEffect = useEffect;
exports.useMemo = useMemo;
exports.useReducer = useReducer;
exports.useRef = useRef;
exports.useState = useState;
//# sourceMappingURL=tinyact.js.map
