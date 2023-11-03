import { useEffect, useRef } from 'react';
/**
 * A custom React hook for dynamically creating action buttons within a container.
 * @param {Array} buttons - An array of button objects, each containing an 'id' and 'title'.
 * @param {boolean} loading - A boolean flag indicating if the buttons should be in a loading state.
 * @param {Function} callbackFunction - The callback function to execute when a button is clicked.
 * @returns {Object} - An object containing buttonRefs for each button element.
 */
const useXBlockActionButtons = (buttons, loading, filesMap, pathsToDelete, rootFolderId, callbackFunction) => {
  const buttonRefs = useRef({});
  const clickHandlers = {};

  useEffect(() => {
    const actionButtonsContainer = document.querySelector('.modal-actions ul');
    if (actionButtonsContainer) {
      const cancelButton = actionButtonsContainer.querySelector('.action-cancel');
      cancelButton.classList.replace('action-primary', 'remove-button');

      const cancelButtons = actionButtonsContainer.querySelectorAll('.action-cancel');

      cancelButtons.forEach((cancelButton) => {
        cancelButton.textContent = gettext('Cancel');
      });

      buttons.forEach(({ id, title, isBeforePreviousButtons = true }) => {
        if (!buttonRefs.current[id]) {
          buttonRefs.current[id] = document.createElement('button');
          buttonRefs.current[id].href = '#';
          buttonRefs.current[id].className = 'button action-primary';
          if (isBeforePreviousButtons) {
            actionButtonsContainer.insertBefore(buttonRefs.current[id], actionButtonsContainer.firstChild);
          } else {
            actionButtonsContainer.appendChild(buttonRefs.current[id]);
          }
        }

        // Always update the button's title and disable state based on the loading prop
        buttonRefs.current[id].textContent = title;

        if (!clickHandlers[id]) {
          clickHandlers[id] = (event) => {
            event.preventDefault();
            callbackFunction(id, rootFolderId, filesMap, pathsToDelete, buttonRefs.current[id]);
          };
          buttonRefs.current[id].addEventListener('click', clickHandlers[id]);
        }
      });
    }

    return () => {
      if (actionButtonsContainer) {
        buttons.forEach(({ id }) => {
          buttonRefs.current[id].removeEventListener('click', clickHandlers[id]);
        });
      }
    };
  }, [buttons, loading, filesMap, rootFolderId, pathsToDelete, callbackFunction]);

  return buttonRefs;
};

export default useXBlockActionButtons;
