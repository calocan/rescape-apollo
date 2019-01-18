/**
 * Created by Andy Likuski on 2018.12.31
 * Copyright (c) 2018 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {graphql} from 'graphql';
import * as R from 'ramda';
import {makeMutationTask} from '../../helpers/mutationHelpers';
import {v} from 'rescape-validate';
import {makeClientQueryTask, makeQueryTask} from '../../helpers/queryHelpers';
import PropTypes from 'prop-types';
import {waitAll} from 'folktale/concurrency/task';
import {reqStrPathThrowing, chainMDeep} from 'rescape-ramda';

// Every complex input type needs a type specified in graphql. Our type names are
// always in the form [GrapheneFieldType]of[GrapheneModeType]RelatedReadInputType
// Following this location.data is represented as follows:
// TODO These value should be derived from the schema
export const readInputTypeMapper = {
  //'data': 'DataTypeofLocationTypeRelatedReadInputType'
  'geojson': 'FeatureCollectionDataTypeofRegionTypeRelatedReadInputType'
};

/**
 * Mapbox state of Global, UserGlobal, UserProjects
 * @type {*[]}
 */
export const mapboxOutputParamsFragment = [
  {
    mapbox: [{
      viewport: [
        'latitude',
        'longitude',
        'zoom'
      ]
    }]
  }
];

/**
 * Creates state output params
 * @param [Object] mapboxFragment The mapboxFragment of the params
 * @return {*[]}
 */
export const userStateMapboxOutputParams = mapboxFragment => [
  {
    userStates: [{
      data: [{
        userGlobal: mapboxFragment,
        userProjects: mapboxFragment
      }]
    }]
  }
];

/**
 * @file
 * The state of Mapbox is determined in increasing priority by:
 * Global
 *  Queries:
 *      viewport, style
 *
 * Region that is specified
 *  Queries:
 *      viewport (bounds override Global)
 *
 * Project that is specified
 *  Queries:
 *      viewport (locations' composite bounds override),
 *      locations (geojson and properties)
 *
 * User Global
 *  Queries:
 *      style (overrides global)
 *  Mutations:
 *      style
 *
 * User Project for specified Project
 *  Queries:
 *      viewport (user input overrides)
 *      location selections
 *  Mutations
 *      viewport
 *      location selections
 */

export const nullUnless = R.curry((condition, onTrue) => R.ifElse(condition, onTrue, R.always(null)));

/**
 * Given user and scope ids in the arguments (e.g. Region, Project, etc) resolves the mapbox state.
 * The merge precedence is documented above
 *
 * @params {Object} apolloClient The Apollo Client
 * @params {Object} outputParams OutputParams for the query such as regionOutputParams
 * @params {Object} argumentSets Arguments for each query as follows
 * @params {Object} argumentSets.users Arguments to limit the user to zero or one user. If unspecified no
 * user-specific queries are made, meaning no user state is merged into the result
 * @params {Object} argumentSets.regions Arguments to limit the region to zero or one region. If unspecified no
 * region queries are made
 * @params {Object} argumentSets.projects Arguments to limit the project to zero or one project. If unspecified no
 * project queries are made
 * @returns {Task} A Task containing the Regions in an object with obj.data.regions or errors in obj.errors
 */
export const makeMapboxQueryTask = v(R.curry((apolloClient, outputParams, arguments) => {
    return R.composeK(
      of(R.mergeAll),
      arguments => waitAll(R.sequence(Result.Ok, [
        R.map(
          () => makeClientQueryTask(
            apolloClient,
            {name: 'settings', readInputTypeMapper},
            // If we have to query for regions separately use the limited output userStateOutputParams
            outputParams,
            // No args for global
            {}
          ).map('data.settings.mapbox')
        )(Result.Ok({})),

        R.map(
          arguments => makeQueryTask(
            apolloClient,
            {name: 'regions', readInputTypeMapper},
            // If we have to query for regions separately use the limited output userStateOutputParams
            outputParams,
            arguments
          ).map(reqStrPathThrowing('data.regions.mapbox'))
        )(reqStrPath('regions', arguments))
      ]))
    )(arguments);
  }),
  [
    ['apolloClient', PropTypes.shape().isRequired],
    ['outputParams', PropTypes.array.isRequired],
    ['arguments', PropTypes.shape({
      users: PropTypes.shape().isRequired,
      regions: PropTypes.shape().isRequired,
      projects: PropTypes.shape().isRequired
    }).isRequired]
  ], 'makeRegionsQueryTask');

/**
 * Makes a Region mutation
 * @param {Object} authClient An authorized Apollo Client
 * @param [String|Object] outputParams output parameters for the query in this style json format:
 *  ['id',
 *   {
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
 *  @param {Object} inputParams Object matching the shape of a region. E.g.
 *  {id: 1, city: "Stavanger", data: {foo: 2}}
 *  Creates need all required fields and updates need at minimum the id
 *  @param {Task} An apollo mutation task
 */
export const makeRegionMutationTask = R.curry((apolloClient, outputParams, inputParams) => makeMutationTask(
  apolloClient,
  {name: 'region'},
  outputParams,
  inputParams
));
