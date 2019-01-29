/**
 * Created by Andy Likuski on 2019.01.04
 * Copyright (c) 2019 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {makeUserProjectsQueryTask} from './userProjectStore';
import {defaultRunConfig, reqStrPathThrowing, tas} from 'rescape-ramda';
import {expectKeysAtStrPath, stateLinkResolvers, testAuthTask, testConfig} from '../../../helpers/testHelpers';
import * as R from 'ramda';
import {makeCurrentUserQueryTask, userOutputParams} from '../userStore';

describe('userProjectStore', () => {
  test('makeUserProjectsQueryTask', done => {
    const someProjectKeys = ['id', 'key', 'name'];
    R.composeK(
      ({apolloClient, userId}) => makeUserProjectsQueryTask({apolloClient}, {user: {id: parseInt(userId)}}, {}),
      ({apolloClient}) => R.map(
        response => ({apolloClient, userId: reqStrPathThrowing('data.currentUser.id', response)}),
        makeCurrentUserQueryTask({apolloClient}, userOutputParams)
      ),
      () => testAuthTask
    )().run().listen(defaultRunConfig({
      onResolved:
        response => {
          expectKeysAtStrPath(someProjectKeys, 'data.userProjects.0.project', response);
          done();
        }
    }));
  });

  test('makeUserProjectQueryTaskWithProjectFilter', done => {
    const someProjectKeys = ['id', 'key', 'name'];
    R.composeK(
      // Filter for projects where the geojson.type is 'FeatureCollection'
      // This forces a separate query on Projects so we can filter by Project
      ({apolloClient, userId}) => makeUserProjectsQueryTask({apolloClient}, {user: {id: parseInt(userId)}}, {geojson: {type: 'FeatureCollection'}}),
      ({apolloClient}) => R.map(
        response => ({apolloClient, userId: reqStrPathThrowing('data.currentUser.id', response)}),
        makeCurrentUserQueryTask({apolloClient}, userOutputParams)
      ),
      () => testAuthTask
    )().run().listen(defaultRunConfig({
      onResolved:
        response => {
          expectKeysAtStrPath(someProjectKeys, 'data.userProjects.0.project', response);
          done();
        }
    }));
  });

  test('makeActiveUserProjectQuery', done => {
    const someProjectKeys = ['id', 'key', 'name'];
    R.composeK(
      ({apolloClient, userId}) => makeUserProjectsQueryTask({apolloClient}, {user: {id: parseInt(userId)}, }, {}),
      ({apolloClient}) => R.map(
        response => ({apolloClient, userId: reqStrPathThrowing('data.currentUser.id', response)}),
        makeCurrentUserQueryTask({apolloClient}, userOutputParams)
      ),
      () => testAuthTask
    )().run().listen(defaultRunConfig({
      onResolved:
        response => {
          expectKeysAtStrPath(someProjectKeys, 'data.userProjects.0.project', response);
          done();
        }
    }));
  })
});