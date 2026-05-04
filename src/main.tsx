import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global polyfills for PDF.js and modern JS features
if (typeof (Promise as any).withResolvers === 'undefined') {
  (Promise as any).withResolvers = function<T>() {
    let resolve: (value: T | PromiseLike<T>) => void = () => {};
    let reject: (reason?: any) => void = () => {};
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function(fn: (...args: any[]) => any, ...args: any[]) {
    return new Promise((resolve) => {
      resolve(fn(...args));
    });
  };
}

if (typeof (URL as any).parse === 'undefined') {
  (URL as any).parse = function(url: string, base?: string | URL) {
    try {
      return new URL(url, base);
    } catch (e) {
      return null;
    }
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
