import tempfile
import zipfile

from celery import shared_task
from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.files.storage import default_storage
from opaque_keys.edx.keys import AssetKey

try:
    from xmodule.contentstore.django import contentstore
except ImportError:
    contentstore = None

logger = get_task_logger(__name__)

DOWNLOADS_FOLDER = getattr(settings, "FILES_MANAGER_DOWNLOADS_FOLDER", "downloads")


@shared_task(bind=True)
def create_zip_file_task(self, contents):
    """
    Create temporary zip file with the contents passed as a parameter
    and uploads it to the default storage in the downloads folder.

    Returns the url of the zip file in the storage.
    """
    task_id = self.request.id
    temporary_file = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    storage_path = f"{DOWNLOADS_FOLDER}/{task_id}.zip"
    with zipfile.ZipFile(temporary_file, "w") as ziph:
        folder_structure = get_folder_structure_from_content(contents)

        for content in folder_structure:
            if asset_key:=content.get("asset_key"):
                file_content = contentstore().find(AssetKey.from_string(asset_key))
                ziph.writestr(zinfo_or_arcname=content["path"], data=file_content.data)
    default_storage.save(storage_path, temporary_file)
    return default_storage.url(storage_path)


def get_folder_structure_from_content(contents, base_path="/"):
    """
    Generate a list of dictionaries each one with their path and asset_key
    from a contents dictionary
    """
    result = []

    for content in contents:
        if content["isDir"]:
            result.extend(
                get_folder_structure_from_content(
                    content["children"], f"{base_path}{content['name']}/"
                )
            )
        else:
            result.append(
                {
                    "path": f"{base_path}{content['name']}",
                    "asset_key": content.get("metadata", {}).get("asset_key", ""),
                }
            )
    return result
