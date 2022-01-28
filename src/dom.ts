const urlParams = new URLSearchParams(window.location.search);

type HTMLTagName = 'span' | 'textarea' | 'i' | 'b' | 'big' | 'sup' | 'var';
type SVGTagName = 'svg' | 'path';

interface CreateElementAttributes {
  class?: string;
  style?: string;
  [name: string]: string | boolean | number | undefined;
}

function parseHTML(s: string) {
  // https://youmightnotneedjquery.com/#parse_html
  const tmp = document.implementation.createHTMLDocument('');
  tmp.body.innerHTML = s;
  return tmp.body.childNodes;
}

interface HtmlBuilder {
  (
    type: HTMLTagName,
    attributes?: CreateElementAttributes,
    children?: (ChildNode | DocumentFragment)[] | NodeListOf<ChildNode>
  ): HTMLElement;
  (
    type: SVGTagName,
    attributes?: CreateElementAttributes,
    children?: (ChildNode | DocumentFragment)[]
  ): SVGElement;

  text(s: string): Text;
  /**
   * Render an HTML node containing a child block. We use a specialized function for this because MathQuill expects
   * each block's containing element to have a `mathquill-block-id` attribute set on it.
   */
  block(
    type: HTMLTagName,
    attributes: CreateElementAttributes | undefined,
    block: MathBlock
  ): HTMLElement;
  entityText(s: string): Text;
}

const h: HtmlBuilder = function h(
  type: HTMLTagName | SVGTagName,
  attributes?: CreateElementAttributes,
  children?: (ChildNode | DocumentFragment)[]
): HTMLElement | SVGElement {
  let el: HTMLElement | SVGElement;
  switch (type) {
    case 'svg':
    case 'path':
      el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      break;
    default:
      el = document.createElement(type);
  }
  for (const key in attributes) {
    const value = attributes[key];
    if (value === undefined) continue;
    el.setAttribute(key, typeof value === 'string' ? value : String(value));
  }

  appendChildren(el, children);

  return el;
} as HtmlBuilder;

h.text = (s: string) => document.createTextNode(s);

h.block = (
  type: HTMLTagName,
  attributes: CreateElementAttributes | undefined,
  block: MathBlock
) =>
  h(type, { ...attributes, 'mathquill-block-id': block.id + '' }, [
    block.html(),
  ]);

h.entityText = (s: string) => {
  // TODO: replace with h.text(U_BLAHBLAH) or maybe a named entity->unicode lookup
  const val = parseHTML(s);
  pray(
    'entity parses to a single text node',
    val.length === 1 && val[0] instanceof Text
  );
  return val[0] as Text;
};

function appendChildren(
  parent: ParentNode,
  children?: ChildNode | DocumentFragment | (ChildNode | DocumentFragment)[]
) {
  if (!children) return;

  if (children instanceof Node) {
    parent.appendChild(children);
    return;
  }
  const list =
    children instanceof DocumentFragment ? children.childNodes : children;
  for (let i = 0; i < list.length; i++) {
    parent.appendChild(list[i]);
  }
}

function closest(el: unknown | null, s: string) {
  if (typeof (el as any)?.closest === 'function') {
    return (el as HTMLElement).closest(s);
  }

  if (!(el instanceof HTMLElement)) return null;

  // https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#polyfill
  const matches =
    Element.prototype.matches ||
    (Element.prototype as any).msMatchesSelector ||
    Element.prototype.webkitMatchesSelector;

  var match: ParentNode | null = el;
  do {
    if (matches.call(match, s)) return match;
    match = match?.parentElement ?? match?.parentNode ?? null;
  } while (match !== null && match.nodeType === 1);
  return null;
}
