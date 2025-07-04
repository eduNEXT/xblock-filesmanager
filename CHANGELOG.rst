Change Log
##########

..
   All enhancements and patches to filesmanager will be documented
   in this file.  It adheres to the structure of https://keepachangelog.com/ ,
   but in reStructuredText instead of Markdown (for ease of incorporation into
   Sphinx documentation and the PyPI description).

   This project adheres to Semantic Versioning (https://semver.org/).

.. There should always be an "Unreleased" section for changes pending release.

Unreleased
**********

1.1.0 - 2025-06-22
**********************************************

Changed
=======

* **Teak Support**: Upgrade requirements based on edx-platform Teak release, update GitHub Actions workflows to use the `ubuntu-22.04` runner image.

1.0.0 - 2025-02-05
**********************************************

Changed
=======

* Removed support for Python 3.8 and Django 3.2.
* Replaced deprecated `pkg_resources` with `importlib.resources` for better compatibility with newer Django and Python versions.
* Starting with this version, this package is no longer compatible with releases older than Redwood.

0.10.0 - 2025-01-17
**********************************************

Added
=====

* Support for Python 3.11

0.9.1 - 2024-04-26
**********************************************

Changed
=======

* Update bundle

0.9.0 - 2024-04-25
**********************************************

Added
=====

* The tracking transformation to xAPI now contains the file path
* Support for tracking event with when multiple files are downloaded in a zip


0.8.1 - 2024-03-11
**********************************************

Changed
=======

* Update visibility dates in the menu of 'Actions'

0.8.0 - 2024-03-05
**********************************************

Added
=====

* Add support for dates visibility files

0.7.1 - 2024-03-01
**********************************************

Added
=====

* Include edx-event-routing-backends to base requirements.
* Upgraded requirements.

0.7.0 - 2023-12-01
**********************************************

Added
=====

* Add files downloaded event.

0.6.4 - 2023-12-01
**********************************************

Added
=====

* Allow to move files to unpublished folder when folders were deleted

0.6.3 - 2023-11-30
**********************************************

Added
=====

* Use fileMap as source of truth for deleting folders.
* Allow to delete multiple folders

0.6.2 - 2023-11-28
**********************************************

Added
=====

* Delete a folder moves all files to the unpublished folder.

0.6.1 - 2023-11-28
**********************************************

Added
=====

* Update description and remove features for the instructions

0.6.0 - 2023-11-28
**********************************************

Added
=====
* Add instructions for the XBlock

0.5.0 - 2023-11-24
**********************************************

Added
=====

* Allow to download multiple files and folders.

0.4.0 - 2023-11-23
**********************************************

Added
=====

* Allow to rename folders.
* Remove hiden files button.
* Show thumbnails for images.
* Open file preview in another tab.
* Allow to upload files with the same name.

0.3.0 – 2023-11-17
**********************************************

Added
=====

* Remove delete action for files, now it's only available for directories.
* Sync files data with what's inside course assets.

0.2.0 – 2023-11-13
**********************************************

Added
=====

* Webpack bundle from React app Chonky.
* Add file manager handlers for dummy lib in studio view and then for Chonky.
* Add an unpublished directory for unorganized course assets.
* Sync directory data structure to accommodate Chonky definitions.

0.1.0 – 2023-08-22
**********************************************

Added
=====

* First release on PyPI.
