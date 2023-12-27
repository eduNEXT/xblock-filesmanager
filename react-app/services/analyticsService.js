import formurlencoded from 'form-urlencoded';
import { decamelizeKeys } from 'humps';
import apiConfig from '@config/api';

/**
 * same implementation as here:
 * https://github.com/openedx/frontend-platform/blob/master/src/analytics/SegmentAnalyticsService.js#L133C3-L133C23
 * Logs events to tracking log and downstream.
 * For tracking log event documentation, see
 * https://openedx.atlassian.net/wiki/spaces/AN/pages/13205895/Event+Design+and+Review+Process
 *
 * @param {string} eventName (event_type on backend, but named to match Segment api)
 * @param {Object} properties (event on backend, but named properties to match Segment api)
 * @returns {Promise} The promise returned by Axios.post.
*/
export const sendTrackingLogEvent = (eventName, properties) => {
  const { hostname, port, protocol, href: pageHref } = window.location;
  const currentUrl = port ? `${protocol}//${hostname}:${port}` : `${protocol}//${hostname}`;
  const trackingLogApiUrl = `${currentUrl}/event`;
  const snakeEventData = decamelizeKeys(properties);
  const serverData = {
    event_type: eventName,
    event: JSON.stringify(snakeEventData),
    page: pageHref,
  };

  return apiConfig.post(
    trackingLogApiUrl,
    formurlencoded(serverData),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  ).catch((error) => {
    console.error(error.message);
  });
}
