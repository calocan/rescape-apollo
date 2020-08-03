/**
 * Created by Andy Likuski on 2018.05.10
 * Copyright (c) 2018 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {
  capitalize,
  compact,
  composeWithChain,
  mapObjToValues,
  memoized,
  omitDeep,
  replaceValuesWithCountAtDepthAndStringify,
  reqStrPathThrowing,
  strPathOr,
  traverseReduce
} from 'rescape-ramda';
import * as R from 'ramda';
import {_winnowRequestProps, formatOutputParams, resolveGraphQLType} from './requestHelpers';
import {v} from 'rescape-validate';
import {loggers} from 'rescape-log';
import {singularize} from 'inflected';
import PropTypes from 'prop-types';
import {gql} from '@apollo/client';
import {print} from 'graphql';
import {authApolloQueryContainer} from '../client/apolloClient';
import {of} from 'folktale/concurrency/task';

const log = loggers.get('rescapeDefault');


/**
 * Makes a graphql query based on the queryParams
 * @param {String} queryName
 * @param {Object} inputParamTypeMapper maps Object params paths to the correct input type for the query
 * e.g. { 'data': 'DataTypeRelatedReadInputType' }
 * @param {Array|Object} outputParams
 * @param {Object} queryArguments
 * @returns {String} The query in a string
 */
export const makeQuery = R.curry((queryName, inputParamTypeMapper, outputParams, queryArguments) => {
  return _makeQuery({}, queryName, inputParamTypeMapper, outputParams, queryArguments);
});

/**
 * Creates a fragment query for fetching values from the cache
 * @param {String} queryName Unique query name
 * @param {Object} inputParamTypeMapper Used to generate the correct complex input types
 * @param {Array|Object} outputParams
 * @param props Only for __typename
 * @param {String} [props.__typename] Only required for fragment queries
 * I think fragments never need args so only queryArguments.__typename should be specified for fragment queries
 * @return {string} The query string, not gql
 * @type {any}
 */
export const makeFragmentQuery = R.curry((queryName, inputParamTypeMapper, outputParams, props) => {
  return _makeQuery({isFragment: true}, queryName, inputParamTypeMapper, outputParams, props);
});

/***
 *
 * Makes a query or fragment query.
 * Memoized so we don't give Apollo the same query twice
 * @param {Object} queryConfig
 * @param {Boolean} queryConfig.client If true adds a client directive
 * @param {Boolean} queryConfig.isFragment If true creates a fragment
 * @param queryName
 * @param inputParamTypeMapper
 * @param {Array|Object} outputParams
 * @param props
 * @param {String} [props.__typename] Only required for fragment queries
 * I think fragments never need args so only queryArguments.__typename should be specified for fragment queries
 * @return {string} The query string, not gql
 * @private
 */
export const _makeQuery = memoized((queryConfig, queryName, inputParamTypeMapper, outputParams, props) => {
  const resolve = resolveGraphQLType(inputParamTypeMapper);

  // Never allow __typename. It might be in the queryArguments if the they come from the output of another query
  const cleanedQueryArguments = omitDeep(['__typename'], props);

  // These are the first line parameter definitions of the query, which list the name and type
  const params = R.join(
    ', ',
    mapObjToValues(
      (value, key) => {
        // Map the key to the inputParamTypeMapper value for that key if given
        // This is only needed when value is an Object since it needs to map to a custom graphql inputtype
        return `$${key}: ${resolve(key, value)}!`;
      },
      cleanedQueryArguments
    )
  );

  const parenWrapIfNotEmpty = str => R.unless(R.isEmpty, str => `(${str})`, str);

  // These are the second line arguments that map parameters to variables
  const args = R.join(
    ', ',
    mapObjToValues((value, key) => {
      return `${key}: $${key}`;
    }, cleanedQueryArguments)
  );

  // Only use parens if there are actually variables/arguments
  const variableString = R.ifElse(R.length, R.always(params), R.always(''))(R.keys(cleanedQueryArguments));

  const clientTokenIfClientQuery = R.ifElse(R.prop('client'), R.always('@client'), R.always(null))(queryConfig);

  // Either we have a query queryName or fragment queryName on queryArguments.__typename
  // I think fragments never need args so only queryArguments.__typename should be specified for fragment queryies
  const queryOrFragment = R.ifElse(
    R.prop('isFragment'),
    R.always(`fragment ${queryName}Fragment on ${R.prop('__typename', props)}`),
    R.always(`query ${queryName}`)
  )(queryConfig);

  // Unless we are creating a fragment, wrap the outputParams in the name of the type we are querying
  const unlessFragment = content => R.ifElse(
    R.prop('isFragment'),
    R.always(null),
    R.always(content)
  )(queryConfig);

  const output = R.join('', compact([
    unlessFragment(R.join(' ', compact([queryName, parenWrapIfNotEmpty(args), clientTokenIfClientQuery, '{']))),
    formatOutputParams(outputParams),
    unlessFragment('}')
  ]));

  // We use the queryName as the label of the query and the name that matches the schema
  return `${queryOrFragment} ${parenWrapIfNotEmpty(variableString)} { 
  ${output}
}`;
});

