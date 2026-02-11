import { useUI } from '../contexts/UIContext';

/**
 * Convenience hook for accessing a specific modal's state
 * @param {string} modalName - The modal key from UIContext.modalToggles
 * @returns {Object} { isOpen, open, close, toggle }
 */
export function useUIModal(modalName) {
  const { modalToggles, toggleModal } = useUI();

  return {
    isOpen: modalToggles[modalName] || false,
    open: () => toggleModal(modalName),
    close: () => toggleModal(modalName),
    toggle: () => toggleModal(modalName),
  };
}
