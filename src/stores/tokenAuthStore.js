/**
 * Created by Andy Likuski on 2020.08.18
 * Copyright (c) 2020 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as R from 'ramda';
import {makeMutationRequestContainer} from '../helpers/mutationHelpers';

export const tokenAuthOutputParams = {
  token: 1,
  payload: 1
};

export const tokenAuthReadInputTypeMapper = {};

/**
 * Verifies an apolloClient auth token.
 * @param {Object} apolloClient
 * @param {Object} outputParams
 * @param {Object} props
 * @param {String} props.username
 * @param {String} props.password
 * @return {TasK|Object} Task or Apollo Component resolving to
 * {
  "data": {
    "tokenAuth": {
      "token": the token
      "payload": {
        "username": the username
        "exp": Expiration time as 1598264561,
        "origIat": Original login time 1598264261
      },
    }
  }
}
 */
export const tokenAuthMutationContainer = R.curry((apolloConfig, {outputParams = null}, props) => {
  return makeMutationRequestContainer(
    apolloConfig,
    {
      outputParams: outputParams || tokenAuthOutputParams,
      flattenVariables: true,
      mutationNameOverride: 'tokenAuth'
    },
    props
  );
});

export const deleteTokenCookieMutationRequestContainer = R.curry((apolloConfig, {outputParams = null}, props) => {
  return makeMutationRequestContainer(
    apolloConfig,
    {
      outputParams: outputParams || {deleted: 1},
      flattenVariables: true,
      mutationNameOverride: 'deleteTokenCookie'
    },
    props
  );
});
export const deleteRefreshTokenCookieMutationRequestContainer = R.curry((apolloConfig, {outputParams = null}, props) => {
  return makeMutationRequestContainer(
    apolloConfig,
    {
      outputParams: outputParams || {deleted: 1},
      flattenVariables: true,
      mutationNameOverride: 'deleteRefreshTokenCookie'
    },
    props
  );
});
/**
 * Verifies an apolloClient auth token.
 * @param {Object} apolloClient
 * @param {Object} outputParams
 * @param {Object} props
 * @param {String} props.token The token to verify
 * @return {Function} Unary function expecting props and returning an Apollo Componnet or Task that resolves to the
 * token verification
 */
export const verifyTokenMutationRequestContainer = R.curry((apolloConfig, {outputParams = null}, props) => {
  return makeMutationRequestContainer(
    apolloConfig,
    {
      outputParams: outputParams || {payload: 1},
      flattenVariables: true,
      mutationNameOverride: 'verifyToken'
    },
    props
  );
});

/**
 * Refresh an apolloClient auth token.
 * @param {Object} apolloClient
 * @param {Object} outputParams
 * @param {Object} variables
 * @param {String} variables.token The token to verify
 * @return {Object} Task that resolves to the username, expiration (exp), and origlat (?)
 *
 */
export const refreshTokenMutationRequestContainer = R.curry((apolloConfig, {outputParams = null}, props) => {
  return makeMutationRequestContainer(
    apolloConfig,
    {
      outputParams: outputParams || {payload: 1},
      flattenVariables: true,
      mutationNameOverride: 'refreshToken'
    },
    props
  );
});