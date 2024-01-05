"""Backend for event-routing-backends library.

This is required since the library has explicit dependencies from openedx platform.
https://github.com/openedx/event-routing-backends
"""
from unittest.mock import Mock


def get_xapi_transformer_registry():
    """Test backend for the XApiTransformersRegistry class.

    Returns:
        Mock class.
    """
    XApiTransformersRegistry = Mock()
    XApiTransformersRegistry.register.return_value = lambda x: x

    return XApiTransformersRegistry


def get_xapi_transformer():
    """Test backend for the XApiTransformer class.

    Returns:
        Mock class.
    """
    return Mock()
