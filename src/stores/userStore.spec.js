/**
 * Created by Andy Likuski on 2019.01.07
 * Copyright (c) 2019 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {defaultRunConfig, expectKeysAtPath, mapToNamedPathAndInputs} from 'rescape-ramda';
import * as R from 'ramda';
import {makeCurrentUserQueryContainer, userOutputParams} from './userStore';
import {localTestAuthTask} from '..';

describe('userStore', () => {
  test('makeCurrentUserQueryContainer', done => {
    const someUserKeys = ['id', 'email', 'username'];
    const errors = [];
    R.composeK(
      ({apolloClient}) => makeCurrentUserQueryContainer({apolloClient}, userOutputParams, {}),
      mapToNamedPathAndInputs('apolloClient', 'apolloClient',
        () => localTestAuthTask()
      )
    )().run().listen(defaultRunConfig({
      onResolved:
        response => {
          expectKeysAtPath(someUserKeys, 'data.currentUser', response);
          done();
        }
    }, errors, done));
  });
});

