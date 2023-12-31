"""Wrapper for event-routing-backends library.

This contains all the required dependencies from event-routing-backends.

Attributes:
    XApiTransformer: Wrapper for the XApiTransformer class.
    XApiTransformersRegistry: Wrapper for the XApiTransformersRegistry class.
"""
from importlib import import_module

from django.conf import settings

backend = import_module(settings.FILES_MANAGER_EVENT_ROUTING_BACKEND)

XApiTransformer = backend.get_xapi_transformer()
XApiTransformersRegistry = backend.get_xapi_transformer_registry()
