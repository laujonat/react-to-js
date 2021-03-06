import _ from 'lodash';

import { Test } from './components';
import { createRoot } from 'react-dom/client';
import { makeReactCustomElement } from './compile';

import './ReactElement';
// import './registry';
import './index.css';

function component() {
  const element = document.createElement('div');

  // Lodash, now imported by this script
  element.innerHTML = _.join(['Test', 'app'], ' ');

  return element;
}

const container = document.getElementById('root');

const root = createRoot(container);
root.render(Test);

document.body.appendChild(component());

function SomeComponent() {
  return (
    <div>
      <span>food</span>
    </div>
  );
}

window.customElements.define(
  'iframe-like',
  makeReactCustomElement(SomeComponent)
);
