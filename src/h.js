
const flattern = arr => [].concat.apply([], arr);

export function createElement(type, props, ...children) {
  children = flattern(children).filter(x => x !== void(0));
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

export function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  }
}
