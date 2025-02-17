// SPDX-FileCopyrightText: 2019-2020 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Originally from: https://raw.githubusercontent.com/mui-org/material-ui/master/docs/src/modules/components/prism.js
 * 
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Call-Em-All
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 */
/* eslint-disable import/no-mutable-exports, global-require */
import prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';

export function highlight(code, lang) {
  let language;
  switch (lang) {
    case 'diff':
      language = 'diff';
      break;
    case 'css':
      language = 'css';
      break;
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'javascript':
      language = 'jsx';
      break;
    case 'json':
      language = 'json';
      break;
    case 'java':
      language = 'java';
      break;
    case 'python':
      language = 'python';
      break;
    case 'sql':
      language = 'sql';
      break;
    case 'cpp':
    case 'c':
    case 'c++':
    case 'c#':
      language = 'clike';
      break;
    default:
      language = 'markup';
      break;
  }
  return prism.highlight(code, prism.languages[language], '');
}

export default prism;