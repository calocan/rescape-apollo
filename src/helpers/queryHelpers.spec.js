/**
 * Created by Andy Likuski on 2018.04.23
 * Copyright (c) 2018 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {
  composeFuncAtPathIntoApolloConfig, logicalOrValueAtPathIntoApolloConfig,
  makeQuery,
  makeQueryContainer
} from './queryHelpers.js';

import * as AC from '@apollo/client';
import {print} from 'graphql';
import {sampleInputParamTypeMapper, sampleResourceOutputParams} from './samples/sampleData.js';
import {
  composeWithChain,
  defaultRunConfig,
  mapToNamedPathAndInputs,
  mapToNamedResponseAndInputs,
  strPathOr,
  defaultNode
} from '@rescapes/ramda';
import {expectKeys, localTestAuthTask, localTestConfig} from './testHelpers.js';
import * as R from 'ramda';
import {makeMutationRequestContainer} from './mutationHelpers.js';
import moment from 'moment';
import T from 'folktale/concurrency/task/index.js';

const {gql} = defaultNode(AC);
const {of} = T;

describe('queryHelpers', () => {

  test('makeQuery', () => {
    expect(
      print(
        gql`${makeQuery('sampleResourceQuery', sampleInputParamTypeMapper, sampleResourceOutputParams, {id: 0})}`
      )
    ).toMatchSnapshot();
  });

  test('makeQueryContainer', done => {
    expect.assertions(2);
    const {settings: {api}} = localTestConfig;
    const task = composeWithChain([
      // Test Skip
      mapToNamedResponseAndInputs('skippedResponse',
        ({apolloClient, createdRegion}) => {
          return makeQueryContainer(
            {
              apolloClient,
              options: {
                skip: true,
                variables: props => {
                  return R.pick(['key'], props);
                }
              },
              fetchPolicy: 'cache-only'
            },
            {
              name: 'regions',
              readInputTypeMapper: {},
              outputParams: {id: 1, key: 1, name: 1, geojson: {features: {type: 1}}}
            },
            {key: createdRegion.key, sillyPropThatWontBeUsed: '11wasAraceHorse'}
          );
        }
      ),
      // See if we can get the value from the cache
      mapToNamedPathAndInputs('region', 'data.regions.0',
        ({apolloClient, createdRegion}) => {
          return makeQueryContainer(
            {
              apolloClient,
              options: {
                variables: props => {
                  return R.pick(['key'], props);
                }
              },
              fetchPolicy: 'cache-only'
            },
            {
              name: 'regions',
              readInputTypeMapper: {},
              outputParams: {id: 1, key: 1, name: 1, geojson: {features: {type: 1}}}
            },
            {key: createdRegion.key, sillyPropThatWontBeUsed: '11wasAraceHorse'}
          );
        }
      ),
      mapToNamedPathAndInputs('region1', 'data.regions.0',
        ({apolloClient, createdRegion}) => makeQueryContainer(
          {
            apolloClient,
            options: {
              variables: props => {
                return R.pick(['key'], props);
              }
            }
          },
          {
            name: 'regions',
            readInputTypeMapper: {},
            outputParams: {id: 1, key: 1, name: 1, geojson: {features: {type: 1}}}
          },
          {key: createdRegion.key, sillyPropThatWontBeUsed: '11wasAraceHorse'}
        )
      ),
      mapToNamedPathAndInputs('createdRegion', 'result.data.createRegion.region',
        ({apolloClient}) => makeMutationRequestContainer(
          {apolloClient},
          {
            name: 'region',
            outputParams: {id: 1, key: 1}
          },
          {
            key: `test${moment().format('HH-mm-SS')}`,
            name: `Test${moment().format('HH-mm-SS')}`
          }
        )
      ),
      mapToNamedPathAndInputs('apolloClient', 'apolloClient',
        () => localTestAuthTask()
      )
    ])();
    const errors = [];
    task.run().listen(defaultRunConfig({
        onResolved:
          ({region, skippedResponse}) => {
            expectKeys(['id', 'key', 'name', 'geojson', '__typename'], region);
            expect(strPathOr(false, 'skip', skippedResponse)).toBe(true);
          }
      }, errors, done)
    );
  }, 100000);

  test('composePropsFilterIntoApolloConfigOptionsVariables', done => {
    const task = composeWithChain([
      mapToNamedPathAndInputs('region', 'data.regions.0',
        ({apolloClient, createdRegion}) => {
          const apolloConfig = (
            {
              apolloClient,
              options: {
                variables: props => {
                  return R.pick(['key', 'sillyPropThatWontBeUsed'], props);
                }
              }
            }
          );
          return makeQueryContainer(
            composeFuncAtPathIntoApolloConfig(
              apolloConfig,
              'options.variables',
              props => {
                return R.pick(['key'], props);
              }
            ),
            {
              name: 'regions',
              readInputTypeMapper: {},
              outputParams: {id: 1, key: 1, name: 1, geojson: {features: {type: 1}}}
            },
            {key: createdRegion.key, sillyPropThatWontBeUsed: '11wasAraceHorse'}
          );
        }
      ),
      mapToNamedPathAndInputs('createdRegion', 'result.data.createRegion.region',
        ({apolloClient}) => makeMutationRequestContainer(
          {apolloClient},
          {
            name: 'region',
            outputParams: {id: 1, key: 1}
          },
          {
            key: `test${moment().format('HH-mm-SS')}`,
            name: `Test${moment().format('HH-mm-SS')}`
          }
        )
      ),
      mapToNamedPathAndInputs('apolloClient', 'apolloClient',
        () => localTestAuthTask()
      )
    ])();
    const errors = [];
    task.run().listen(defaultRunConfig({
      onResolved:
        ({region}) => {
          expectKeys(['id', 'key', 'name', 'geojson', '__typename'], region);
        }
    }, errors, done));
  });

  test('logicalOrValueAtPathIntoApolloConfig', done => {
    const task = composeWithChain([
      mapToNamedResponseAndInputs('regionResponse',
        ({apolloClient, createdRegion}) => {
          const apolloConfig = (
            {
              apolloClient,
              options: {
                skip: false
              }
            }
          );
          return makeQueryContainer(
            logicalOrValueAtPathIntoApolloConfig(
              apolloConfig,
              'options.skip',
              true
            ),
            {
              name: 'regions',
              readInputTypeMapper: {},
              outputParams: {id: 1, key: 1, name: 1, geojson: {features: {type: 1}}}
            },
            {key: createdRegion.key, sillyPropThatWontBeUsed: '11wasAraceHorse'}
          );
        }
      ),
      mapToNamedPathAndInputs('createdRegion', 'result.data.createRegion.region',
        ({apolloClient}) => makeMutationRequestContainer(
          {apolloClient},
          {
            name: 'region',
            outputParams: {id: 1, key: 1}
          },
          {
            key: `test${moment().format('HH-mm-SS')}`,
            name: `Test${moment().format('HH-mm-SS')}`
          }
        )
      ),
      mapToNamedPathAndInputs('apolloClient', 'apolloClient',
        () => localTestAuthTask()
      )
    ])();
    const errors = [];
    task.run().listen(defaultRunConfig({
      onResolved:
        ({regionResponse}) => {
          expect(regionResponse.skip).toBeTruthy()
        }
    }, errors, done));
  })
});

