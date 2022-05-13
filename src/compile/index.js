// import './ReactElement';

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
import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

function makeObs(initialValue) {
  let value = initialValue;
  let subscribers = [];

  return {
    subscribe(subscriber) {
      subscribers.push(subscriber);
      return () => (subscribers = subscribers.filter((s) => s !== subscriber));
    },
    next(newValue) {
      value = newValue;
      subscribers.forEach((s) => s(value));
    },
    getValue() {
      return value;
    },
    destroy() {
      value = undefined;
      subscribers = undefined;
    },
  };
}

function getProps(attributes, propTypes = {}) {
  const props = [...attributes]
    .filter((attr) => attr.name !== 'style')
    .map((attr) => convertToProp(propTypes, attr.name, attr.value))
    .reduce((props, prop) => ({ ...props, [prop.name]: prop.value }), {});
  return props;
}

function convertToProp(propTypes, attrName, attrValue) {
  const propName = Object.keys(propTypes).find(
    (key) => key.toLowerCase() === attrName
  );
  const value = cleanAttributeValue(attrValue);
  return {
    name: propName ? propName : attrName,
    value: value,
  };
}

function cleanAttributeValue(attrValue) {
  let value = attrValue;
  if (attrValue === 'true' || attrValue === 'false')
    value = attrValue === 'true';
  else if (!isNaN(attrValue) && attrValue !== '') value = +attrValue;
  else if (/^{.*}/.exec(attrValue)) value = JSON.parse(attrValue);
  return value;
}

function useObservable(obs$) {
  const [value, setValue] = React.useState(obs$.getValue());
  React.useEffect(
    () => obs$.subscribe((newValue) => setValue(newValue)),
    [obs$]
  );
  return value;
}
function withObsProps(obs$) {
  return function (Component) {
    return function WithObsComponent() {
      const obsData = useObservable(obs$);
      return <Component {...obsData} />;
    };
  };
}

export function makeReactCustomElement(Component, propTypes = {}) {
  return class ReactElement extends HTMLElement {
    props$ = makeObs({});
    propTypes = propTypes;

    constructor() {
      super();
      this.WrappedComponent = withObsProps(this.props$)(Component);
      this.observer = new MutationObserver(() => this.handleAttributeChange());
      this.observer.observe(this, { attributes: true });
    }

    connectedCallback() {
      this.props$.next(this.getProps());
      this.mount();
    }

    disconnectedCallback() {
      this.unmount();
      this.observer.disconnect();
      this.props$.destroy();
    }

    handleAttributeChange() {
      this.props$.next(this.getProps());
    }

    mount() {
      render(<this.WrappedComponent />, this);
    }

    unmount() {
      unmountComponentAtNode(this);
    }

    getProps() {
      return getProps(this.attributes, this.propTypes);
    }
  };
}

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
