import { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

/**
 * A custom React hook for managing the display and removal of error messages within edit container of the XBlock.
 *
 * @param {ReactNode} errorMessage - The error message to be displayed within the modal.
 *
 * @returns {Object} - An object with a function to add and remove error messages from the modal element.
 */
const useAddErrorMessageToModal = (errorMessage) => {
  useEffect(() => {
    const modalElement = document.querySelector('.edit-xblock-modal');

    if (modalElement && errorMessage) {
      const div = document.createElement('div');
      modalElement.appendChild(div);

      ReactDOM.render(errorMessage, div);

      return () => {
        ReactDOM.unmountComponentAtNode(div);
        modalElement.removeChild(div);
      };
    }
  }, [errorMessage]);

  return useMemo(
    () => ({
      removeErrorMessage: () => {
        const modalElement = document.querySelector('.edit-xblock-modal');
        const errorMessageDiv = modalElement.querySelector('.error-message');
        if (errorMessageDiv) {
          ReactDOM.unmountComponentAtNode(errorMessageDiv);
          errorMessageDiv.remove();
        }
      },
    }),
    []
  );
};

export default useAddErrorMessageToModal;