/**
 * Creates a query task for any type
 * @param {Object} apolloConfig The Apollo configuration with either an ApolloClient for server work or an
 * Apollo wrapped Component for browser work
 * @param {Object} apolloConfig.apolloClient Optional Apollo client, authenticated for most calls
 * @param {Object} apolloConfig.apolloComponent Optional Apollo component
 * @param {Function} apolloConfig.apolloComponent.options Required for ApolloComponent container queries.
 * A unary function expecting components from the parent component or container
 * @param {Object} apolloConfig.apolloComponent.options.variables Variables for the ApolloComponent container
 * @param {Object} apolloConfig.apolloComponent.options.errorPolicy Optional errorPolicy string for the ApolloComponent
 * container
 * @param {String} name The lowercase name of the object matching the query name, e.g. 'regions' for regionsQuery
 * @param {Object} readInputTypeMapper maps object keys to complex input types from the Apollo schema. Hopefully this
 * will be automatically resolved soon. E.g. {data: 'DataTypeofLocationTypeRelatedReadInputType'}
 * @param {Function} [normalizeProps] Optional function to normalize props after calling
 * apolloConfig.options.variables if defined.
 * @param {Array|Object} outputParams output parameters for the query in this style json format:
 *  [
 *    'id',
 *    {
 *        data: [
 *         'foo',
 *         {
 *            properties: [
 *             'type',
 *            ]
 *         },
 *         'bar',
 *       ]
 *    }
 *  ]
 *
 *  In other words, start every type as a list and embed object types using {objectTypeKey: [...]}
 *  props ahead of time with the container. It should be the expected prop names and
 *  example value types (e.g. 0 for Number) TODO we could use types instead of numbers, if we can figure out a type
 *  to identify primitives
 *  @param {Object} props. The props for the query or an Apollo container that will supply the props
 *  @param {Task} An apollo query task that resolves to and object with the results of the query. Successful results
 *  are in obj.data[name]. Errors are in obj.errors. Since the queries are stored in data[name], multiple queries
 *  of different could be merged together into the data field. This also matches what Apollo components expect.
 *  If you need the value in a Result.Ok or Result.Error to halt operations on error, use requestHelpers.mapQueryContainerToNamedResultAndInputs
 */
