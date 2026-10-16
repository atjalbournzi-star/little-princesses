// PiecesModal.jsx - Backward compatibility facade for PieceRateDetailsModal
function PiecesModal(props) {
  const ModalComponent = window.PieceRateDetailsModal || window.PiecesModal;
  if (!ModalComponent || ModalComponent === PiecesModal) {
    return null;
  }
  return React.createElement(ModalComponent, props);
}

if (!window.PiecesModal || window.PiecesModal === PiecesModal) {
  window.PiecesModal = window.PieceRateDetailsModal || PiecesModal;
}