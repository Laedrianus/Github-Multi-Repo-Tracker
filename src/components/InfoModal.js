import React from "react";

const InfoModal = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;

  const backdropStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  };

  const modalStyle = {
    backgroundColor: theme.cardBg || theme.background || "#fff",
    color: theme.text || "#000",
    padding: "20px",
    borderRadius: "10px",
    width: "90%",
    maxWidth: "600px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    position: "relative",
  };

  const closeBtnStyle = {
    position: "absolute",
    top: 10,
    right: 10,
    background: "transparent",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    color: theme.text || "#000",
  };

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeBtnStyle} onClick={onClose}>
          ✖
        </button>
        <h2>Uygulama Hakkında</h2>
        <p>
          Bu uygulama, birden fazla GitHub deposunun katkı sağlayanlarını analiz
          etmek ve farklı katkıcıların commit aktivitelerini görselleştirmek için
          tasarlanmıştır.
        </p>
        <ul>
          <li>➤ Birden fazla GitHub reposu ekleyebilirsin</li>
          <li>➤ Katkıcıları seçerek commit geçmişlerini görebilirsin</li>
          <li>➤ Commit türlerini filtreleyebilirsin: feat, fix, docs vb.</li>
          <li>➤ Zaman aralığı seçerek aktiviteleri sınırlayabilirsin</li>
          <li>➤ Temayı açık/koyu değiştirebilirsin</li>
        </ul>
        <p style={{ marginTop: "10px", fontSize: "0.9em", color: theme.textMuted || "#888" }}>
          Daha fazla özellik için uygulamayı güncel tutmayı unutma.
        </p>
      </div>
    </div>
  );
};

export default InfoModal;
