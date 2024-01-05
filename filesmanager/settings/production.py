"""
For more information on this file, see
https://docs.djangoproject.com/en/2.22/topics/settings/
For the full list of settings and their values, see
https://docs.djangoproject.com/en/2.22/ref/settings/
"""


def plugin_settings(settings):
    """
    Set of plugin settings used by the Open Edx platform.
    More info: https://github.com/edx/edx-platform/blob/master/openedx/core/djangoapps/plugins/README.rst
    """
    settings.FILES_MANAGER_EVENT_ROUTING_BACKEND = getattr(
        settings, "ENV_TOKENS", {}
    ).get(
        "FILES_MANAGER_EVENT_ROUTING_BACKEND",
        settings.FILES_MANAGER_EVENT_ROUTING_BACKEND,
    )
