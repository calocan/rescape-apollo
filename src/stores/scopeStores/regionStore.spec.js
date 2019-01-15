/**
 * Created by Andy Likuski on 2019.01.15
 * Copyright (c) 2019 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import {defaultRunConfig, reqStrPathThrowing} from 'rescape-ramda';
import {expectKeys, expectKeysAtStrPath, stateLinkResolvers, testAuthTask, testConfig} from '../../helpers/testHelpers';
import * as R from 'ramda';
import {makeRegionMutationTask, makeRegionsQueryTask, regionOutputParams} from './regionStore';

const someRegionKeys = ['id', 'key', 'geojson', 'data'];
describe('regionStore', () => {
  test('makeRegionMutationTask', done => {
    R.composeK(
      ({apolloClient}) => makeRegionMutationTask(apolloClient, regionOutputParams, {key: 'earth', name: 'Earth'}),
      () => testAuthTask
    )().run().listen(defaultRunConfig({
      onResolved:
        response => {
          expectKeysAtStrPath(someRegionKeys, 'data.region', response);
          done();
        }
    }));
  });

  test('makeRegionsQueryTask', done => {
    R.composeK(
      ({apolloClient}) => makeRegionsQueryTask(apolloClient, regionOutputParams, {key: 'earth'}),
      () => testAuthTask
    )().run().listen(defaultRunConfig({
      onResolved:
        response => {
          expectKeysAtStrPath(someRegionKeys, 'data.regions.0', response);
          done();
        }
    }));
  });
});