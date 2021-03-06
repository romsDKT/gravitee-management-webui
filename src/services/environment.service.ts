/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IdentityProviderActivation } from '../entities/identityProvider';
import * as _ from 'lodash';

class EnvironmentService {
  private environmentsURL: string;
  private environmentURL: string;

  constructor(private $http, private Constants, private $q) {
    'ngInject';
    this.environmentsURL = `${Constants.org.baseURL}/environments`;
    this.environmentURL = Constants.env.baseURL;
  }

  /*
   * Analytics
   */
  analytics(request) {
    var url = this.environmentURL + '/analytics?';
    var keys = Object.keys(request);
    _.forEach(keys, function (key) {
      var val = request[key];
      if (val !== undefined) {
        url += key + '=' + val + '&';
      }
    });


    return this.$http.get(url, { timeout: this.getAnalyticsHttpTimeout() });
  }

  getAnalyticsHttpTimeout() {
    return this.Constants.env.settings.analytics.clientTimeout as number;
  }

  list() {
    return this.$http.get(this.environmentsURL);
  }

  getCurrent(): ng.IPromise<any> {
    return this.$http.get(this.environmentURL);
  }

  listEnvironmentIdentities(envId: string) {
    return this.$http.get(`${this.environmentsURL}/${envId}/identities`);
  }

  updateEnvironmentIdentities(envId: string, updatedIPA: IdentityProviderActivation[]) {
    return this.$http.put(`${this.environmentsURL}/${envId}/identities`, updatedIPA);
  }
}

export default EnvironmentService;
