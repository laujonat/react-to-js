import './ReactElement';

// Source: https://betterprogramming.pub/how-to-use-jsx-without-react-21d23346e5dc
const appendChild = (parent, child) => {
  if (Array.isArray(child))
    child.forEach((nestedChild) => appendChild(parent, nestedChild));
  else
    parent.appendChild(child.nodeType ? child : document.createTextNode(child));
};

// Source: https://codesandbox.io/s/jsx-in-the-browser-qd2hq?file=/main.js
export const createElement = (tag, props, ...children) => {
  const element = document.createElement(tag);

  Object.entries(props || {}).forEach(([name, value]) => {
    if (name.startsWith('on') && name.toLowerCase() in window)
      element.addEventListener(name.toLowerCase().substr(2), value);
    else element.setAttribute(name, value.toString());
  });

  children.forEach((child) => {
    appendChild(element, child);
  });

  return element;
};

export const defineReactComponent = (Component, name) => {
  const observed = getObserved(Component);
  class Wrapper extends HTMLElement {
    static get observedAttributes() {
      return observed;
    }

    mountPoint; // HTMLSpanElement in ts

    createComponent(props) {
      return React.createElement(Component, props, React.createElement('slot'));
    }

    generateAllProps(cmp) {
      const propsDef = {};
      Object.keys(cmp.propTypes).forEach((prop) => {
        propsDef[prop] = this.getAttribute(prop);
      });
      return propsDef;
    }

    connectedCallback() {
      this.mountPoint = document.createElement('span');
      const shadowRoot = this.attachShadow({ mode: 'open' });
      shadowRoot.appendChild(this.mountPoint);

      ReactDOM.render(
        this.createComponent(this.generateAllProps(Component)),
        this.mountPoint
      );
      retargetEvents(shadowRoot);
    }

    attributeChangedCallback(attrName) {
      if (Wrapper.observedAttributes.indexOf(attrName) >= 0) {
        ReactDOM.render(
          this.createComponent(this.generateAllProps(Component)),
          this.mountPoint
        );
      }
    }
  }
  window.customElements.define(name, Wrapper);
};
