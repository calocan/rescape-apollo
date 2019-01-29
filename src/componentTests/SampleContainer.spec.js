import * as R from 'ramda';
import {c} from './SampleComponent';
import SampleContainer, {queries, mapStateToProps} from './SampleContainer';
import {chainedParentPropsTask} from './SampleContainer.sample';
import {apolloContainerTests} from 'rescape-helpers-test';
import {of} from 'folktale/concurrency/task';
import {testConfig} from '../helpers/testHelpers';
import {remoteSchemaTask} from '../schema/remoteSchema';

// Test this container
const [Container] = eMap([SampleContainer]);
// Find this React component
const componentName = 'Sample';
// Find this class in the data renderer
const childClassDataName = c.sampleMapboxOuter;
// Find this class in the loading renderer
const childClassLoadingName = c.sampleLoading;
// Find this class in the error renderer
const childClassErrorName = c.sampleError;
const queryConfig = queries.sample;
const errorMaker = parentProps => R.set(R.lensPath(['sample', 'id']), 'foo', parentProps);

describe('SampleContainer', () => {

  const {testMapStateToProps, testQuery, testRenderError, testRender} = apolloContainerTests({
    // This was for Redux. We shouldn't need it now since our Apollo LinkState stores all state
    initialState: {},
    // Get the remote schema based on the test config
    schema: remoteSchemaTask(testConfig),
    Container,
    componentName,
    childClassDataName,
    childClassLoadingName,
    childClassErrorName,
    queryConfig,
    chainedParentPropsTask,
    mapStateToProps,
    errorMaker
  });
  test('testMapStateToProps', testMapStateToProps);
  test('testQuery', testQuery);
  test('testRender', testRender);
  test('testRenderError', testRenderError);
});