export const makeQueryContainer = v(R.curry(
  (apolloConfig,
   {name, readInputTypeMapper, outputParams, normalizeProps},
   props
  ) => {
    // Limits the arguments the query uses based on apolloConfig.options.variables(props) if specified
    const nameTitle = R.compose(capitalize, singularize)(name);
    const readInputTypeMapperOrDefault = R.defaultTo(
      {
        'data': `${nameTitle}DataTypeof${nameTitle}TypeRelatedReadInputType`
      },
      readInputTypeMapper
    );

    // See if the query is ready to run
    const skip = strPathOr(false, 'options.skip', apolloConfig);
    // If not skip, process the props
    const winnowedProps = R.ifElse(
      () => skip,
      () => ({}),
      props => R.compose(
        // Normalize the props if needed. This removes top-level key/values that might be in the object that
        // aren't expected/needed by the API
        props => {
          return normalizeProps(props);
        },
        props => {
          // Use apolloConfig.options.variables function to filter if specified.
          // This extracts the needed props for the query
          return _winnowRequestProps(apolloConfig, props);
        }
      )(props)
    )(props);
    const query = gql`${makeQuery(
      name, 
      readInputTypeMapperOrDefault, 
      outputParams, 
      winnowedProps
    )}`;
    log.debug(`Creating Query:\n${
      print(query)
    }\nArguments:\n${
      R.ifElse(
        () => skip,
        () => 'Props are not ready',
        (winnowedProps) => JSON.stringify(winnowedProps)
      )(winnowedProps)
    }\n`);
    const componentOrTask = authApolloQueryContainer(
      apolloConfig,
      query,
      // Non-winnowed props because the component does calls its options.variables function
      props
    );
    return R.when(
      componentOrTask => 'run' in componentOrTask,
      // If it's a task report the result. Components have to run their query
      componentOrTask => {
        return R.map(
          queryResponse => {
            log.debug(`makeQueryTask for ${name} responded: ${replaceValuesWithCountAtDepthAndStringify(2, queryResponse)}`);
            return queryResponse;
          },
          componentOrTask
        );
      }
    )(componentOrTask);
  }),
  [
    ['apolloConfig', PropTypes.shape().isRequired],
    ['queryOptions', PropTypes.shape({
      name: PropTypes.string.isRequired,
      readInputTypeMapper: PropTypes.shape(),
      outputParams: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.shape()
      ]).isRequired
    })],
    ['props', PropTypes.shape().isRequired]
  ], 'makeQueryContainer'
);

/**
 *
 * Use given props to call the function at requests.arg.options, and then get the .variables of the returned value
 * @param {Function} apolloComponent Expects props and returns an Apollo Component
 * @param {Object} props
 * @returns {Object} variables to use for the query
 */
export const createRequestVariables = (apolloComponent, props) => {
  return reqStrPathThrowing('props.variables', apolloComponent(props));
};

/**
 * Runs the apollo queries in queryComponents as tasks if runContainerQueries is true. If true,
 * resolvedPropsTask are resolved and set to the queries. props are also returned independent of the queries
 * If runContainerQueries is false, just resolves resolvedPropsTask and return the props
 * @param {Task} resolvedPropsTask A task that resolves the props to use
 * @param {Object} queryTasks Keyed by name, valued by a queryTask that expects the props.
 * Each queryTask resolves to a response. Responses are combined and keyed by the name
 * The responses are combined
 * @param {boolean} [runContainerQueries] Default true. When true run the container queries
 * @return {Task} A task that resolves to the props of resolvedPropsTask merged with the query results if there
 * are any queries and runContainerQueries is true
 */
export const apolloQueryResponsesTask = (resolvedPropsTask, queryTasks, runContainerQueries = true) => {
  // Task Object -> Task
  return composeWithChain([
    // Wait for all the queries to finish
    props => {
      return traverseReduce(
        (acc, obj) => {
          return R.merge(acc, obj);
        },
        // Begin with the props, we want to pass these through independent of what the queries return
        of(props),
        mapObjToValues(
          (queryContainerExpectingProps, key) => {
            // Create variables for the current graphqlQueryObj by sending props to its configuration
            const task = queryContainerExpectingProps(props);
            return R.map(
              response => {
                return {[key]: response};
              },
              task
            );
          },
          runContainerQueries && queryTasks ? queryTasks : {}
        )
      );
    },
    // Resolve the props from the task
    resolvedPropsTask => resolvedPropsTask.map(x => x)
  ])(resolvedPropsTask);
};