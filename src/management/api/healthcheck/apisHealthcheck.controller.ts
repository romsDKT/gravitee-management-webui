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
import ApiService from '../../../services/api.service';
import * as _ from 'lodash';
import { ITimeframe, TimeframeRanges } from '../../../components/quick-time-range/quick-time-range.component';
import { LogsQuery } from '../../../services/analytics.service';
// tslint:disable-next-line:no-var-requires
require('@gravitee/ui-components/wc/gv-chart-gauge');
// tslint:disable-next-line:no-var-requires
require('@gravitee/ui-components/wc/gv-chart-line');



const HEALTHCHECK_SERVICE = 'health-check';

class ApiHealthCheckController {
  private readonly RED_COLOR = '#D9534F';
  private readonly  ORANGE_COLOR = '#F0AD4E';
  private readonly  GREEN_COLOR = '#5CB85C';

  private currentTimeframe: ITimeframe;

  private query: {
    from: number,
    to: number,
    interval: number
  };
  private unavailableApis: number;
  private hideApisWithoutHC: boolean;
  private apisWithHC: any[];
  private displayedApis: any[];

  constructor (
    private apis: any[],
    private ApiService: ApiService,
    private $q
  ) {
    'ngInject';

    this.hideApisWithoutHC = false;
    this.apisWithHC = this.apis.filter(api => this.hasHealthcheck(api));

    this.updateDisplayedApis();
    this.timeframeChange(TimeframeRanges.LAST_5_MINUTES);
  }

  updateDisplayedApis() {
    if (this.hideApisWithoutHC) {
      this.displayedApis = this.apisWithHC;
    } else {
      this.displayedApis = this.apis;
    }
  }

  timeframeChange(timeframe: ITimeframe) {
    this.currentTimeframe = timeframe;
    this.refresh();
  }

  refresh() {
    const now = Date.now();
    this.query = {
      from: now - this.currentTimeframe.range,
      to: now,
      interval: this.currentTimeframe.interval
    };

    let refreshedUnvailableApisNumber = 0;

    const apisPromises = this.apisWithHC.map(api => {

      const logsQuery = new LogsQuery();
      logsQuery.size = 1;
      logsQuery.page = 1;
      logsQuery.to = this.query.to;

      const promises = [
        this.ApiService.apiHealthAverage(api.id, {
          ...this.query,
          type: 'AVAILABILITY'
        }),
        this.ApiService.apiHealthLogs(api.id, logsQuery)
      ];

      return this.$q.all(promises)
        .then(responses => {
          const availabilityResponse = responses[0];
          let values = availabilityResponse.data.values;
          let timestamp = availabilityResponse && availabilityResponse.data && availabilityResponse.data.timestamp;

          if (values && values.length > 0) {
            values.forEach(value => {
              value.buckets.forEach(bucket => {
                if (bucket) {
                  const availabilitySeries = this._getAvailabilitySeries(bucket);
                  const chartData = this._computeChartData(timestamp, availabilitySeries);

                  api.chartData = chartData;

                  const uptimeSeries = this._getUptimeSeries(bucket);
                  const gauge = document.getElementById('gauge_' + api.id);
                  if (gauge) {
                    gauge.setAttribute('series', JSON.stringify(uptimeSeries));
                  }
                }
              });
            });
          }

          const logsReponse = responses[1];
          api.available = logsReponse.data.logs[0].available;
          if (!api.available) {
            refreshedUnvailableApisNumber++;
          }
        });
    });

    this.$q.all(apisPromises).then( () => {
      this.unavailableApis = refreshedUnvailableApisNumber;
    });
  }

  hasHealthcheck(api) {
    return api.services && api.services.includes(HEALTHCHECK_SERVICE);
  }

  _getUptimeSeries(bucket) {
    // Average is calculated without the last element, since it is 0 most of the time
    // Todo : find and explain why.
    const averageUptime = Math.round(_.mean(bucket.data.slice(0, -1)) * 100) / 100;
    let color;
    if (averageUptime <= 80) {
      color = this.RED_COLOR;
    } else if (averageUptime <= 95) {
      color = this.ORANGE_COLOR;
    } else {
      color = this.GREEN_COLOR;
    }
    return [
      {
        'name': 'Uptime',
        'data': [
          {
            'color': color,
            'radius': '112%',
            'innerRadius': '88%',
            'y': averageUptime
          }
        ],
        'dataLabels': [
          {
            'enabled': true,
            'align': 'center',
            'verticalAlign': 'middle',
            'format': '{series.name}<br>{point.y}%',
            'borderWidth': 0,
            'style': {
              'fontSize': '12px'
            }
          }
        ]
      }
    ];
  }

  _computeChartData(timestamp, availabilitySeries) {
    return {
      plotOptions: {
        series: {
          pointStart: timestamp && timestamp.from,
          pointInterval: timestamp && timestamp.interval
        }
      },
      series: availabilitySeries,
      legend: {
        enabled: false
      },
      xAxis: {
        type: 'datetime',
        dateTimeLabelFormats: {
          month: '%e. %b',
          year: '%b'
        }
      },
      yAxis: [{
        visible: false,
        max: 100,
      }],
    };
  }

  _getAvailabilitySeries(bucket) {
    return [{
      name: 'Availability',
      data: bucket.data,
      color: '#5CB85C',
      type: 'column',
      labelSuffix: '%',
      decimalFormat: true,
      zones: [{
        value: 80,
        color: this.RED_COLOR
      }, {
        value: 95,
        color: this.ORANGE_COLOR
      }, {
        color: this.GREEN_COLOR
      }]
    }];
  }
}

export default ApiHealthCheckController;
