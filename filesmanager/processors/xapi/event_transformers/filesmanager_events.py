"""
Transformers for filesmanager events.

Classes:
    FilesDownloadedTransformer: Transformer for the event edunext.xblock.filesmanager.files.downloaded.
"""

from tincan import Activity, ActivityDefinition, LanguageMap, Verb

from filesmanager.edxapp_wrapper.event_routing_backends import XApiTransformer, XApiTransformersRegistry
from filesmanager.processors.xapi import constants


@XApiTransformersRegistry.register("edunext.xblock.filesmanager.files.downloaded")
class FilesDownloadedTransformer(XApiTransformer):
    """
    Transformers for event generated when a student download files from xblock.
    """

    _verb = Verb(
        id=constants.XAPI_VERB_DOWNLOADED,
        display=LanguageMap({constants.EN: constants.DOWNLOADED}),
    )

    def get_object(self):
        """
        Get object for xAPI transformed event related to files download from xblock.

        Returns:
            `Activity`
        """
        return Activity(
            id=self.get_object_iri("xblock", self.get_data("data.xblock_id", True)),
            definition=ActivityDefinition(
                type=constants.XAPI_ACTIVITY_FILE,
            ),
        )
